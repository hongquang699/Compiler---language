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

if __name__ == "__main__":
    unittest.main()

