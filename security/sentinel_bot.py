"""
Sentinel Shield Autonomous Defense Bot & Security Action Skills Engine
Provides real-time threat analysis, autonomous reaction skills, honeypot traps,
sandbox pre-execution code sanitization, automated forensic logging,
Dev-Immunity protection, continuous background threat scanning, and DEV-only telemetry.
"""

import time
import re
import asyncio
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime


class SentinelDefenseBot:
    """
    Autonomous Security Agent that continuously assesses risk and performs
    automated counteractions (Skills Arsenal) to defend the web application.
    Enforces the Dev-Immunity Rule: Devs are exempt from all threat scoring and bans.
    """

    # Scoring weights for detected suspicious events
    THREAT_WEIGHTS = {
        "honeypot_probe": 60,
        "privilege_escalation_attempt": 100,
        "unauthorized_dev_probe": 85,
        "malicious_query_injection": 45,
        "sqli_attempt": 45,
        "xss_attempt": 40,
        "rce_attempt": 60,
        "dangerous_code_attempt": 55,
        "waf_blocked_path_probe": 30,
        "automated_scanner_blocked": 45,
        "rate_limit_exceeded": 20,
        "csrf_unverified": 25,
        "auth_brute_force": 35,
        "bad_user_agent": 25,
    }

    # Thresholds for automated escalation
    THRESHOLD_WARNING = 30
    THRESHOLD_TEMP_BAN = 50       # 15 minutes ban
    THRESHOLD_CRITICAL_BAN = 100  # 24 hours ban + Account Lock + Killswitch

    # Dangerous code patterns across languages that should never be executed in competitive sandbox
    DANGEROUS_CODE_PATTERNS = {
        "all": [
            r"(\b(system|popen|execve|execv|execl|fork|vfork|clone)\s*\()",
            r"(#include\s*<sys/socket\.h>)",
            r"(#include\s*<winsock2?\.h>)",
            r"(#include\s*<windows\.h>)",
            r"(#include\s*<direct\.h>)",
            r"(#include\s*<io\.h>)",
            r"(\bCreateProcess[A-W]?\s*\()",
            r"(\bWinExec\s*\()",
            r"(\bShellExecute[A-W]?\s*\()",
            r"(\bURLDownloadToFile[A-W]?\s*\()",
            r"(\b(socket|connect|bind|listen|accept)\s*\()",
            r"(\b(rmdir|unlink|remove)\s*\(\s*['\"]?[/\\])",
        ],
        "python": [
            r"(\bimport\s+(os|subprocess|socket|http|urllib|requests|pty|shutil|ctypes|winreg|multiprocessing|webbrowser)\b)",
            r"(\bfrom\s+(os|subprocess|socket|http|urllib|requests|pty|shutil|ctypes|winreg|multiprocessing|webbrowser)\b)",
            r"(__import__\s*\(\s*['\"](os|subprocess|socket|http|urllib|requests|pty|shutil|ctypes|multiprocessing)['\"]\s*\))",
            r"(\b(eval|exec|compile)\s*\()",
            r"(\bopen\s*\(\s*['\"][/\\])",
            r"(\bglobals\s*\(\s*\)|locals\s*\(\s*\))",
            r"(\b__builtins__\b)",
        ],
        "java": [
            r"(\bRuntime\.getRuntime\s*\(\s*\))",
            r"(\bProcessBuilder\b)",
            r"(\bjava\.lang\.reflect\b)",
            r"(\bjava\.net\b)",
            r"(\bjava\.io\.File\b)",
            r"(\bSystem\.exit\b)",
        ],
        "rust": [
            r"(\bstd::process::Command\b)",
            r"(\bstd::net\b)",
            r"(\bstd::fs\b)",
            r"(\bunsafe\s*\{)",
        ],
        "go": [
            r"(\bos/exec\b)",
            r"(\bnet/http\b)",
            r"(\bsyscall\b)",
        ]
    }

    def __init__(self, db_manager=None):
        self.db = db_manager
        self.mode = "autonomous"  # "autonomous", "monitoring", "strict"
        self.active = True
        self.threat_cache: Dict[str, Dict[str, Any]] = {}  # in-memory threat tracker
        self.scanner_running = False
        self.stats = {
            "threats_mitigated": 0,
            "honeypot_triggers": 0,
            "active_bans_issued": 0,
            "unsafe_codes_blocked": 0,
            "sessions_killed": 0,
            "accounts_locked": 0,
            "privilege_attacks_stopped": 0,
        }

    # ── DEV IMMUNITY RULE ──────────────────────────────────────────────────
    def is_dev_exempt(self, user: Optional[Dict[str, Any]] = None, user_id: Optional[int] = None) -> bool:
        """
        Dev Immunity Rule: Role 'dev' is strictly immune from all automated bot bans,
        threat evaluations, tarpitting, and restrictions.
        """
        if user:
            role = str(user.get("role", "")).strip().lower()
            if role in {"dev", "developer"} or user.get("is_dev") or role == "dev":
                return True

        if user_id and self.db:
            try:
                with self.db.get_connection() as conn:
                    row = conn.execute("SELECT role FROM users WHERE id = ?", (user_id,)).fetchone()
                    if row:
                        r = str(row["role"] or "").strip().lower()
                        if r in {"dev", "developer"}:
                            return True
            except Exception:
                pass

        return False

    # ── SKILL 1: Real-time Threat Evaluation & Autonomous Ban ──────────────
    def skill_evaluate_and_react(
        self,
        ip: str,
        event_type: str,
        path: str = "",
        user_agent: str = "",
        details: str = "",
        user: Optional[Dict[str, Any]] = None,
        user_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Evaluates risk score for an IP/User and automatically triggers progressive
        penalties (Rate limit -> Tarpit -> Auto-Ban -> Account Lock -> Token Revocation).
        Strictly respects Dev-Immunity: Devs are never penalized.
        """
        # DEV IMMUNITY CHECK
        if self.is_dev_exempt(user=user, user_id=user_id):
            return {"action": "DEV_EXEMPT", "threat_score": 0, "ip": ip}

        if not ip or ip in {"127.0.0.1", "::1", "localhost", "unknown"}:
            return {"action": "ALLOW", "threat_score": 0}

        points = self.THREAT_WEIGHTS.get(event_type, 20)
        now = time.time()

        # Update in-memory tracker
        current_record = self.threat_cache.get(ip, {"score": 0, "last_seen": now, "violations": 0, "user_id": user_id})
        # Score decay over time (reduce 10 pts per hour of clean behavior)
        elapsed_hours = (now - current_record["last_seen"]) / 3600.0
        decayed_score = max(0, current_record["score"] - int(elapsed_hours * 10))

        new_score = decayed_score + points
        violations = current_record["violations"] + 1
        effective_user_id = user_id or (user.get("id") if user else current_record.get("user_id"))
        self.threat_cache[ip] = {
            "score": new_score,
            "last_seen": now,
            "violations": violations,
            "user_id": effective_user_id
        }

        # Persist to database if DB is attached
        if self.db:
            try:
                with self.db.get_connection() as conn:
                    conn.execute(
                        """
                        INSERT INTO security_threat_scores (ip, score, last_violation, violation_count, status, updated_at)
                        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                        ON CONFLICT(ip) DO UPDATE SET
                            score = excluded.score,
                            last_violation = excluded.last_violation,
                            violation_count = security_threat_scores.violation_count + 1,
                            status = excluded.status,
                            updated_at = CURRENT_TIMESTAMP
                        """,
                        (ip, new_score, event_type, violations, "ACTIVE"),
                    )
                    conn.commit()
            except Exception:
                pass

        action_taken = "LOGGED"
        ban_duration = 0

        # Automated Response Logic (when in autonomous or strict mode)
        if self.mode in {"autonomous", "strict"}:
            if new_score >= self.THRESHOLD_CRITICAL_BAN:
                action_taken = "CRITICAL_BAN_24H"
                ban_duration = 1440  # 24 hours
                self.stats["active_bans_issued"] += 1
                self.stats["threats_mitigated"] += 1
                self._apply_ip_ban(ip, f"Sentinel Critical Ban: {event_type} (Score {new_score})", minutes=ban_duration)
                self.skill_session_killswitch(ip=ip, user_id=effective_user_id, reason=f"Critical threat score reached ({new_score})")
                
                # If associated with a non-dev user, lock the account
                if effective_user_id and not self.is_dev_exempt(user_id=effective_user_id):
                    self._lock_user_account(effective_user_id, reason=f"Hacker auto-lock: {event_type} (Score {new_score})")

                self._log_sentinel_action("AUTO_BAN_CRITICAL", ip, target_user_id=effective_user_id, reason=f"{event_type} - Score {new_score}", details=details)

            elif new_score >= self.THRESHOLD_TEMP_BAN:
                action_taken = "TEMP_BAN_15M"
                ban_duration = 15  # 15 minutes
                self.stats["active_bans_issued"] += 1
                self.stats["threats_mitigated"] += 1
                self._apply_ip_ban(ip, f"Sentinel Temp Ban: {event_type} (Score {new_score})", minutes=ban_duration)
                self._log_sentinel_action("AUTO_BAN_TEMP", ip, target_user_id=effective_user_id, reason=f"{event_type} - Score {new_score}", details=details)

            elif new_score >= self.THRESHOLD_WARNING:
                action_taken = "TARPIT_THROTTLE"
                self._log_sentinel_action("TARPIT_TRIGGER", ip, target_user_id=effective_user_id, reason=f"{event_type} - Score {new_score}", details=details)

        return {
            "ip": ip,
            "event": event_type,
            "threat_score": new_score,
            "action": action_taken,
            "action_taken": action_taken,
            "ban_duration_minutes": ban_duration,
        }

    # ── SKILL 2: Honeypot Decoy Trap & Rapid Countermeasure ────────────────
    def skill_honeypot_trap(
        self, ip: str, method: str, path: str, user_agent: str, payload: str = ""
    ) -> Dict[str, Any]:
        """
        Traps attackers probing non-existent admin / backdoor / config endpoints.
        Immediately captures forensics and executes rapid quarantine ban.
        """
        self.stats["honeypot_triggers"] += 1
        
        # Log to honeypot database
        if self.db:
            try:
                with self.db.get_connection() as conn:
                    conn.execute(
                        """
                        INSERT INTO honeypot_logs (ip, path, method, user_agent, payload, action_taken)
                        VALUES (?, ?, ?, ?, ?, ?)
                        """,
                        (ip, path, method, user_agent, payload[:500], "AUTO_BAN_IMMEDIATE"),
                    )
                    conn.commit()
            except Exception:
                pass

        # Trigger rapid countermeasure
        reaction = self.skill_evaluate_and_react(
            ip=ip,
            event_type="honeypot_probe",
            path=path,
            user_agent=user_agent,
            details=f"Hit honeypot trap: [{method}] {path}",
        )

        return {
            "success": True,
            "trap_activated": True,
            "ip": ip,
            "path": path,
            "reaction": reaction,
        }

    # ── SKILL 3: Session Killswitch & Token Invalidation ────────────────────
    def skill_session_killswitch(
        self, user_id: Optional[int] = None, ip: Optional[str] = None, reason: str = "security_violation"
    ) -> bool:
        """
        Revokes active authentication tokens for an IP or User ID when malicious
        activity is detected (e.g. credential stuffing or session hijacking).
        Devs are exempt.
        """
        if user_id and self.is_dev_exempt(user_id=user_id):
            return False

        if not self.db:
            return False

        revoked_count = 0
        try:
            with self.db.get_connection() as conn:
                if user_id:
                    cursor = conn.execute("DELETE FROM auth_tokens WHERE user_id = ?", (user_id,))
                    revoked_count += cursor.rowcount
                elif ip:
                    # Find user IDs associated with this IP
                    rows = conn.execute("SELECT DISTINCT user_id FROM user_ips WHERE ip = ?", (ip,)).fetchall()
                    for r in rows:
                        uid = r["user_id"]
                        if not self.is_dev_exempt(user_id=uid):
                            cursor = conn.execute("DELETE FROM auth_tokens WHERE user_id = ?", (uid,))
                            revoked_count += cursor.rowcount
                conn.commit()

            if revoked_count > 0:
                self.stats["sessions_killed"] += revoked_count
                self._log_sentinel_action("KILLSWITCH_REVOKE", target_ip=ip, target_user_id=user_id, reason=reason, details=f"Revoked {revoked_count} active sessions")
                return True
        except Exception:
            pass

        return False

    # ── SKILL 4: Pre-Execution Sandbox Code Sanitizer ───────────────────────
    def skill_code_sandbox_sanitizer(self, code: str, language: str = "cpp") -> Tuple[bool, List[str]]:
        """
        Static pre-execution inspection to catch remote shell, fork bomb, socket,
        or dangerous system-level calls before code reaches compiler/sandbox.
        Returns (is_safe: bool, violations: List[str]).
        """
        if not code or not isinstance(code, str):
            return True, []

        lang = (language or "cpp").lower()
        violations = []

        # Check global dangerous patterns
        for pattern in self.DANGEROUS_CODE_PATTERNS["all"]:
            matches = re.findall(pattern, code, flags=re.IGNORECASE)
            if matches:
                violations.append(f"Chứa lệnh gọi hệ thống nguy hiểm: {pattern}")

        # Check language-specific patterns
        lang_patterns = self.DANGEROUS_CODE_PATTERNS.get(lang, [])
        for pattern in lang_patterns:
            matches = re.findall(pattern, code, flags=re.IGNORECASE)
            if matches:
                violations.append(f"Vi phạm bảo mật ngôn ngữ ({lang.upper()}): {pattern}")

        is_safe = len(violations) == 0
        if not is_safe:
            self.stats["unsafe_codes_blocked"] += 1

        return is_safe, violations

    # ── SKILL 5: Privilege Escalation & Unauthorized Access Detector ───────
    def skill_detect_privilege_escalation(
        self,
        ip: str,
        path: str,
        method: str,
        user: Optional[Dict[str, Any]] = None,
        body_dict: Optional[Dict[str, Any]] = None,
    ) -> Tuple[bool, str]:
        """
        Intercepts unauthorized attempts to escalate privileges to 'dev' or 'superadmin',
        or attempts by non-devs to invoke system reset/model switch/github push APIs.
        Returns (is_violation: bool, reason: str).
        """
        if self.is_dev_exempt(user=user):
            return False, ""

        user_role = (user.get("role") if user else "guest").lower()
        
        # 1. Check if non-dev is trying to call dev-only endpoints
        dev_only_routes = [
            "/api/dev/",
            "/api/admin/reset-system",
            "/api/admin/switch-model",
            "/api/admin/monitoring/health-check",
            "/api/admin/security/sentinel/mode",
            "/api/admin/security/sentinel/execute-skill",
        ]
        for route in dev_only_routes:
            if path.startswith(route) and user_role != "dev":
                self.stats["privilege_attacks_stopped"] += 1
                self.skill_evaluate_and_react(
                    ip=ip,
                    event_type="unauthorized_dev_probe",
                    path=path,
                    details=f"Unauthorized access attempt to DEV-only route [{method}] {path} by user role '{user_role}'",
                    user=user,
                )
                return True, f"Nghiêm cấm truy cập API đặc quyền DEV (Phát hiện tấn công leo thang quyền hạn)"

        # 2. Check if non-dev is trying to assign 'dev' role to anyone
        if body_dict and isinstance(body_dict, dict):
            requested_role = str(body_dict.get("role", "")).lower()
            if requested_role in {"dev", "superadmin"} and user_role not in {"dev"}:
                self.stats["privilege_attacks_stopped"] += 1
                self.skill_evaluate_and_react(
                    ip=ip,
                    event_type="privilege_escalation_attempt",
                    path=path,
                    details=f"Attempted to grant '{requested_role}' role by non-dev user '{user.get('username') if user else 'anonymous'}'",
                    user=user,
                )
                return True, "Cảnh báo: Bạn không có quyền cấp quyền DEV hoặc SUPERADMIN cho tài khoản!"

        return False, ""

    # ── SKILL 6: Continuous Background Scanner Loop ─────────────────────────
    async def start_background_scanner(self, interval_seconds: int = 5):
        """
        Runs continuous background security sweep 24/7:
        - Decays idle threat scores
        - Scans security_events for anomaly spikes
        - Enforces progressive bans on detected threat actors
        """
        if self.scanner_running:
            return
        self.scanner_running = True
        
        while self.scanner_running:
            try:
                await asyncio.sleep(interval_seconds)
                if self.active:
                    self._run_threat_scan_cycle()
            except asyncio.CancelledError:
                break
            except Exception:
                pass

    def _run_threat_scan_cycle(self):
        """Executes a single cycle of continuous threat analysis & enforcement."""
        if not self.db:
            return

        now = time.time()
        # 1. Decay in-memory scores
        for ip, data in list(self.threat_cache.items()):
            elapsed_hours = (now - data["last_seen"]) / 3600.0
            if elapsed_hours >= 1.0:
                data["score"] = max(0, data["score"] - int(elapsed_hours * 10))
                if data["score"] == 0:
                    del self.threat_cache[ip]

        # 2. Query high-threat IPs from DB that need progressive enforcement
        try:
            with self.db.get_connection() as conn:
                # Find recent unbanned high threat actors (score >= 100)
                abusers = conn.execute(
                    """
                    SELECT s.ip, s.score, s.last_violation 
                    FROM security_threat_scores s
                    LEFT JOIN blocked_ips b ON s.ip = b.ip AND b.blocked_until > CURRENT_TIMESTAMP
                    WHERE s.score >= ? AND b.ip IS NULL
                    LIMIT 20
                    """,
                    (self.THRESHOLD_CRITICAL_BAN,),
                ).fetchall()

                for abuser in abusers:
                    ab_ip = abuser["ip"]
                    if ab_ip not in {"127.0.0.1", "::1", "localhost"}:
                        self._apply_ip_ban(ab_ip, f"Sentinel Continuous Scanner Auto-Ban: {abuser['last_violation']}", minutes=1440)
                        self._log_sentinel_action("SCANNER_AUTO_BAN", ab_ip, reason=f"Continuous threat sweep (Score {abuser['score']})")
        except Exception:
            pass

    # ── SKILL 7: Telemetry & Dev-Only SOC Data ──────────────────────────────
    def skill_get_security_telemetry(self) -> Dict[str, Any]:
        """Returns standard real-time defense posture & metrics."""
        blocked_count = 0
        honeypot_count = 0
        threat_records = []
        action_history = []

        if self.db:
            try:
                with self.db.get_connection() as conn:
                    row = conn.execute("SELECT COUNT(*) AS cnt FROM blocked_ips WHERE blocked_until > CURRENT_TIMESTAMP").fetchone()
                    if row:
                        blocked_count = row["cnt"]
                    row2 = conn.execute("SELECT COUNT(*) AS cnt FROM honeypot_logs").fetchone()
                    if row2:
                        honeypot_count = row2["cnt"]
                    threat_rows = conn.execute(
                        "SELECT ip, score, last_violation, violation_count, updated_at FROM security_threat_scores ORDER BY score DESC LIMIT 10"
                    ).fetchall()
                    threat_records = [dict(r) for r in threat_rows]
                    action_rows = conn.execute(
                        "SELECT id, action_type, target_ip, target_user_id, reason, details, created_at FROM sentinel_actions_log ORDER BY id DESC LIMIT 15"
                    ).fetchall()
                    action_history = [dict(r) for r in action_rows]
            except Exception:
                pass

        return {
            "status": "ARMED" if self.active else "STANDBY",
            "mode": self.mode,
            "active_bans_count": blocked_count,
            "honeypot_triggers_total": honeypot_count,
            "threats_mitigated": self.stats["threats_mitigated"],
            "unsafe_codes_blocked": self.stats["unsafe_codes_blocked"],
            "sessions_killed": self.stats["sessions_killed"],
            "accounts_locked": self.stats["accounts_locked"],
            "privilege_attacks_stopped": self.stats["privilege_attacks_stopped"],
            "top_threat_scores": threat_records,
            "recent_actions": action_history,
            "skills": [
                {"name": "skill_auto_tarpit_and_ban", "status": "ACTIVE", "desc": "Tự động tính điểm rủi ro và khóa IP lũy tiến"},
                {"name": "skill_honeypot_trap", "status": "ACTIVE", "desc": "Bẫy Decoy tóm gọn hacker & rà quét bot tức thì"},
                {"name": "skill_session_killswitch", "status": "ACTIVE", "desc": "Tự động hủy token khi phát hiện cướp phiên hoặc brute force"},
                {"name": "skill_code_sandbox_sanitizer", "status": "ACTIVE", "desc": "Kiểm tra tĩnh mã nguồn độc hại trước khi biên dịch"},
                {"name": "skill_detect_privilege_escalation", "status": "ACTIVE", "desc": "Ngăn chặn và trừng phạt ý định nâng quyền / can thiệp role"},
                {"name": "skill_anti_cheat_inspector", "status": "ACTIVE", "desc": "Thuật toán Winnowing MOSS phát hiện đạo nhái code"},
                {"name": "skill_continuous_threat_scanner", "status": "ACTIVE", "desc": "Quét ngầm liên tục 24/7 bảo vệ toàn diện hệ thống"},
            ]
        }

    def skill_get_dev_anticheat_stats(self) -> Dict[str, Any]:
        """DEV-ONLY: Comprehensive stats on plagiarism scans, flagged users, and auto-disqualifications."""
        total_reports = 0
        flagged_count = 0
        disqualified_count = 0
        recent_reports = []
        contest_breakdown = []

        if self.db:
            try:
                with self.db.get_connection() as conn:
                    row1 = conn.execute("SELECT COUNT(*) AS cnt FROM anti_cheat_reports").fetchone()
                    if row1: total_reports = row1["cnt"]

                    row2 = conn.execute("SELECT COUNT(*) AS cnt FROM anti_cheat_reports WHERE verdict IN ('PLAGIARISM_FLAGGED', 'FLAGGED')").fetchone()
                    if row2: flagged_count = row2["cnt"]

                    row3 = conn.execute("SELECT COUNT(*) AS cnt FROM anti_cheat_reports WHERE verdict = 'DISQUALIFIED'").fetchone()
                    if row3: disqualified_count = row3["cnt"]

                    reports_rows = conn.execute(
                        """
                        SELECT id, competition_id, submission_id_1, submission_id_2, 
                               username_1, username_2, similarity_score, matched_tokens, verdict, details, created_at 
                        FROM anti_cheat_reports 
                        ORDER BY id DESC LIMIT 50
                        """
                    ).fetchall()
                    recent_reports = [dict(r) for r in reports_rows]

                    comp_rows = conn.execute(
                        """
                        SELECT c.id AS competition_id, c.title, COUNT(r.id) AS report_count, 
                               AVG(r.similarity_score) AS avg_similarity,
                               SUM(CASE WHEN r.verdict = 'DISQUALIFIED' THEN 1 ELSE 0 END) AS dq_count
                        FROM competitions c
                        LEFT JOIN anti_cheat_reports r ON c.id = r.competition_id
                        GROUP BY c.id
                        ORDER BY c.id DESC LIMIT 10
                        """
                    ).fetchall()
                    contest_breakdown = [dict(r) for r in comp_rows]
            except Exception:
                pass

        return {
            "total_reports": total_reports,
            "flagged_count": flagged_count,
            "disqualified_count": disqualified_count,
            "clean_count": total_reports - flagged_count - disqualified_count,
            "recent_reports": recent_reports,
            "contest_breakdown": contest_breakdown,
        }

    def skill_get_dev_web_telemetry(self) -> Dict[str, Any]:
        """DEV-ONLY: Full Web Security SOC dashboard with live radar stream and all monitored entities."""
        monitored_entities = []
        action_stream = []
        locked_users = []

        if self.db:
            try:
                with self.db.get_connection() as conn:
                    # 1. Monitored IPs & entities with scores
                    rows = conn.execute(
                        """
                        SELECT s.ip, s.score, s.last_violation, s.violation_count, s.status, s.updated_at,
                               u.id AS user_id, u.username, u.role, u.is_locked,
                               CASE WHEN b.ip IS NOT NULL AND b.blocked_until > CURRENT_TIMESTAMP THEN 1 ELSE 0 END AS is_banned
                        FROM security_threat_scores s
                        LEFT JOIN user_ips uip ON s.ip = uip.ip
                        LEFT JOIN users u ON uip.user_id = u.id
                        LEFT JOIN blocked_ips b ON s.ip = b.ip
                        GROUP BY s.ip
                        ORDER BY s.score DESC, s.updated_at DESC LIMIT 100
                        """
                    ).fetchall()
                    monitored_entities = [dict(r) for r in rows]

                    # 2. Action Stream
                    act_rows = conn.execute(
                        """
                        SELECT id, action_type, target_ip, target_user_id, reason, details, created_at
                        FROM sentinel_actions_log
                        ORDER BY id DESC LIMIT 60
                        """
                    ).fetchall()
                    action_stream = [dict(r) for r in act_rows]

                    # 3. Locked Accounts
                    locked_rows = conn.execute(
                        """
                        SELECT id, username, email, role, is_locked, created_at
                        FROM users
                        WHERE is_locked = 1
                        ORDER BY id DESC
                        """
                    ).fetchall()
                    locked_users = [dict(r) for r in locked_rows]
            except Exception:
                pass

        return {
            "bot_active": self.active,
            "sentinel_status": self.skill_get_security_telemetry(),
            "monitored_entities": monitored_entities,
            "action_stream": action_stream,
            "locked_users": locked_users,
        }

    # ── Helpers ────────────────────────────────────────────────────────────
    def _apply_ip_ban(self, ip: str, reason: str, minutes: int = 15):
        if self.db:
            try:
                from backend.database.db import MemoryStore
                MemoryStore(self.db).block_ip(ip, reason, minutes=minutes)
            except Exception:
                pass

    def _lock_user_account(self, user_id: int, reason: str = "Automated Security Lock"):
        if self.db and not self.is_dev_exempt(user_id=user_id):
            try:
                from backend.database.db import MemoryStore
                ms = MemoryStore(self.db)
                ms.lock_user(user_id, locked=True)
                self.stats["accounts_locked"] += 1
                self._log_sentinel_action("ACCOUNT_LOCKED_AUTO", target_user_id=user_id, reason=reason)
            except Exception:
                pass

    def _log_sentinel_action(
        self,
        action_type: str,
        target_ip: Optional[str] = None,
        target_user_id: Optional[int] = None,
        reason: str = "",
        details: str = "",
    ):
        if self.db:
            try:
                with self.db.get_connection() as conn:
                    conn.execute(
                        """
                        INSERT INTO sentinel_actions_log (action_type, target_ip, target_user_id, reason, details)
                        VALUES (?, ?, ?, ?, ?)
                        """,
                        (action_type, target_ip or "N/A", target_user_id, reason, details),
                    )
                    conn.commit()
            except Exception:
                pass


# Global singleton Sentinel Bot
sentinel_bot = SentinelDefenseBot()
