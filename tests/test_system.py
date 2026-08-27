import os
import sys
import unittest
import asyncio
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.tools.compiler import CppCompiler
from backend.tools.sandbox import ProcessSandbox
from backend.tools.tester import TestRunner
from backend.rag.store import KnowledgeStore
from backend.database.db import DatabaseManager, MemoryStore

class TestLocalAiSystem(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.compiler = CppCompiler(temp_dir="data/test_sandbox")
        cls.sandbox = ProcessSandbox(timeout_seconds=1.5, memory_limit_mb=128)
        cls.runner = TestRunner(compiler=cls.compiler, sandbox=cls.sandbox)
        cls.rag = KnowledgeStore(knowledge_dir="data/knowledge_base")
        cls.db = DatabaseManager(db_path="data/test_memory.db")
        cls.memory = MemoryStore(cls.db)

    def test_01_compiler_and_sandbox_ac(self):
        code = """#include <iostream>
int main() {
    int a, b;
    if (std::cin >> a >> b) {
        std::cout << (a + b) << "\\n";
    }
    return 0;
}"""
        testcases = [
            {"input": "2 3", "expected": "5"},
            {"input": "100 200", "expected": "300"}
        ]
        res = self.runner.run_tests(code, testcases, language="cpp")
        self.assertTrue(res["success"])
        self.assertEqual(res["overall_verdict"], "AC")
        self.assertEqual(res["passed_tests"], 2)

    def test_02_python_sandbox_ac(self):
        py_code = """import sys
data = sys.stdin.read().split()
if data:
    a, b = map(int, data)
    print(a + b)
"""
        testcases = [
            {"input": "7 14", "expected": "21"},
            {"input": "99 1", "expected": "100"}
        ]
        res = self.runner.run_tests(py_code, testcases, language="python")
        self.assertTrue(res["success"])
        self.assertEqual(res["overall_verdict"], "AC")
        self.assertEqual(res["passed_tests"], 2)


    def test_02_wa_detection(self):
        code = """#include <iostream>
int main() {
    int a, b;
    std::cin >> a >> b;
    std::cout << (a - b) << "\\n"; // BUG: minus instead of plus
    return 0;
}"""
        testcases = [
            {"input": "5 3", "expected": "8"}
        ]
        res = self.runner.run_tests(code, testcases)
        self.assertFalse(res["success"])
        self.assertEqual(res["overall_verdict"], "WA")

    def test_03_tle_detection(self):
        code = """#include <iostream>
int main() {
    while (true) {} // Infinite loop
    return 0;
}"""
        testcases = [{"input": "", "expected": "anything"}]
        res = self.runner.run_tests(code, testcases, timeout=0.5)
        self.assertFalse(res["success"])
        self.assertEqual(res["overall_verdict"], "TLE")

    def test_04_compilation_error_detection(self):
        code = """int main() { invalid_syntax; }"""
        res = self.runner.run_tests(code, [{"input": "", "expected": ""}])
        self.assertFalse(res["success"])
        self.assertEqual(res["overall_verdict"], "CE")

    def test_05_rag_retrieval(self):
        results = self.rag.search("Dijkstra shortest path", top_k=1)
        self.assertTrue(len(results) > 0)
        self.assertIn("dijkstra", results[0]["source"].lower())

    def test_06_memory_persistence(self):
        import time
        sid = f"unit_test_session_{int(time.time() * 1000)}"
        self.memory.add_message(sid, "user", "Hello World")
        self.memory.add_message(sid, "assistant", "Answer")
        msgs = self.memory.get_messages(sid)
        self.assertEqual(len(msgs), 2)
        self.assertEqual(msgs[0]["content"], "Hello World")

    def test_07_auth_hashes(self):
        import hashlib
        import time
        username = f"hash_test_{int(time.time() * 1000)}"
        user = self.memory.create_user(username, f"{username}@local.test", "correct-password")
        with self.db.get_connection() as conn:
            password_hash = conn.execute(
                "SELECT password_hash FROM users WHERE id = ?", (user["id"],)
            ).fetchone()["password_hash"]
        self.assertTrue(password_hash.startswith("sha512$"))
        self.assertIsNotNone(self.memory.authenticate_user(username, "correct-password"))
        self.assertIsNone(self.memory.authenticate_user(username, "wrong-password"))

        token = self.memory.create_auth_token(user["id"])
        with self.db.get_connection() as conn:
            stored_token = conn.execute(
                "SELECT token FROM auth_tokens WHERE user_id = ?", (user["id"],)
            ).fetchone()["token"]
        self.assertEqual(stored_token, hashlib.sha256(token.encode()).hexdigest())
        self.assertIsNotNone(self.memory.get_user_by_token(token))


    def test_08_code_encryption_decryption(self):
        import base64
        from backend.main import decrypt_code_payload, SECRET_PAYLOAD_KEY

        raw_code = "#include <iostream>\nint main() { std::cout << 42; }"
        encoder_key = SECRET_PAYLOAD_KEY
        code_bytes = raw_code.encode('utf-8')
        enc_bytes = bytes([b ^ encoder_key[i % len(encoder_key)] for i, b in enumerate(code_bytes)])
        encrypted_payload = "ENC::" + base64.b64encode(enc_bytes).decode('utf-8')

        decrypted = decrypt_code_payload(encrypted_payload)
        self.assertEqual(decrypted, raw_code)

    def test_09_admin_role_management(self):
        import time
        username = f"role_user_{int(time.time() * 1000)}"
        user = self.memory.create_user(username, f"{username}@test.local", "user-pass")
        self.assertFalse(user["is_admin"])

        success = self.memory.update_user_role(user["id"], "admin")
        self.assertTrue(success)

        detail = self.memory.get_member_detail(user["id"])
        self.assertTrue(detail["user"]["is_admin"])
        self.assertEqual(detail["user"]["role"], "admin")

        self.memory.update_user_role(user["id"], "user")
        detail2 = self.memory.get_member_detail(user["id"])
        self.assertFalse(detail2["user"]["is_admin"])
        self.assertEqual(detail2["user"]["role"], "user")

    def test_10_email_verification_otp(self):
        from backend.main import verification_codes
        import time
        email = f"otp_test_{int(time.time() * 1000)}@test.com"
        verification_codes[email] = {
            "code": "654321",
            "expires_at": time.time() + 600
        }
        self.assertIn(email, verification_codes)
        self.assertEqual(verification_codes[email]["code"], "654321")

    def test_11_storage_service(self):
        import base64
        from backend.core.storage import StorageService, slugify, is_valid_image
        self.assertEqual(slugify("Sinh Tồn Tận Thế"), "sinhtontanthe")
        self.assertEqual(slugify("Thuật Toán Dijkstra"), "thuattoandijkstra")
        
        # Valid 1x1 PNG bytes
        png_bytes = base64.b64decode('iVBORw0KGgoAAAANSU5EUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==')
        self.assertTrue(is_valid_image(png_bytes, "test.png"))
        self.assertFalse(is_valid_image(b'invaliddata', "test.png"))

        url = StorageService.upload_avatar(png_bytes, "avatar.png", "unit_test_user")
        self.assertIsNotNone(url)
        self.assertTrue(url.startswith("/static/uploads/avatars/unittestuser/"))
        
        deleted = StorageService.delete_by_url(url)
        self.assertTrue(deleted)

    def test_12_auth_helper(self):
        from backend.core.auth_helper import api_response, get_current_user_profile, role_required
        from fastapi import HTTPException
        
        # 1. Test api_response
        res = api_response(True, data={"key": "value"}, message="Success")
        self.assertEqual(res.status_code, 200)

        # 2. Test avatar timestamp cache buster & is_locked
        normal_user = {"id": 1, "username": "test", "is_locked": False, "avatar_path": "/static/uploads/avatars/test/avatar.webp"}
        profile = get_current_user_profile(normal_user)
        self.assertIn("?t=", profile["avatar_path"])

        locked_user = {"id": 2, "username": "locked", "is_locked": True}
        with self.assertRaises(HTTPException) as ctx:
            get_current_user_profile(locked_user)
        self.assertEqual(ctx.exception.status_code, 403)

        # 3. Test RBAC role_required
        admin_check = role_required("admin")
        self.assertIsNotNone(admin_check({"id": 1, "role": "admin", "is_admin": True}))
        
        user_user = {"id": 2, "role": "user", "is_admin": False}
        with self.assertRaises(HTTPException) as ctx2:
            admin_check(user_user)
        self.assertEqual(ctx2.exception.status_code, 403)

    def test_14_security_7_layers(self):
        from security.rate_limiter import RateLimiter
        from security.validator import (
            detect_sqli,
            detect_xss,
            detect_nosqli,
            detect_command_injection,
            sanitize_html,
            sanitize_path
        )
        from fastapi.testclient import TestClient
        from backend.main import app

        # 1. Test RateLimiter & Headers Metrics
        rl = RateLimiter(requests_per_minute=5, burst_limit=2)
        res1 = rl.check("203.0.113.1", "/api/auth/login")
        self.assertTrue(res1.allowed)
        self.assertEqual(res1.limit, 15)  # Auth tier
        self.assertGreaterEqual(res1.remaining, 14)

        res_global = rl.check("203.0.113.2", "/api/problems")
        self.assertTrue(res_global.allowed)
        self.assertEqual(res_global.limit, 120)  # Global tier

        # 2. Test SQL Injection Detection
        self.assertTrue(detect_sqli("1' OR '1'='1"))
        self.assertTrue(detect_sqli("1; DROP TABLE users; --"))
        self.assertTrue(detect_sqli("admin' UNION SELECT null, username, password FROM users --"))
        self.assertFalse(detect_sqli("Hello world 123"))

        # 3. Test XSS Detection
        self.assertTrue(detect_xss("<script>alert('xss')</script>"))
        self.assertTrue(detect_xss("<img src=x onerror=alert(1)>"))
        self.assertTrue(detect_xss("javascript:alert(document.cookie)"))
        self.assertFalse(detect_xss("Normal text with <b>bold</b> tag"))

        # 4. Test NoSQL Injection & Command Injection
        self.assertTrue(detect_nosqli('{"username": {"$gt": ""}}'))
        self.assertTrue(detect_command_injection("cat /etc/passwd | sh"))
        self.assertTrue(detect_command_injection("test; rm -rf /"))

        # 5. Test HTML Sanitization & Path Traversal
        self.assertEqual(sanitize_html("<script>alert(1)</script>"), "&lt;script&gt;alert(1)&lt;/script&gt;")
        with self.assertRaises(ValueError):
            sanitize_path("../../etc/passwd", "data")

        # 6. Test HTTP Security Headers via TestClient
        client = TestClient(app)
        response = client.get("/api/health")
        self.assertIn(response.status_code, [200, 503])
        self.assertEqual(response.headers.get("X-Content-Type-Options"), "nosniff")
        self.assertEqual(response.headers.get("X-Frame-Options"), "DENY")
        self.assertEqual(response.headers.get("X-XSS-Protection"), "1; mode=block")
        self.assertIn("default-src 'self'", response.headers.get("Content-Security-Policy", ""))
        self.assertIn("X-RateLimit-Limit", response.headers)

    def test_15_anti_cheat_engine(self):
        from security.anti_cheat import anti_cheat_engine, CodeTokenizer

        # 1. Original code
        code_orig = """#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    int n;
    if (!(cin >> n)) return 0;
    vector<int> a(n);
    for (int i = 0; i < n; i++) {
        cin >> a[i];
    }
    sort(a.begin(), a.end());
    for (int x : a) cout << x << " ";
    cout << "\\n";
    return 0;
}"""

        # 2. Plagiarized code (renamed variables, added comments, changed loop style)
        code_plagiarized = """// Solution by contestant B
#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    /* Read array size */
    int array_length;
    if (!(cin >> array_length)) return 0;
    vector<int> numbers_list(array_length);
    for (int idx = 0; idx < array_length; ++idx) {
        cin >> numbers_list[idx];
    }
    // Sort array
    sort(numbers_list.begin(), numbers_list.end());
    for (int val : numbers_list) cout << val << " ";
    cout << "\\n";
    return 0;
}"""

        # 3. Completely different algorithm (Dijkstra)
        code_different = """#include <iostream>
#include <queue>
#include <vector>
using namespace std;
const int INF = 1e9;
int main() {
    int V, E;
    cin >> V >> E;
    vector<vector<pair<int,int>>> adj(V);
    for(int i=0; i<E; ++i){
        int u, v, w; cin >> u >> v >> w;
        adj[u].push_back({v, w});
    }
    priority_queue<pair<int,int>, vector<pair<int,int>>, greater<pair<int,int>>> pq;
    vector<int> dist(V, INF);
    dist[0] = 0;
    pq.push({0, 0});
    return 0;
}"""

        # Test Plagiarism detection on modified code
        res_plag = anti_cheat_engine.compute_similarity(code_orig, code_plagiarized, "cpp")
        self.assertGreaterEqual(res_plag["similarity_score"], 80.0)
        self.assertEqual(res_plag["verdict"], "PLAGIARISM_FLAGGED")

        # Test on different code
        res_diff = anti_cheat_engine.compute_similarity(code_orig, code_different, "cpp")
        self.assertLess(res_diff["similarity_score"], 45.0)
        self.assertEqual(res_diff["verdict"], "CLEAN")

    def test_16_sentinel_defense_bot(self):
        from security.sentinel_bot import SentinelDefenseBot

        bot = SentinelDefenseBot(db_manager=self.db)
        bot.mode = "autonomous"

        # 1. Test threat score accumulation and auto-ban
        test_ip = "198.51.100.42"
        # First infraction
        r1 = bot.skill_evaluate_and_react(test_ip, "rate_limit_exceeded")
        self.assertEqual(r1["threat_score"], 20)

        # Second critical infraction
        r2 = bot.skill_evaluate_and_react(test_ip, "sqli_attempt")
        self.assertEqual(r2["threat_score"], 65)
        self.assertEqual(r2["action_taken"], "TEMP_BAN_15M")
        self.assertTrue(self.memory.is_ip_blocked(test_ip))

        # 2. Test Honeypot Trap
        hp_ip = "198.51.100.99"
        hp_res = bot.skill_honeypot_trap(hp_ip, "GET", "/wp-login.php", "sqlmap/1.5")
        self.assertTrue(hp_res["trap_activated"])
        self.assertTrue(self.memory.is_ip_blocked(hp_ip))

        # 3. Test Telemetry
        telemetry = bot.skill_get_security_telemetry()
        self.assertEqual(telemetry["status"], "ARMED")
        self.assertEqual(telemetry["mode"], "autonomous")
        self.assertGreaterEqual(telemetry["active_bans_count"], 2)

    def test_17_code_sandbox_sanitizer(self):
        from security.sentinel_bot import sentinel_bot

        # Dangerous C++ calls
        bad_cpp = '#include <iostream>\n#include <windows.h>\nint main(){ system("rm -rf /"); return 0; }'
        is_safe, violations = sentinel_bot.skill_code_sandbox_sanitizer(bad_cpp, "cpp")
        self.assertFalse(is_safe)
        self.assertGreaterEqual(len(violations), 1)

        # Dangerous Python calls
        bad_py = 'import os\nimport subprocess\nsubprocess.Popen(["cmd.exe"])'
        is_safe_py, violations_py = sentinel_bot.skill_code_sandbox_sanitizer(bad_py, "python")
        self.assertFalse(is_safe_py)
        self.assertGreaterEqual(len(violations_py), 1)

        # Clean C++ code
        clean_cpp = '#include <iostream>\nusing namespace std;\nint main(){ int a, b; cin >> a >> b; cout << a+b; return 0; }'
        is_safe_clean, violations_clean = sentinel_bot.skill_code_sandbox_sanitizer(clean_cpp, "cpp")
        self.assertTrue(is_safe_clean)
        self.assertEqual(len(violations_clean), 0)

    def test_18_security_api_endpoints(self):
        from fastapi.testclient import TestClient
        from backend.main import app, memory_store

        client = TestClient(app)

        # Create an admin user with dev role to get bearer token
        import time
        admin_uname = f"sec_admin_{int(time.time() * 1000)}"
        admin_user = memory_store.create_user(admin_uname, f"{admin_uname}@sec.test", "admin-pass-123")
        memory_store.update_user_role(admin_user["id"], "dev")
        token = memory_store.create_auth_token(admin_user["id"])
        auth_headers = {"Authorization": f"Bearer {token}"}

        # 1. Test Sentinel Status API
        res_status = client.get("/api/admin/security/sentinel/status", headers=auth_headers)
        self.assertEqual(res_status.status_code, 200)
        status_data = res_status.json()
        self.assertEqual(status_data["status"], "ARMED")

        # 2. Test Sentinel Mode Switch API
        res_mode = client.post("/api/admin/security/sentinel/mode", json={"mode": "strict"}, headers=auth_headers)
        self.assertEqual(res_mode.status_code, 200)
        self.assertEqual(res_mode.json()["mode"], "strict")

        # 3. Test Anti-Cheat Reports API
        res_reports = client.get("/api/admin/security/anti-cheat/reports", headers=auth_headers)
        self.assertEqual(res_reports.status_code, 200)
        self.assertIn("reports", res_reports.json())

    def test_19_dev_immunity_rule(self):
        from security.sentinel_bot import SentinelDefenseBot
        from backend.main import memory_store, db_manager

        bot = SentinelDefenseBot(db_manager=db_manager)
        
        # 1. Dev user setup
        import time
        ts = int(time.time() * 1000)
        dev_u = memory_store.create_user(f"dev_imm_{ts}", f"dev_imm_{ts}@test.com", "pass123")
        memory_store.update_user_role(dev_u["id"], "dev")
        dev_dict = {"id": dev_u["id"], "username": dev_u["username"], "role": "dev"}

        # 2. Regular user setup
        reg_u = memory_store.create_user(f"reg_usr_{ts}", f"reg_usr_{ts}@test.com", "pass123")
        reg_dict = {"id": reg_u["id"], "username": reg_u["username"], "role": "user"}

        # Check Dev Immunity
        self.assertTrue(bot.is_dev_exempt(user=dev_dict))
        self.assertTrue(bot.is_dev_exempt(user_id=dev_u["id"]))
        self.assertFalse(bot.is_dev_exempt(user=reg_dict))
        self.assertFalse(bot.is_dev_exempt(user_id=reg_u["id"]))

        # Reaction test: Dev is never penalized
        dev_react = bot.skill_evaluate_and_react(
            ip="203.0.113.88",
            event_type="sqli_attempt",
            user=dev_dict
        )
        self.assertEqual(dev_react["action"], "DEV_EXEMPT")
        self.assertEqual(dev_react["threat_score"], 0)

        # Reaction test: Regular user is penalized
        reg_react = bot.skill_evaluate_and_react(
            ip="203.0.113.99",
            event_type="sqli_attempt",
            user=reg_dict
        )
        self.assertNotEqual(reg_react["action"], "DEV_EXEMPT")
        self.assertGreater(reg_react["threat_score"], 0)

    def test_20_privilege_escalation_detection(self):
        from fastapi.testclient import TestClient
        from backend.main import app, memory_store
        import time

        client = TestClient(app)
        ts = int(time.time() * 1000)

        # 1. Member user
        mem_u = memory_store.create_user(f"mem_priv_{ts}", f"mem_priv_{ts}@test.com", "pass123")
        mem_token = memory_store.create_auth_token(mem_u["id"])
        mem_headers = {"Authorization": f"Bearer {mem_token}"}

        # 2. Dev user
        dev_u = memory_store.create_user(f"dev_priv_{ts}", f"dev_priv_{ts}@test.com", "pass123")
        memory_store.update_user_role(dev_u["id"], "dev")
        dev_token = memory_store.create_auth_token(dev_u["id"])
        dev_headers = {"Authorization": f"Bearer {dev_token}"}

        # Member trying to access DEV-only monitoring route -> 403 Forbidden
        res_mem_probe = client.get("/api/dev/web-monitor/telemetry", headers=mem_headers)
        self.assertEqual(res_mem_probe.status_code, 403)

        # Dev accessing DEV-only monitoring route -> 200 OK
        res_dev_probe = client.get("/api/dev/web-monitor/telemetry", headers=dev_headers)
        self.assertEqual(res_dev_probe.status_code, 200)
        self.assertIn("monitored_entities", res_dev_probe.json())

        # Dev accessing DEV-only Anti-Cheat stats -> 200 OK
        res_ac_stats = client.get("/api/dev/anticheat-monitor/stats", headers=dev_headers)
        self.assertEqual(res_ac_stats.status_code, 200)
        self.assertIn("total_reports", res_ac_stats.json())

    def test_21_dev_direct_intervention_and_actions(self):
        from fastapi.testclient import TestClient
        from backend.main import app, memory_store
        import time

        client = TestClient(app)
        ts = int(time.time() * 1000)

        # Dev user
        dev_u = memory_store.create_user(f"dev_cmd_{ts}", f"dev_cmd_{ts}@test.com", "pass123")
        memory_store.update_user_role(dev_u["id"], "dev")
        dev_token = memory_store.create_auth_token(dev_u["id"])
        dev_headers = {"Authorization": f"Bearer {dev_token}"}

        # Target attacker user
        target_u = memory_store.create_user(f"target_hacker_{ts}", f"target_{ts}@test.com", "pass123")
        target_ip = f"198.51.100.{ts % 200 + 10}"

        # 1. Dev triggers full system security scan
        res_scan = client.post("/api/dev/web-monitor/trigger-scan", headers=dev_headers)
        self.assertEqual(res_scan.status_code, 200)

        # 2. Dev directly bans attacker IP and locks account
        res_ban = client.post(
            "/api/dev/web-monitor/ban-user",
            json={"user_id": target_u["id"], "ip": target_ip, "reason": "Direct Hacker Ban"},
            headers=dev_headers
        )
        self.assertEqual(res_ban.status_code, 200)
        self.assertTrue(memory_store.is_ip_blocked(target_ip))
        self.assertTrue(memory_store.get_user_by_id(target_u["id"])["is_locked"])

        # 3. Dev cannot ban another DEV (Dev Immunity Protection)
        res_ban_dev = client.post(
            "/api/dev/web-monitor/ban-user",
            json={"user_id": dev_u["id"], "reason": "Accidental Dev Ban"},
            headers=dev_headers
        )
        self.assertEqual(res_ban_dev.status_code, 400)

        # 4. Dev directly unbans attacker IP and unlocks account
        res_unban = client.post(
            "/api/dev/web-monitor/unban",
            json={"user_id": target_u["id"], "ip": target_ip},
            headers=dev_headers
        )
        self.assertEqual(res_unban.status_code, 200)
        self.assertFalse(memory_store.is_ip_blocked(target_ip))
        self.assertFalse(memory_store.get_user_by_id(target_u["id"])["is_locked"])

    def test_22_vietqr_payment_and_community_system(self):
        import time
        from fastapi.testclient import TestClient
        from backend.main import app, memory_store

        client = TestClient(app)
        ts = int(time.time() * 1000)

        # 1. Create a regular user
        u1_name = f"buyer_{ts}"
        user_data = memory_store.create_user(u1_name, f"{u1_name}@test.cp", "Password123!")
        token = memory_store.create_auth_token(user_data["id"])
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Check initial community creation permission (standard user should be denied)
        res_check = client.get("/api/payment/can-create-community", headers=headers)
        self.assertEqual(res_check.status_code, 200)
        self.assertFalse(res_check.json()["allowed"])

        # Attempt to create community before upgrade -> 403
        res_create_fail = client.post(
            "/api/communities",
            json={"name": f"Illegal Comm {ts}", "description": "Should fail", "privacy_mode": "public"},
            headers=headers
        )
        self.assertEqual(res_create_fail.status_code, 403)

        # 3. Simulate VietQR Payment confirmation for 'pro' plan
        res_pay = client.post(
            "/api/payment/confirm",
            json={"plan": "pro", "ref_code": f"LOCALCP {u1_name.upper()} PRO"},
            headers=headers
        )
        self.assertEqual(res_pay.status_code, 200)
        self.assertEqual(res_pay.json()["plan"], "pro")
        pay_id = res_pay.json().get("payment_id")
        if pay_id:
            from backend.main import memory_store as app_memory_store
            app_memory_store.approve_payment_request(pay_id, approved_by_user_id=1)

        # 4. After Pro upgrade -> can create community is True
        res_check_after = client.get("/api/payment/can-create-community", headers=headers)
        self.assertTrue(res_check_after.json()["allowed"])

        # 5. Create a Private Community
        res_comm = client.post(
            "/api/communities",
            json={"name": f"USACO Elite Club {ts}", "description": "Private elite club", "privacy_mode": "private"},
            headers=headers
        )
        self.assertEqual(res_comm.status_code, 200)
        comm_id = res_comm.json()["community"]["id"]

        # 6. Another user requests to join private community
        u2_name = f"applicant_{ts}"
        user2_data = memory_store.create_user(u2_name, f"{u2_name}@test.cp", "Password123!")
        token2 = memory_store.create_auth_token(user2_data["id"])
        headers2 = {"Authorization": f"Bearer {token2}"}

        res_join = client.post(f"/api/communities/{comm_id}/join", headers=headers2)
        self.assertEqual(res_join.status_code, 200)
        self.assertEqual(res_join.json()["status"], "pending_request")

        # 7. Owner lists join requests & approves
        res_reqs = client.get(f"/api/communities/{comm_id}/requests", headers=headers)
        self.assertEqual(res_reqs.status_code, 200)
        requests = res_reqs.json()["requests"]
        self.assertEqual(len(requests), 1)
        req_id = requests[0]["id"]

        res_process = client.post(
            f"/api/communities/requests/{req_id}/process",
            json={"status": "approved"},
            headers=headers
        )
        self.assertEqual(res_process.status_code, 200)

        # 8. Verify applicant is now in member list
        res_members = client.get(f"/api/communities/{comm_id}/members", headers=headers)
        self.assertEqual(res_members.status_code, 200)
        member_usernames = [m["username"] for m in res_members.json()["members"]]
        self.assertIn(u2_name, member_usernames)

        # 9. Dev role can view all communities including private
        dev_name = f"dev_{ts}"
        dev_u = memory_store.create_user(dev_name, f"{dev_name}@local.cp", "DevPass123!")
        with memory_store.db.get_connection() as conn:
            conn.execute("UPDATE users SET role = 'dev' WHERE id = ?", (dev_u["id"],))
            conn.commit()
        token_dev = memory_store.create_auth_token(dev_u["id"])
        headers_dev = {"Authorization": f"Bearer {token_dev}"}

        res_dev_list = client.get("/api/communities", headers=headers_dev)
        self.assertEqual(res_dev_list.status_code, 200)
        comm_ids = [c["id"] for c in res_dev_list.json()["communities"]]
        self.assertIn(comm_id, comm_ids)

if __name__ == "__main__":
    unittest.main()



