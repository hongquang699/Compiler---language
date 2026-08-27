import sqlite3
import json
import os
import hashlib
import secrets
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime

class TrackedConnection(sqlite3.Connection):
    """SQLite connection that can report completed commits to its owner."""
    change_callback = None

    def commit(self):
        super().commit()
        if self.change_callback:
            self.change_callback()

class DatabaseManager:
    PASSWORD_HASH_ALGORITHM = "sha512"
    PASSWORD_HASH_ITERATIONS = 120000

    def __init__(self, db_path: str = "data/memory.db"):
        self.db_path = db_path
        self._track_changes = False
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
        self._init_db()
        self._track_changes = True

    def get_connection(self):
        conn = sqlite3.connect(self.db_path, check_same_thread=False, factory=TrackedConnection)
        conn.row_factory = sqlite3.Row
        if self._track_changes:
            conn.change_callback = self._notify_change
        return conn

    @staticmethod
    def _notify_change():
        # Import lazily to keep database initialization independent from the
        # optional backup service and avoid a module import cycle.
        from backend.services.github_service import increment_change_counter
        increment_change_counter()

    def _init_db(self):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            # Sessions table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS sessions (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            # Messages table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT NOT NULL,
                    role TEXT NOT NULL,
                    content TEXT NOT NULL,
                    metadata TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
                )
            """)
            # Solved problems table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS solved_problems (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    category TEXT,
                    complexity_time TEXT,
                    complexity_space TEXT,
                    solution_code TEXT NOT NULL,
                    notes TEXT,
                    verdict TEXT DEFAULT 'AC',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            # Code submissions / test runs history
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS submissions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT,
                    code TEXT NOT NULL,
                    verdict TEXT NOT NULL,
                    execution_time_ms REAL,
                    memory_used_kb REAL,
                    compiler_output TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            # User preferences (Coding style, 1-based vs 0-based, FastIO preference)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS user_preferences (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT NOT NULL UNIQUE,
                    email TEXT,
                    password_hash TEXT NOT NULL,
                    role TEXT NOT NULL DEFAULT 'user',
                    is_admin INTEGER NOT NULL DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS auth_tokens (
                    token TEXT PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS security_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    ip TEXT NOT NULL,
                    method TEXT NOT NULL,
                    path TEXT NOT NULL,
                    user_agent TEXT,
                    status_code INTEGER,
                    reason TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS blocked_ips (
                    ip TEXT PRIMARY KEY,
                    reason TEXT NOT NULL,
                    blocked_until TIMESTAMP NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS user_ips (
                    user_id INTEGER NOT NULL,
                    ip TEXT NOT NULL,
                    first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (user_id, ip),
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS competitions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    statement TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'draft',
                    starts_at TIMESTAMP,
                    ends_at TIMESTAMP,
                    created_by INTEGER NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (created_by) REFERENCES users(id)
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS competition_tests (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    competition_id INTEGER NOT NULL,
                    input TEXT NOT NULL,
                    expected TEXT NOT NULL DEFAULT '',
                    FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE CASCADE
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS competition_problems (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    competition_id INTEGER NOT NULL,
                    code TEXT NOT NULL,
                    title TEXT NOT NULL,
                    statement TEXT NOT NULL,
                    points REAL NOT NULL DEFAULT 100,
                    time_limit REAL NOT NULL DEFAULT 2,
                    memory_limit INTEGER NOT NULL DEFAULT 256,
                    sort_order INTEGER NOT NULL DEFAULT 0,
                    is_hidden INTEGER NOT NULL DEFAULT 0,
                    FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE CASCADE
                )
            """)
            try:
                cursor.execute("ALTER TABLE competition_problems ADD COLUMN is_hidden INTEGER NOT NULL DEFAULT 0")
            except Exception:
                pass
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS problem_tests (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    problem_id INTEGER NOT NULL,
                    input TEXT NOT NULL,
                    expected TEXT NOT NULL DEFAULT '',
                    points REAL NOT NULL DEFAULT 0,
                    FOREIGN KEY (problem_id) REFERENCES competition_problems(id) ON DELETE CASCADE
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS competition_participants (
                    competition_id INTEGER NOT NULL,
                    user_id INTEGER NOT NULL,
                    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (competition_id, user_id),
                    FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE CASCADE,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS security_threat_scores (
                    ip TEXT PRIMARY KEY,
                    score INTEGER NOT NULL DEFAULT 0,
                    last_violation TEXT,
                    violation_count INTEGER NOT NULL DEFAULT 0,
                    status TEXT NOT NULL DEFAULT 'ACTIVE',
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            # Payments table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS payments (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    plan TEXT NOT NULL,
                    amount_vnd INTEGER NOT NULL,
                    ref_code TEXT NOT NULL,
                    sender_name TEXT DEFAULT '',
                    status TEXT NOT NULL DEFAULT 'COMPLETED',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            """)
            # Admin & Dev Notifications table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS admin_notifications (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    type TEXT NOT NULL DEFAULT 'GENERAL',
                    title TEXT NOT NULL,
                    message TEXT NOT NULL,
                    data_json TEXT,
                    is_read INTEGER NOT NULL DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            # Communities table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS communities (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL UNIQUE,
                    description TEXT NOT NULL,
                    privacy_mode TEXT NOT NULL DEFAULT 'public',
                    created_by INTEGER NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
                )
            """)
            # Community Members table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS community_members (
                    community_id INTEGER NOT NULL,
                    user_id INTEGER NOT NULL,
                    role TEXT NOT NULL DEFAULT 'member',
                    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (community_id, user_id),
                    FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            """)
            # Community Join Requests table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS community_requests (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    community_id INTEGER NOT NULL,
                    user_id INTEGER NOT NULL,
                    status TEXT NOT NULL DEFAULT 'pending',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS anti_cheat_reports (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    competition_id INTEGER NOT NULL,
                    problem_id INTEGER,
                    submission_id_1 INTEGER,
                    submission_id_2 INTEGER,
                    user_id_1 INTEGER,
                    user_id_2 INTEGER,
                    username_1 TEXT,
                    username_2 TEXT,
                    similarity_score REAL NOT NULL,
                    matched_tokens INTEGER DEFAULT 0,
                    verdict TEXT NOT NULL DEFAULT 'FLAGGED',
                    details TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE CASCADE
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS honeypot_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    ip TEXT NOT NULL,
                    path TEXT NOT NULL,
                    method TEXT NOT NULL,
                    user_agent TEXT,
                    payload TEXT,
                    action_taken TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS sentinel_actions_log (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    action_type TEXT NOT NULL,
                    target_ip TEXT,
                    target_user_id INTEGER,
                    reason TEXT,
                    details TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            self._add_column_if_missing(cursor, "sessions", "user_id", "INTEGER")
            self._add_column_if_missing(cursor, "solved_problems", "user_id", "INTEGER")
            self._add_column_if_missing(cursor, "submissions", "user_id", "INTEGER")
            self._add_column_if_missing(cursor, "submissions", "competition_id", "INTEGER")
            self._add_column_if_missing(cursor, "submissions", "language", "TEXT")
            self._add_column_if_missing(cursor, "submissions", "score", "REAL DEFAULT 0")
            self._add_column_if_missing(cursor, "submissions", "passed_tests", "INTEGER DEFAULT 0")
            self._add_column_if_missing(cursor, "submissions", "total_tests", "INTEGER DEFAULT 0")
            self._add_column_if_missing(cursor, "auth_tokens", "expires_at", "TIMESTAMP")
            self._add_column_if_missing(cursor, "users", "role", "TEXT NOT NULL DEFAULT 'user'")
            self._add_column_if_missing(cursor, "users", "is_admin", "INTEGER NOT NULL DEFAULT 0")
            self._add_column_if_missing(cursor, "users", "is_locked", "INTEGER NOT NULL DEFAULT 0")
            self._add_column_if_missing(cursor, "users", "avatar_path", "TEXT DEFAULT ''")
            self._add_column_if_missing(cursor, "users", "bio", "TEXT DEFAULT ''")
            self._add_column_if_missing(cursor, "users", "fullname", "TEXT DEFAULT 'Võ Hồng Quang'")
            self._add_column_if_missing(cursor, "users", "timezone", "TEXT DEFAULT 'Ho_Chi_Minh'")
            self._add_column_if_missing(cursor, "users", "language", "TEXT DEFAULT 'C++17'")
            self._add_column_if_missing(cursor, "users", "editor_theme", "TEXT DEFAULT 'Github'")
            self._add_column_if_missing(cursor, "users", "last_name_change", "TEXT DEFAULT ''")
            self._add_column_if_missing(cursor, "users", "email", "TEXT")
            self._add_column_if_missing(cursor, "competitions", "key", "TEXT")
            self._add_column_if_missing(cursor, "competitions", "format", "TEXT DEFAULT 'icpc'")
            self._add_column_if_missing(cursor, "competitions", "is_rated", "INTEGER DEFAULT 1")
            self._add_column_if_missing(cursor, "competitions", "access_code", "TEXT DEFAULT ''")
            self._add_column_if_missing(cursor, "competitions", "scoreboard_visibility", "TEXT DEFAULT 'visible'")
            self._add_column_if_missing(cursor, "payments", "sender_name", "TEXT DEFAULT ''")
            self._add_column_if_missing(cursor, "users", "ai_usage_count", "INTEGER NOT NULL DEFAULT 0")
            conn.commit()
            self._ensure_default_admin()
            self._ensure_default_clueoj_contest()

    def _ensure_default_clueoj_contest(self):
        with self.get_connection() as conn:
            row = conn.execute("SELECT COUNT(*) as count FROM competitions").fetchone()
            if row and row["count"] > 0:
                return

            admin_row = conn.execute("SELECT id FROM users WHERE is_admin = 1").fetchone()
            admin_id = admin_row["id"] if admin_row else 1

            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO competitions (title, statement, status, starts_at, ends_at, created_by) VALUES (?, ?, ?, ?, ?, ?)",
                (
                    "ClueOJ Championship Round #1 - A+B Problem",
                    "## ClueOJ Championship Round #1\n\nChào mừng các sĩ tử đến với cuộc thi ClueOJ! Bài tập yêu cầu tính tổng A + B cho hai số nguyên dương.\n\n### Input\n- Gồm 2 số nguyên A và B.\n\n### Output\n- In ra tổng A + B.",
                    "published",
                    None,
                    None,
                    admin_id,
                ),
            )
            competition_id = cursor.lastrowid

            cursor.execute(
                "INSERT INTO competition_problems (competition_id, code, title, statement, points, time_limit, memory_limit, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    competition_id,
                    "A",
                    "A+B Problem",
                    "Cho hai số nguyên A và B. Hãy tính tổng A + B.",
                    100,
                    2.0,
                    256,
                    0,
                ),
            )
            problem_id = cursor.lastrowid

            tests = [
                {"input": "1 2\n", "expected": "3\n", "points": 50},
                {"input": "100 200\n", "expected": "300\n", "points": 50},
            ]
            cursor.executemany(
                "INSERT INTO problem_tests (problem_id, input, expected, points) VALUES (?, ?, ?, ?)",
                [(problem_id, t["input"], t["expected"], t["points"]) for t in tests],
            )
            conn.commit()

    def _ensure_default_admin(self):
        admin_username = "admin"
        admin_password = "admin123"
        with self.get_connection() as conn:
            existing = conn.execute("SELECT id, username, email, password_hash, is_admin, role FROM users WHERE username = ?", (admin_username,)).fetchone()
            if existing:
                if not existing["is_admin"]:
                    conn.execute(
                        "UPDATE users SET is_admin = 1, role = 'admin' WHERE username = ?",
                        (admin_username,),
                    )
                if not existing["email"]:
                    conn.execute("UPDATE users SET email = ? WHERE username = ?", ("admin@local.cp", admin_username))
                conn.commit()
                return

            salt = secrets.token_bytes(16)
            digest = hashlib.pbkdf2_hmac(
                self.PASSWORD_HASH_ALGORITHM,
                admin_password.encode(),
                salt,
                self.PASSWORD_HASH_ITERATIONS,
            ).hex()
            conn.execute(
                "INSERT INTO users (username, email, password_hash, role, is_admin) VALUES (?, ?, ?, 'admin', 1)",
                (admin_username, "admin@local.cp", f"{self.PASSWORD_HASH_ALGORITHM}${salt.hex()}${digest}"),
            )
            conn.commit()

    @staticmethod
    def hash_password(password: str, salt: Optional[bytes] = None) -> str:
        salt_bytes = salt or secrets.token_bytes(16)
        digest = hashlib.pbkdf2_hmac(
            DatabaseManager.PASSWORD_HASH_ALGORITHM,
            password.encode(),
            salt_bytes,
            DatabaseManager.PASSWORD_HASH_ITERATIONS,
        ).hex()
        return f"{DatabaseManager.PASSWORD_HASH_ALGORITHM}${salt_bytes.hex()}${digest}"

    @staticmethod
    def _add_column_if_missing(cursor, table: str, column: str, definition: str):
        columns = {row[1] for row in cursor.execute(f"PRAGMA table_info({table})").fetchall()}
        if column not in columns:
            cursor.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")

class MemoryStore:
    def __init__(self, db_manager: DatabaseManager):
        self.db = db_manager

    def create_session(self, session_id: str, title: str = "Cuộc trò chuyện mới", user_id: Optional[int] = None):
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT user_id FROM sessions WHERE id = ?", (session_id,))
            existing = cursor.fetchone()
            if existing and user_id is not None and existing["user_id"] != user_id:
                raise PermissionError("Session không thuộc tài khoản hiện tại.")
            if existing:
                cursor.execute("UPDATE sessions SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", (title, session_id))
            else:
                cursor.execute("INSERT INTO sessions (id, title, user_id, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)", (session_id, title, user_id))
            conn.commit()

    def list_sessions(self, user_id: Optional[int] = None) -> List[Dict[str, Any]]:
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            if user_id is None:
                cursor.execute("SELECT id, title, created_at, updated_at FROM sessions ORDER BY updated_at DESC")
            else:
                cursor.execute("SELECT id, title, created_at, updated_at FROM sessions WHERE user_id = ? ORDER BY updated_at DESC", (user_id,))
            return [dict(row) for row in cursor.fetchall()]

    def delete_session(self, session_id: str, user_id: Optional[int] = None):
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM messages WHERE session_id = ? AND session_id IN (SELECT id FROM sessions WHERE user_id = ?)", (session_id, user_id))
            cursor.execute("DELETE FROM sessions WHERE id = ? AND user_id = ?", (session_id, user_id))
            conn.commit()

    def add_message(self, session_id: str, role: str, content: str, metadata: Optional[Dict[str, Any]] = None, user_id: Optional[int] = None):
        self.create_session(session_id, user_id=user_id)
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            meta_json = json.dumps(metadata) if metadata else None
            cursor.execute(
                "INSERT INTO messages (session_id, role, content, metadata) VALUES (?, ?, ?, ?)",
                (session_id, role, content, meta_json)
            )
            cursor.execute("UPDATE sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?", (session_id,))
            conn.commit()

    def get_messages(self, session_id: str, limit: int = 15, user_id: Optional[int] = None) -> List[Dict[str, Any]]:
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            if user_id is None:
                cursor.execute("SELECT role, content, metadata, created_at FROM messages WHERE session_id = ? ORDER BY id DESC LIMIT ?", (session_id, limit))
            else:
                cursor.execute(
                    "SELECT role, content, metadata, created_at FROM messages WHERE session_id = ? AND session_id IN (SELECT id FROM sessions WHERE user_id = ?) ORDER BY id DESC LIMIT ?",
                    (session_id, user_id, limit)
                )
            rows = cursor.fetchall()
            messages = []
            for row in reversed(rows):
                m = dict(row)
                if m.get("metadata"):
                    try:
                        m["metadata"] = json.loads(m["metadata"])
                    except Exception:
                        pass
                messages.append(m)
            return messages

    def save_problem(self, title: str, category: str, complexity_time: str, complexity_space: str, code: str, notes: str = "", verdict: str = "AC", user_id: Optional[int] = None) -> int:
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                     """INSERT INTO solved_problems (title, category, complexity_time, complexity_space, solution_code, notes, verdict, user_id) 
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                     (title, category, complexity_time, complexity_space, code, notes, verdict, user_id)
            )
            conn.commit()
            return cursor.lastrowid

    def list_solved_problems(self, user_id: Optional[int] = None) -> List[Dict[str, Any]]:
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            if user_id is None:
                cursor.execute("SELECT * FROM solved_problems ORDER BY id DESC LIMIT 50")
            else:
                cursor.execute("SELECT * FROM solved_problems WHERE user_id = ? ORDER BY id DESC LIMIT 50", (user_id,))
            return [dict(row) for row in cursor.fetchall()]

    def create_user(self, username: str, email: str, password: str) -> Dict[str, Any]:
        normalized = username.strip()
        is_admin = normalized.lower() == "admin"
        role = "admin" if is_admin else "user"
        password_hash = DatabaseManager.hash_password(password)
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO users (username, email, password_hash, role, is_admin) VALUES (?, ?, ?, ?, ?)",
                (normalized, email.strip().lower(), password_hash, role, 1 if is_admin else 0),
            )
            conn.commit()
            return {"id": cursor.lastrowid, "username": normalized, "email": email.strip().lower(), "role": role, "is_admin": is_admin}

    def authenticate_user(self, login: str, password: str) -> Optional[Dict[str, Any]]:
        with self.db.get_connection() as conn:
            row = conn.execute("SELECT id, username, email, password_hash, role, is_admin, is_locked, avatar_path FROM users WHERE username = ? OR email = ?", (login, login.lower())).fetchone()
        if not row:
            return None
        password_parts = row["password_hash"].split("$")
        if len(password_parts) == 3:
            algorithm, salt, expected = password_parts
        elif len(password_parts) == 2:
            algorithm = "sha256"
            salt, expected = password_parts
        else:
            return None
        if algorithm not in {"sha256", DatabaseManager.PASSWORD_HASH_ALGORITHM}:
            return None
        try:
            actual = hashlib.pbkdf2_hmac(
                algorithm,
                password.encode(),
                bytes.fromhex(salt),
                DatabaseManager.PASSWORD_HASH_ITERATIONS,
            ).hex()
        except (ValueError, TypeError):
            return None
        if not secrets.compare_digest(actual, expected):
            return None
        if algorithm != DatabaseManager.PASSWORD_HASH_ALGORITHM:
            with self.db.get_connection() as conn:
                conn.execute(
                    "UPDATE users SET password_hash = ? WHERE id = ?",
                    (DatabaseManager.hash_password(password), row["id"]),
                )
                conn.commit()
        return {
            "id": row["id"],
            "username": row["username"],
            "email": row["email"],
            "role": row["role"] or ("admin" if row["is_admin"] else "user"),
            "is_admin": bool(row["is_admin"]),
            "is_locked": bool(row["is_locked"]),
            "avatar_path": row["avatar_path"] or "",
        }

    def create_auth_token(self, user_id: int, remember: bool = False) -> str:
        token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        with self.db.get_connection() as conn:
            expiry = "+30 days" if remember else "+7 days"
            conn.execute("INSERT INTO auth_tokens (token, user_id, expires_at) VALUES (?, ?, datetime('now', ?))", (token_hash, user_id, expiry))
            conn.commit()
        return token

    def get_user_by_token(self, token: str) -> Optional[Dict[str, Any]]:
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        with self.db.get_connection() as conn:
            row = conn.execute(
                "SELECT users.id, users.username, users.email, users.role, users.is_admin, users.is_locked, users.avatar_path FROM auth_tokens JOIN users ON users.id = auth_tokens.user_id WHERE auth_tokens.token = ? AND (auth_tokens.expires_at IS NULL OR auth_tokens.expires_at > CURRENT_TIMESTAMP)",
                (token_hash,),
            ).fetchone()
        if not row:
            return None
        return {
            "id": row["id"],
            "username": row["username"],
            "email": row["email"],
            "role": row["role"] or ("admin" if row["is_admin"] else "user"),
            "is_admin": bool(row["is_admin"]),
            "is_locked": bool(row["is_locked"]),
            "avatar_path": row["avatar_path"] or "",
        }

    def list_members(self) -> List[Dict[str, Any]]:
        with self.db.get_connection() as conn:
            rows = conn.execute(
                """
                SELECT users.id, users.username, users.email, users.role, users.is_admin, users.created_at,
                       COUNT(DISTINCT sessions.id) AS session_count,
                       COUNT(DISTINCT solved_problems.id) AS solved_count,
                       (SELECT GROUP_CONCAT(ip, ', ') FROM user_ips WHERE user_id = users.id) AS ips
                FROM users
                LEFT JOIN sessions ON sessions.user_id = users.id
                LEFT JOIN solved_problems ON solved_problems.user_id = users.id
                GROUP BY users.id, users.username, users.role, users.is_admin, users.created_at
                ORDER BY users.created_at DESC
                """
            ).fetchall()
            return [dict(row) for row in rows]

    def list_global_standings(self) -> List[Dict[str, Any]]:
        with self.db.get_connection() as conn:
            rows = conn.execute(
                """
                SELECT users.id, users.username, users.role, users.is_admin, users.created_at,
                       COUNT(DISTINCT solved_problems.id) AS solved_count,
                       COALESCE(SUM(submissions.score), 0) + (COUNT(DISTINCT solved_problems.id) * 100) AS total_score
                FROM users
                LEFT JOIN solved_problems ON solved_problems.user_id = users.id
                LEFT JOIN submissions ON submissions.user_id = users.id
                WHERE (users.is_locked = 0 OR users.is_locked IS NULL)
                  AND (users.is_admin = 0 OR users.is_admin IS NULL)
                  AND LOWER(COALESCE(users.role, '')) NOT IN ('admin', 'superadmin', 'dev', 'developer', 'moderator', 'staff')
                  AND LOWER(users.username) NOT IN ('admin', 'superadmin', 'dev', 'developer', 'root', 'staff')
                GROUP BY users.id, users.username, users.role, users.is_admin, users.created_at
                ORDER BY total_score DESC, solved_count DESC, users.created_at ASC
                """
            ).fetchall()
            result = []
            for index, row in enumerate(rows, start=1):
                role = row["role"] or "user"
                result.append({
                    "rank": index,
                    "id": row["id"],
                    "username": row["username"],
                    "role": role,
                    "is_admin": False,
                    "solved_count": row["solved_count"] or 0,
                    "total_score": row["total_score"] or 0,
                    "joined_at": row["created_at"]
                })
            return result

    def get_member_detail(self, user_id: int) -> Optional[Dict[str, Any]]:
        with self.db.get_connection() as conn:
            user = conn.execute(
                "SELECT id, username, email, role, is_admin, is_locked, avatar_path, created_at FROM users WHERE id = ?",
                (user_id,),
            ).fetchone()
            if not user:
                return None
            sessions = conn.execute(
                "SELECT id, title, created_at, updated_at FROM sessions WHERE user_id = ? ORDER BY updated_at DESC LIMIT 20",
                (user_id,),
            ).fetchall()
            solved = conn.execute(
                "SELECT id, title, category, verdict, created_at FROM solved_problems WHERE user_id = ? ORDER BY id DESC LIMIT 20",
                (user_id,),
            ).fetchall()
            submissions = conn.execute(
                "SELECT id, competition_id, language, score, passed_tests, total_tests, created_at FROM submissions WHERE user_id = ? ORDER BY id DESC LIMIT 20",
                (user_id,),
            ).fetchall() if conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='submissions'").fetchone() else []
            return {
                "user": {
                    "id": user["id"],
                    "username": user["username"],
                    "email": user["email"] or "",
                    "role": user["role"] or ("admin" if user["is_admin"] else "user"),
                    "is_admin": bool(user["is_admin"]),
                    "is_locked": bool(user["is_locked"]),
                    "avatar_path": user["avatar_path"] or "",
                    "created_at": user["created_at"],
                },
                "sessions": [dict(r) for r in sessions],
                "solved_problems": [dict(r) for r in solved],
                "submissions": [dict(r) for r in submissions],
                "ips": self.list_user_ips(user_id),
            }

    def get_user_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        with self.db.get_connection() as conn:
            row = conn.execute(
                "SELECT id, username, email, role, is_admin, is_locked, avatar_path FROM users WHERE username = ? COLLATE NOCASE",
                (username.strip(),),
            ).fetchone()
            if not row:
                return None
            return {
                "id": row["id"],
                "username": row["username"],
                "email": row["email"],
                "role": row["role"] or ("admin" if row["is_admin"] else "user"),
                "is_admin": bool(row["is_admin"]),
                "is_locked": bool(row["is_locked"]),
                "avatar_path": row["avatar_path"] or "",
            }

    def get_user_by_id(self, user_id: int) -> Optional[Dict[str, Any]]:
        with self.db.get_connection() as conn:
            row = conn.execute(
                "SELECT id, username, email, role, is_admin, is_locked, avatar_path FROM users WHERE id = ?",
                (user_id,),
            ).fetchone()
            if not row:
                return None
            return {
                "id": row["id"],
                "username": row["username"],
                "email": row["email"],
                "role": row["role"] or ("admin" if row["is_admin"] else "user"),
                "is_admin": bool(row["is_admin"]),
                "is_locked": bool(row["is_locked"]),
                "avatar_path": row["avatar_path"] or "",
            }

    def get_user_profile_stats(self, user_id: int) -> Optional[Dict[str, Any]]:
        with self.db.get_connection() as conn:
            user = conn.execute(
                """
                SELECT id, username, email, role, is_admin, avatar_path, 
                       COALESCE(bio, '') as bio,
                       COALESCE(NULLIF(fullname, ''), username) as fullname,
                       COALESCE(timezone, 'Ho_Chi_Minh') as timezone,
                       COALESCE(language, 'C++17') as language,
                       COALESCE(editor_theme, 'Github') as editor_theme,
                       COALESCE(NULLIF(last_name_change, ''), created_at) as last_name_change,
                       created_at 
                FROM users WHERE id = ?
                """,
                (user_id,),
            ).fetchone()
            if not user:
                return None
            
            # Solved problems count
            solved_row = conn.execute(
                "SELECT COUNT(DISTINCT id) as count FROM solved_problems WHERE user_id = ?",
                (user_id,)
            ).fetchone()
            solved_count = solved_row["count"] if solved_row else 0

            # Submissions count & scores
            sub_stats = conn.execute(
                "SELECT COUNT(*) as total_sub, COALESCE(SUM(score), 0) as sum_score, COALESCE(MAX(score), 0) as max_score, COALESCE(MIN(score), 0) as min_score FROM submissions WHERE user_id = ?",
                (user_id,)
            ).fetchone() if conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='submissions'").fetchone() else None
            
            total_submissions = sub_stats["total_sub"] if sub_stats else 0
            sum_score = sub_stats["sum_score"] if sub_stats else 0
            total_score = int(sum_score + (solved_count * 100))

            # Contests count
            contest_row = conn.execute(
                "SELECT COUNT(DISTINCT competition_id) as count FROM submissions WHERE user_id = ? AND competition_id IS NOT NULL",
                (user_id,)
            ).fetchone() if conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='submissions'").fetchone() else None
            competitions_count = contest_row["count"] if contest_row else 0

            # Global rank calculation
            standings = self.list_global_standings()
            user_rank = 1
            for idx, item in enumerate(standings, start=1):
                if item["id"] == user_id:
                    user_rank = idx
                    break

            # Solved problems list
            solved_list = conn.execute(
                "SELECT id, title, category, verdict, created_at FROM solved_problems WHERE user_id = ? ORDER BY id DESC LIMIT 50",
                (user_id,)
            ).fetchall() if conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='solved_problems'").fetchone() else []

            # Activity rows (combine submissions & solved_problems)
            activity_rows = conn.execute(
                """
                SELECT DATE(created_at) as sub_date, COUNT(*) as count 
                FROM (
                    SELECT created_at FROM submissions WHERE user_id = ?
                    UNION ALL
                    SELECT created_at FROM solved_problems WHERE user_id = ?
                )
                WHERE created_at >= DATE('now', '-365 days')
                GROUP BY DATE(created_at)
                ORDER BY sub_date ASC
                """,
                (user_id, user_id)
            ).fetchall() if conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='submissions'").fetchone() else []

            heatmap_data = {row["sub_date"]: row["count"] for row in activity_rows}

            return {
                "user": {
                    "id": user["id"],
                    "username": user["username"],
                    "fullname": user["fullname"] or user["username"],
                    "email": user["email"] or "",
                    "role": user["role"] or ("admin" if user["is_admin"] else "user"),
                    "is_admin": bool(user["is_admin"]),
                    "avatar_path": user["avatar_path"] or "",
                    "bio": user["bio"] or "",
                    "timezone": user["timezone"] or "Ho_Chi_Minh",
                    "language": user["language"] or "C++17",
                    "editor_theme": user["editor_theme"] or "Github",
                    "last_name_change": user["last_name_change"] or user["created_at"],
                    "created_at": user["created_at"],
                },
                "stats": {
                    "solved_count": solved_count,
                    "total_score": total_score,
                    "rank": user_rank,
                    "total_submissions": total_submissions,
                },
                "solved_problems": [dict(r) for r in solved_list],
                "heatmap": heatmap_data,
            }

    def update_user_profile(
        self,
        user_id: int,
        fullname: Optional[str] = None,
        bio: Optional[str] = None,
        timezone: Optional[str] = None,
        language: Optional[str] = None,
        editor_theme: Optional[str] = None,
        avatar_path: Optional[str] = None,
    ) -> bool:
        with self.db.get_connection() as conn:
            fields = []
            values = []
            if fullname is not None:
                fields.append("fullname = ?")
                values.append(fullname)
            if bio is not None:
                fields.append("bio = ?")
                values.append(bio)
            if timezone is not None:
                fields.append("timezone = ?")
                values.append(timezone)
            if language is not None:
                fields.append("language = ?")
                values.append(language)
            if editor_theme is not None:
                fields.append("editor_theme = ?")
                values.append(editor_theme)
            if avatar_path is not None:
                fields.append("avatar_path = ?")
                values.append(avatar_path)
            
            if not fields:
                return True
            
            values.append(user_id)
            cursor = conn.execute(
                f"UPDATE users SET {', '.join(fields)} WHERE id = ?",
                tuple(values),
            )
            conn.commit()
            return cursor.rowcount > 0

    def lock_user(self, user_id: int, locked: bool) -> bool:
        with self.db.get_connection() as conn:
            cursor = conn.execute(
                "UPDATE users SET is_locked = ? WHERE id = ?",
                (1 if locked else 0, user_id),
            )
            conn.commit()
            return cursor.rowcount > 0

    def delete_user(self, user_id: int) -> bool:
        with self.db.get_connection() as conn:
            cursor = conn.execute("DELETE FROM users WHERE id = ?", (user_id,))
            conn.commit()
            return cursor.rowcount > 0

    def list_blocked_ips(self) -> List[Dict[str, Any]]:
        with self.db.get_connection() as conn:
            rows = conn.execute(
                "SELECT ip, reason, blocked_until, created_at FROM blocked_ips WHERE blocked_until > CURRENT_TIMESTAMP ORDER BY created_at DESC"
            ).fetchall()
            return [dict(row) for row in rows]

    def unblock_ip(self, ip: str) -> bool:
        with self.db.get_connection() as conn:
            cursor = conn.execute("DELETE FROM blocked_ips WHERE ip = ?", (ip,))
            conn.commit()
            return cursor.rowcount > 0

    def get_security_events(self, limit: int = 100) -> List[Dict[str, Any]]:
        with self.db.get_connection() as conn:
            rows = conn.execute(
                "SELECT id, ip, method, path, user_agent, status_code, reason, created_at FROM security_events ORDER BY created_at DESC LIMIT ?",
                (limit,),
            ).fetchall()
            return [dict(row) for row in rows]

    def record_user_ip(self, user_id: int, ip: str) -> None:
        if not ip or ip == "unknown":
            return
        with self.db.get_connection() as conn:
            conn.execute(
                """INSERT INTO user_ips (user_id, ip) VALUES (?, ?)
                   ON CONFLICT(user_id, ip) DO UPDATE SET last_seen = CURRENT_TIMESTAMP""",
                (user_id, ip),
            )
            conn.commit()

    def list_user_ips(self, user_id: int) -> List[Dict[str, Any]]:
        with self.db.get_connection() as conn:
            rows = conn.execute(
                "SELECT ip, first_seen, last_seen FROM user_ips WHERE user_id = ? ORDER BY last_seen DESC",
                (user_id,),
            ).fetchall()
            return [dict(row) for row in rows]

    def export_members(self) -> List[Dict[str, Any]]:
        exported = []
        for member in self.list_members():
            detail = self.get_member_detail(member["id"])
            exported.append(detail)
        return exported

    def update_user_role(self, user_id: int, role: str) -> bool:
        clean_role = role.lower().strip()
        is_admin = 1 if clean_role in ["admin", "superadmin", "dev", "moderator"] else 0
        with self.db.get_connection() as conn:
            cursor = conn.execute(
                "UPDATE users SET role = ?, is_admin = ? WHERE id = ?",
                (clean_role, is_admin, user_id),
            )
            conn.commit()
            return cursor.rowcount > 0

    def get_overview(self) -> Dict[str, Any]:
        with self.db.get_connection() as conn:
            member_count = conn.execute("SELECT COUNT(*) AS cnt FROM users").fetchone()["cnt"]
            admin_count = conn.execute("SELECT COUNT(*) AS cnt FROM users WHERE is_admin = 1").fetchone()["cnt"]
            session_count = conn.execute("SELECT COUNT(*) AS cnt FROM sessions").fetchone()["cnt"]
            solved_count = conn.execute("SELECT COUNT(*) AS cnt FROM solved_problems").fetchone()["cnt"]
            contest_count = conn.execute("SELECT COUNT(*) AS cnt FROM competitions").fetchone()["cnt"]
            submission_count_row = conn.execute("SELECT COUNT(*) AS cnt FROM submissions").fetchone()
            submission_count = submission_count_row["cnt"] if submission_count_row else 0
            blocked_count = conn.execute("SELECT COUNT(*) AS cnt FROM blocked_ips WHERE blocked_until > CURRENT_TIMESTAMP").fetchone()["cnt"]
            # Per-role counts
            role_counts = {}
            for row in conn.execute("SELECT role, COUNT(*) AS cnt FROM users GROUP BY role").fetchall():
                role_counts[row["role"]] = row["cnt"]
            return {
                "total_members": member_count,
                "admin_count": admin_count,
                "total_sessions": session_count,
                "total_saved_problems": solved_count,
                "total_contests": contest_count,
                "total_submissions": submission_count,
                "total_blocked_ips": blocked_count,
                "role_counts": role_counts,
            }

    def list_competitions(self, user_id: Optional[int] = None, include_drafts: bool = False) -> List[Dict[str, Any]]:
        with self.db.get_connection() as conn:
            status_filter = "" if include_drafts else "WHERE c.status != 'draft'"
            rows = conn.execute(
                f"""
                SELECT c.id, c.title, c.statement, c.status, c.starts_at, c.ends_at,
                       c.created_at, c.updated_at,
                       COUNT(DISTINCT t.id) AS test_count,
                       COUNT(DISTINCT p.user_id) AS participant_count,
                       CASE WHEN ? IS NOT NULL AND p_self.user_id IS NOT NULL THEN 1 ELSE 0 END AS joined
                FROM competitions c
                LEFT JOIN competition_tests t ON t.competition_id = c.id
                LEFT JOIN competition_participants p ON p.competition_id = c.id
                LEFT JOIN competition_participants p_self ON p_self.competition_id = c.id AND p_self.user_id = ?
                {status_filter}
                GROUP BY c.id
                ORDER BY c.created_at DESC
                """,
                (user_id, user_id),
            ).fetchall()
            return [dict(row) for row in rows]

    def get_competition(self, competition_id: int, user_id: Optional[int] = None, include_tests: bool = False) -> Optional[Dict[str, Any]]:
        with self.db.get_connection() as conn:
            row = conn.execute(
                "SELECT id, title, statement, status, starts_at, ends_at, created_at, updated_at FROM competitions WHERE id = ?",
                (competition_id,),
            ).fetchone()
            if not row:
                return None
            tests = conn.execute(
                "SELECT id, input, expected FROM competition_tests WHERE competition_id = ? ORDER BY id",
                (competition_id,),
            ).fetchall()
            joined = conn.execute(
                "SELECT 1 FROM competition_participants WHERE competition_id = ? AND user_id = ?",
                (competition_id, user_id),
            ).fetchone() if user_id is not None else None
            result = dict(row)
            result["tests"] = [dict(test) for test in tests] if include_tests else []
            result["test_count"] = len(tests)
            result["problems"] = [{
                "id": competition_id,
                "code": "A",
                "title": result["title"],
                "statement": result["statement"],
                "test_count": len(tests),
                "sample_input": tests[0]["input"] if tests else "",
                "sample_output": tests[0]["expected"] if tests else "",
            }]
            problem_rows = conn.execute(
                "SELECT id, code, title, statement, points, time_limit, memory_limit FROM competition_problems WHERE competition_id = ? ORDER BY sort_order, id",
                (competition_id,),
            ).fetchall()
            if problem_rows:
                result["problems"] = []
                for problem in problem_rows:
                    problem_data = dict(problem)
                    problem_tests = conn.execute(
                        "SELECT id, input, expected, points FROM problem_tests WHERE problem_id = ? ORDER BY id",
                        (problem["id"],),
                    ).fetchall()
                    problem_data["tests"] = [dict(test) for test in problem_tests] if include_tests else []
                    problem_data["test_count"] = len(problem_tests)
                    problem_data["sample_input"] = problem_tests[0]["input"] if problem_tests else ""
                    problem_data["sample_output"] = problem_tests[0]["expected"] if problem_tests else ""
                    result["problems"].append(problem_data)
            result["participant_count"] = conn.execute(
                "SELECT COUNT(*) AS count FROM competition_participants WHERE competition_id = ?",
                (competition_id,),
            ).fetchone()["count"]
            result["joined"] = bool(joined)
            return result

    def create_competition(self, title: str, statement: str, status: str, starts_at: Optional[str], ends_at: Optional[str], tests: List[Dict[str, str]], created_by: int, problems: Optional[List[Dict[str, Any]]] = None) -> int:
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO competitions (title, statement, status, starts_at, ends_at, created_by) VALUES (?, ?, ?, ?, ?, ?)",
                (title, statement, status, starts_at, ends_at, created_by),
            )
            competition_id = cursor.lastrowid
            cursor.executemany(
                "INSERT INTO competition_tests (competition_id, input, expected) VALUES (?, ?, ?)",
                [(competition_id, test.get("input", ""), test.get("expected", "")) for test in tests],
            )
            for order, problem in enumerate(problems or []):
                cursor.execute(
                    "INSERT INTO competition_problems (competition_id, code, title, statement, points, time_limit, memory_limit, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    (competition_id, problem.get("code", chr(65 + order)), problem.get("title", f"Bài {order + 1}"),
                     problem.get("statement", ""), problem.get("points", 100), problem.get("time_limit", 2),
                     problem.get("memory_limit", 256), order),
                )
                problem_id = cursor.lastrowid
                conn.executemany(
                    "INSERT INTO problem_tests (problem_id, input, expected, points) VALUES (?, ?, ?, ?)",
                    [(problem_id, test.get("input", ""), test.get("expected", ""), test.get("points", 0))
                     for test in problem.get("tests", [])],
                )
            conn.commit()
            return competition_id

    def update_competition(self, competition_id: int, title: str, statement: str, status: str, starts_at: Optional[str], ends_at: Optional[str], tests: List[Dict[str, str]], problems: Optional[List[Dict[str, Any]]] = None) -> bool:
        with self.db.get_connection() as conn:
            existing = conn.execute("SELECT id FROM competitions WHERE id = ?", (competition_id,)).fetchone()
            if not existing:
                return False
            conn.execute(
                "UPDATE competitions SET title = ?, statement = ?, status = ?, starts_at = ?, ends_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                (title, statement, status, starts_at, ends_at, competition_id),
            )
            conn.execute("DELETE FROM competition_problems WHERE competition_id = ?", (competition_id,))
            conn.execute("DELETE FROM competition_tests WHERE competition_id = ?", (competition_id,))
            conn.executemany(
                "INSERT INTO competition_tests (competition_id, input, expected) VALUES (?, ?, ?)",
                [(competition_id, test.get("input", ""), test.get("expected", "")) for test in tests],
            )
            for order, problem in enumerate(problems or []):
                cursor = conn.execute(
                    "INSERT INTO competition_problems (competition_id, code, title, statement, points, time_limit, memory_limit, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    (competition_id, problem.get("code", chr(65 + order)), problem.get("title", f"Bài {order + 1}"),
                     problem.get("statement", ""), problem.get("points", 100), problem.get("time_limit", 2),
                     problem.get("memory_limit", 256), order),
                )
                conn.executemany(
                    "INSERT INTO problem_tests (problem_id, input, expected, points) VALUES (?, ?, ?, ?)",
                    [(cursor.lastrowid, test.get("input", ""), test.get("expected", ""), test.get("points", 0))
                     for test in problem.get("tests", [])],
                )
            conn.commit()
            return True

    def delete_competition(self, competition_id: int) -> bool:
        with self.db.get_connection() as conn:
            existing = conn.execute("SELECT id FROM competitions WHERE id = ?", (competition_id,)).fetchone()
            if not existing:
                return False
            prob_rows = conn.execute("SELECT id FROM competition_problems WHERE competition_id = ?", (competition_id,)).fetchall()
            for r in prob_rows:
                conn.execute("DELETE FROM problem_tests WHERE problem_id = ?", (r["id"],))
            conn.execute("DELETE FROM competition_problems WHERE competition_id = ?", (competition_id,))
            conn.execute("DELETE FROM competition_tests WHERE competition_id = ?", (competition_id,))
            conn.execute("DELETE FROM competition_participants WHERE competition_id = ?", (competition_id,))
            conn.execute("DELETE FROM submissions WHERE competition_id = ?", (competition_id,))
            conn.execute("DELETE FROM competitions WHERE id = ?", (competition_id,))
            conn.commit()
            return True

    def list_all_problems(self) -> List[Dict[str, Any]]:
        with self.db.get_connection() as conn:
            rows = conn.execute(
                """
                SELECT p.id, p.competition_id, p.code, p.title, p.statement, p.points, 
                       p.time_limit, p.memory_limit, p.sort_order, p.is_hidden,
                       c.title as contest_title,
                       (SELECT COUNT(*) FROM problem_tests t WHERE t.problem_id = p.id) as test_count
                FROM competition_problems p
                LEFT JOIN competitions c ON p.competition_id = c.id
                ORDER BY p.id DESC
                """
            ).fetchall()
            return [dict(r) for r in rows]

    def get_problem(self, problem_id: int) -> Optional[Dict[str, Any]]:
        with self.db.get_connection() as conn:
            row = conn.execute(
                """
                SELECT p.id, p.competition_id, p.code, p.title, p.statement, p.points, 
                       p.time_limit, p.memory_limit, p.sort_order, p.is_hidden,
                       c.title as contest_title
                FROM competition_problems p
                LEFT JOIN competitions c ON p.competition_id = c.id
                WHERE p.id = ?
                """,
                (problem_id,),
            ).fetchone()
            if not row:
                return None
            res = dict(row)
            test_rows = conn.execute(
                "SELECT id, input, expected, points FROM problem_tests WHERE problem_id = ? ORDER BY id ASC",
                (problem_id,),
            ).fetchall()
            res["tests"] = [dict(t) for t in test_rows]
            return res

    def create_bank_problem(self, title: str, statement: str, points: int = 100, time_limit: float = 1.0, memory_limit: int = 256, code: str = "A", competition_id: Optional[int] = None, tests: Optional[List[Dict[str, Any]]] = None, is_hidden: int = 0) -> int:
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            if competition_id is None:
                c_row = conn.execute("SELECT id FROM competitions ORDER BY id ASC LIMIT 1").fetchone()
                competition_id = c_row["id"] if c_row else 1
            cursor.execute(
                """
                INSERT INTO competition_problems (competition_id, code, title, statement, points, time_limit, memory_limit, sort_order, is_hidden)
                VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
                """,
                (competition_id, code, title, statement, points, time_limit, memory_limit, 1 if is_hidden else 0),
            )
            prob_id = cursor.lastrowid
            if tests:
                conn.executemany(
                    "INSERT INTO problem_tests (problem_id, input, expected, points) VALUES (?, ?, ?, ?)",
                    [(prob_id, t.get("input", ""), t.get("expected", ""), t.get("points", 0)) for t in tests],
                )
            conn.commit()
            return prob_id

    def update_bank_problem(self, problem_id: int, title: str, statement: str, points: int = 100, time_limit: float = 1.0, memory_limit: int = 256, code: str = "A", tests: Optional[List[Dict[str, Any]]] = None, is_hidden: Optional[int] = None) -> bool:
        with self.db.get_connection() as conn:
            existing = conn.execute("SELECT id, is_hidden FROM competition_problems WHERE id = ?", (problem_id,)).fetchone()
            if not existing:
                return False
            
            final_hidden = existing["is_hidden"] if is_hidden is None else (1 if is_hidden else 0)
            conn.execute(
                """
                UPDATE competition_problems 
                SET title = ?, statement = ?, points = ?, time_limit = ?, memory_limit = ?, code = ?, is_hidden = ?
                WHERE id = ?
                """,
                (title, statement, points, time_limit, memory_limit, code, final_hidden, problem_id),
            )
            if tests is not None:
                conn.execute("DELETE FROM problem_tests WHERE problem_id = ?", (problem_id,))
                conn.executemany(
                    "INSERT INTO problem_tests (problem_id, input, expected, points) VALUES (?, ?, ?, ?)",
                    [(problem_id, t.get("input", ""), t.get("expected", ""), t.get("points", 0)) for t in tests],
                )
            conn.commit()
            return True

    def toggle_problem_visibility(self, problem_id: int, is_hidden: Optional[bool] = None) -> Optional[Dict[str, Any]]:
        with self.db.get_connection() as conn:
            existing = conn.execute("SELECT id, code, title, is_hidden FROM competition_problems WHERE id = ?", (problem_id,)).fetchone()
            if not existing:
                return None
            
            if is_hidden is None:
                new_hidden = 0 if existing["is_hidden"] else 1
            else:
                new_hidden = 1 if is_hidden else 0
                
            conn.execute("UPDATE competition_problems SET is_hidden = ? WHERE id = ?", (new_hidden, problem_id))
            conn.commit()
            return {
                "id": existing["id"],
                "code": existing["code"],
                "title": existing["title"],
                "is_hidden": bool(new_hidden)
            }

    def bulk_problems_action(self, problem_ids: List[int], action: str) -> Dict[str, Any]:
        if not problem_ids:
            return {"success": True, "affected": 0}
            
        with self.db.get_connection() as conn:
            placeholders = ",".join("?" for _ in problem_ids)
            if action == "hide":
                conn.execute(f"UPDATE competition_problems SET is_hidden = 1 WHERE id IN ({placeholders})", problem_ids)
            elif action == "unhide":
                conn.execute(f"UPDATE competition_problems SET is_hidden = 0 WHERE id IN ({placeholders})", problem_ids)
            elif action == "delete":
                conn.execute(f"DELETE FROM problem_tests WHERE problem_id IN ({placeholders})", problem_ids)
                conn.execute(f"DELETE FROM competition_problems WHERE id IN ({placeholders})", problem_ids)
            conn.commit()
            return {"success": True, "affected": len(problem_ids), "action": action}

    def delete_problem(self, problem_id: int) -> bool:
        with self.db.get_connection() as conn:
            existing = conn.execute("SELECT id FROM competition_problems WHERE id = ?", (problem_id,)).fetchone()
            if not existing:
                return False
            conn.execute("DELETE FROM problem_tests WHERE problem_id = ?", (problem_id,))
            conn.execute("DELETE FROM competition_problems WHERE id = ?", (problem_id,))
            conn.commit()
            return True

    def update_problem_tests(self, problem_id: int, tests: List[Dict[str, Any]]) -> bool:
        with self.db.get_connection() as conn:
            existing = conn.execute("SELECT id FROM competition_problems WHERE id = ?", (problem_id,)).fetchone()
            if not existing:
                return False
            conn.execute("DELETE FROM problem_tests WHERE problem_id = ?", (problem_id,))
            conn.executemany(
                "INSERT INTO problem_tests (problem_id, input, expected, points) VALUES (?, ?, ?, ?)",
                [(problem_id, t.get("input", ""), t.get("expected", ""), t.get("points", 0)) for t in tests],
            )
            conn.commit()
            return True

    def join_competition(self, competition_id: int, user_id: int) -> bool:
        with self.db.get_connection() as conn:
            competition = conn.execute("SELECT id, status FROM competitions WHERE id = ?", (competition_id,)).fetchone()
            if not competition or competition["status"] != "published":
                return False
            conn.execute(
                "INSERT OR IGNORE INTO competition_participants (competition_id, user_id) VALUES (?, ?)",
                (competition_id, user_id),
            )
            conn.commit()
            return True

    def has_competition_participation(self, user_id: int) -> bool:
        with self.db.get_connection() as conn:
            return conn.execute(
                "SELECT 1 FROM competition_participants WHERE user_id = ? LIMIT 1",
                (user_id,),
            ).fetchone() is not None

    def list_competition_ranking(self, competition_id: int) -> List[Dict[str, Any]]:
        with self.db.get_connection() as conn:
            rows = conn.execute(
                """
                SELECT u.username, p.joined_at, COALESCE(MAX(s.score), 0) AS score,
                       COUNT(s.id) AS submission_count
                FROM competition_participants p
                JOIN users u ON u.id = p.user_id
                LEFT JOIN submissions s ON s.competition_id = p.competition_id AND s.user_id = p.user_id
                WHERE p.competition_id = ?
                GROUP BY p.user_id, u.username, p.joined_at
                ORDER BY score DESC, p.joined_at ASC, u.username ASC
                """,
                (competition_id,),
            ).fetchall()
            return [
                {"rank": index, "username": row["username"], "joined_at": row["joined_at"],
                 "score": row["score"], "submission_count": row["submission_count"]}
                for index, row in enumerate(rows, start=1)
            ]

    def list_competition_submissions(self, competition_id: int, limit: int = 50) -> List[Dict[str, Any]]:
        with self.db.get_connection() as conn:
            rows = conn.execute(
                """
                SELECT s.id, s.user_id, u.username, s.competition_id, s.language,
                       s.verdict, s.score, s.execution_time_ms, s.memory_used_kb AS memory_kb,
                       s.passed_tests, s.total_tests, s.created_at, s.code, s.compiler_output
                FROM submissions s
                LEFT JOIN users u ON u.id = s.user_id
                WHERE s.competition_id = ?
                ORDER BY s.id DESC
                LIMIT ?
                """,
                (competition_id, limit),
            ).fetchall()
            return [dict(row) for row in rows]

    def list_all_submissions(self, limit: int = 100) -> List[Dict[str, Any]]:
        with self.db.get_connection() as conn:
            rows = conn.execute(
                """
                SELECT s.id, s.session_id, s.user_id, COALESCE(u.username, 'Thí sinh') AS username,
                       s.competition_id, COALESCE(c.title, 'Bài tập tự do') AS competition_title,
                       s.language, s.verdict, s.score, s.execution_time_ms, s.memory_used_kb AS memory_kb,
                       s.passed_tests, s.total_tests, s.created_at, s.code, s.compiler_output
                FROM submissions s
                LEFT JOIN users u ON u.id = s.user_id
                LEFT JOIN competitions c ON c.id = s.competition_id
                ORDER BY s.id DESC
                LIMIT ?
                """,
                (limit,),
            ).fetchall()
            return [dict(row) for row in rows]

    def list_user_submissions(self, user_id: int, limit: int = 100) -> List[Dict[str, Any]]:
        with self.db.get_connection() as conn:
            rows = conn.execute(
                """
                SELECT s.id, s.session_id, s.user_id, COALESCE(u.username, 'Thí sinh') AS username,
                       s.competition_id, COALESCE(c.title, 'Bài tập tự do') AS competition_title,
                       s.language, s.verdict, s.score, s.execution_time_ms, s.memory_used_kb AS memory_kb,
                       s.passed_tests, s.total_tests, s.created_at, s.code, s.compiler_output
                FROM submissions s
                LEFT JOIN users u ON u.id = s.user_id
                LEFT JOIN competitions c ON c.id = s.competition_id
                WHERE s.user_id = ?
                ORDER BY s.id DESC
                LIMIT ?
                """,
                (user_id, limit),
            ).fetchall()
            return [dict(row) for row in rows]

    def get_submission_detail(self, submission_id: int) -> Optional[Dict[str, Any]]:
        with self.db.get_connection() as conn:
            row = conn.execute(
                """
                SELECT s.id, s.session_id, s.user_id, COALESCE(u.username, 'Thí sinh') AS username,
                       s.competition_id, COALESCE(c.title, 'Bài tập tự do') AS competition_title,
                       s.language, s.verdict, s.score, s.execution_time_ms, s.memory_used_kb AS memory_kb,
                       s.passed_tests, s.total_tests, s.created_at, s.code, s.compiler_output
                FROM submissions s
                LEFT JOIN users u ON u.id = s.user_id
                LEFT JOIN competitions c ON c.id = s.competition_id
                WHERE s.id = ?
                """,
                (submission_id,),
            ).fetchone()
            return dict(row) if row else None

    def reset_server_state(self) -> None:
        with self.db.get_connection() as conn:
            conn.execute("DELETE FROM auth_tokens")
            conn.execute("DELETE FROM messages")
            conn.execute("DELETE FROM sessions")
            conn.execute("DELETE FROM solved_problems")
            conn.execute("DELETE FROM submissions")
            conn.execute("DELETE FROM user_preferences")
            conn.commit()

    def revoke_auth_token(self, token: str) -> None:
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        with self.db.get_connection() as conn:
            conn.execute("DELETE FROM auth_tokens WHERE token = ?", (token_hash,))
            conn.commit()

    def log_submission(self, session_id: Optional[str], code: str, verdict: str, exec_time: float, mem_kb: float, compiler_output: str = "", user_id: Optional[int] = None, competition_id: Optional[int] = None, language: Optional[str] = None, score: float = 0, passed_tests: int = 0, total_tests: int = 0):
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                     """INSERT INTO submissions (session_id, code, verdict, execution_time_ms, memory_used_kb,
                         compiler_output, user_id, competition_id, language, score, passed_tests, total_tests)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                     (session_id, code, verdict, exec_time, mem_kb, compiler_output, user_id, competition_id,
                      language, score, passed_tests, total_tests)
            )
            conn.commit()
            return cursor.lastrowid

    def log_security_event(self, ip: str, method: str, path: str, user_agent: str, status_code: int, reason: str = "") -> None:
        with self.db.get_connection() as conn:
            conn.execute(
                "INSERT INTO security_events (ip, method, path, user_agent, status_code, reason) VALUES (?, ?, ?, ?, ?, ?)",
                (ip, method, path, user_agent, status_code, reason),
            )
            conn.commit()

    def is_ip_blocked(self, ip: str) -> bool:
        with self.db.get_connection() as conn:
            row = conn.execute(
                "SELECT 1 FROM blocked_ips WHERE ip = ? AND blocked_until > datetime('now') LIMIT 1",
                (ip,),
            ).fetchone()
            return row is not None

    def block_ip(self, ip: str, reason: str, minutes: int = 10) -> None:
        if not ip or ip in {"unknown", "127.0.0.1", "::1", "localhost"}:
            return
        with self.db.get_connection() as conn:
            conn.execute(
                "INSERT INTO blocked_ips (ip, reason, blocked_until) VALUES (?, ?, datetime('now', ?)) "
                "ON CONFLICT(ip) DO UPDATE SET reason = excluded.reason, blocked_until = excluded.blocked_until, created_at = CURRENT_TIMESTAMP",
                (ip, reason, f"+{minutes} minutes"),
            )
            conn.commit()

    def get_blocked_ips(self) -> List[Dict[str, Any]]:
        with self.db.get_connection() as conn:
            rows = conn.execute(
                "SELECT ip, reason, blocked_until, created_at FROM blocked_ips WHERE blocked_until > datetime('now') ORDER BY created_at DESC"
            ).fetchall()
            return [dict(row) for row in rows]

    def list_anti_cheat_reports(self, competition_id: Optional[int] = None, limit: int = 100) -> List[Dict[str, Any]]:
        with self.db.get_connection() as conn:
            if competition_id:
                rows = conn.execute(
                    """
                    SELECT r.*, c.title AS competition_title
                    FROM anti_cheat_reports r
                    LEFT JOIN competitions c ON c.id = r.competition_id
                    WHERE r.competition_id = ?
                    ORDER BY r.id DESC LIMIT ?
                    """,
                    (competition_id, limit),
                ).fetchall()
            else:
                rows = conn.execute(
                    """
                    SELECT r.*, c.title AS competition_title
                    FROM anti_cheat_reports r
                    LEFT JOIN competitions c ON c.id = r.competition_id
                    ORDER BY r.id DESC LIMIT ?
                    """,
                    (limit,),
                ).fetchall()
            return [dict(row) for row in rows]

    def update_anti_cheat_verdict(self, report_id: int, verdict: str, details: str = "") -> bool:
        with self.db.get_connection() as conn:
            cursor = conn.execute(
                "UPDATE anti_cheat_reports SET verdict = ?, details = COALESCE(NULLIF(?, ''), details) WHERE id = ?",
                (verdict, details, report_id),
            )
            conn.commit()
            return cursor.rowcount > 0

    def list_honeypot_logs(self, limit: int = 100) -> List[Dict[str, Any]]:
        with self.db.get_connection() as conn:
            rows = conn.execute(
                "SELECT * FROM honeypot_logs ORDER BY id DESC LIMIT ?",
                (limit,),
            ).fetchall()
            return [dict(row) for row in rows]

    def list_sentinel_actions(self, limit: int = 100) -> List[Dict[str, Any]]:
        with self.db.get_connection() as conn:
            rows = conn.execute(
                "SELECT * FROM sentinel_actions_log ORDER BY id DESC LIMIT ?",
                (limit,),
            ).fetchall()
            return [dict(row) for row in rows]

    def get_threat_scores(self, limit: int = 50) -> List[Dict[str, Any]]:
        with self.db.get_connection() as conn:
            rows = conn.execute(
                "SELECT * FROM security_threat_scores ORDER BY score DESC, updated_at DESC LIMIT ?",
                (limit,),
            ).fetchall()
            return [dict(row) for row in rows]

    def reset_threat_score(self, ip: str) -> bool:
        with self.db.get_connection() as conn:
            cursor = conn.execute("DELETE FROM security_threat_scores WHERE ip = ?", (ip,))
            conn.commit()
            return cursor.rowcount > 0

    def get_locked_users(self) -> List[Dict[str, Any]]:
        with self.db.get_connection() as conn:
            rows = conn.execute(
                "SELECT id, username, email, role, is_locked, created_at FROM users WHERE is_locked = 1 ORDER BY id DESC"
            ).fetchall()
            return [dict(row) for row in rows]

    def unban_user_and_ip(self, user_id: Optional[int] = None, ip: Optional[str] = None) -> bool:
        with self.db.get_connection() as conn:
            if user_id:
                conn.execute("UPDATE users SET is_locked = 0 WHERE id = ?", (user_id,))
            if ip:
                conn.execute("DELETE FROM blocked_ips WHERE ip = ?", (ip,))
                conn.execute("DELETE FROM security_threat_scores WHERE ip = ?", (ip,))
            conn.commit()
            return True

    # =========================================================================
    # Payment Methods
    # =========================================================================
    PLAN_ROLES = {
        "pro": "pro",
        "enterprise": "enterprise",
    }
    PLAN_AMOUNTS = {
        "pro": 485000,
        "enterprise": 2490000,
    }
    CAN_CREATE_COMMUNITY_ROLES = {"pro", "enterprise", "admin", "superadmin", "dev"}
    PRIVILEGED_ROLES = {"admin", "superadmin", "dev"}

    def confirm_payment(self, user_id: int, plan: str, ref_code: str, sender_name: str = "") -> Dict[str, Any]:
        """Record a payment, notify dev & superadmin, and upgrade user's role safely."""
        import json
        plan = plan.lower()
        if plan not in self.PLAN_ROLES:
            raise ValueError(f"Unknown plan: {plan}")
        amount_vnd = self.PLAN_AMOUNTS[plan]
        plan_role = self.PLAN_ROLES[plan]
        sender_name = (sender_name or "").strip()

        with self.db.get_connection() as conn:
            user_row = conn.execute("SELECT id, username, email, role, is_admin FROM users WHERE id = ?", (user_id,)).fetchone()
            username = user_row["username"] if user_row else f"User#{user_id}"
            current_role = user_row["role"] if user_row else "user"

            # Preserve dev and superadmin roles so they never get demoted
            if current_role in ("dev", "superadmin", "admin"):
                new_role = current_role
            else:
                new_role = plan_role

            conn.execute(
                "INSERT INTO payments (user_id, plan, amount_vnd, ref_code, sender_name, status) VALUES (?, ?, ?, ?, ?, 'COMPLETED')",
                (user_id, plan, amount_vnd, ref_code, sender_name),
            )
            conn.execute(
                "UPDATE users SET role = ? WHERE id = ?",
                (new_role, user_id),
            )

            # Create notification for Dev and SuperAdmin
            plan_name_display = "Pro Developer (485.000đ)" if plan == "pro" else "Enterprise / Campus (2.490.000đ)"
            notif_title = f"🔔 [MUA GÓI {plan.upper()}] Tài khoản '{username}' vừa chuyển khoản"
            notif_msg = (
                f"Tài khoản '{username}' vừa hoàn tất thanh toán gói {plan_name_display}.\n"
                f"• Tên tài khoản: {username}\n"
                f"• Họ tên khi chuyển khoản: {sender_name or 'Chưa cung cấp'}\n"
                f"• Nội dung chuyển khoản: {ref_code}\n"
                f"• Số tiền: {amount_vnd:,} VNĐ"
            )
            data_json = json.dumps({
                "user_id": user_id,
                "username": username,
                "sender_name": sender_name,
                "plan": plan,
                "amount_vnd": amount_vnd,
                "ref_code": ref_code,
            })

            conn.execute(
                "INSERT INTO admin_notifications (type, title, message, data_json, is_read) VALUES ('PAYMENT_UPGRADE', ?, ?, ?, 0)",
                (notif_title, notif_msg, data_json),
            )

            # Also log to security events / system audit log
            conn.execute(
                "INSERT INTO security_events (ip, method, path, user_agent, status_code, reason) VALUES (?, ?, ?, ?, ?, ?)",
                ("127.0.0.1", "POST", "/api/payment/confirm", "Payment System", 200, f"[PAYMENT] Acc: {username} | Tên CK: {sender_name or 'N/A'} | Gói: {plan.upper()} | Ref: {ref_code}"),
            )

            conn.commit()
        return {
            "plan": plan, 
            "role": new_role, 
            "amount_vnd": amount_vnd,
            "username": username,
            "sender_name": sender_name,
            "ref_code": ref_code
        }

    def get_admin_notifications(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Return latest notifications for Dev and SuperAdmin."""
        with self.db.get_connection() as conn:
            rows = conn.execute(
                "SELECT id, type, title, message, data_json, is_read, created_at FROM admin_notifications ORDER BY id DESC LIMIT ?",
                (limit,),
            ).fetchall()
            return [dict(r) for r in rows]

    def mark_notification_read(self, notification_id: int) -> bool:
        with self.db.get_connection() as conn:
            conn.execute("UPDATE admin_notifications SET is_read = 1 WHERE id = ?", (notification_id,))
            conn.commit()
            return True

    def get_user_payments(self, user_id: int) -> List[Dict[str, Any]]:
        with self.db.get_connection() as conn:
            rows = conn.execute(
                "SELECT * FROM payments WHERE user_id = ? ORDER BY id DESC",
                (user_id,),
            ).fetchall()
            return [dict(r) for r in rows]

    # =========================================================================
    # AI Token & Usage Limit Methods (Free = 30 uses, Dev/SuperAdmin/Admin/Pro/Enterprise = Unlimited)
    # =========================================================================
    FREE_AI_REQUEST_LIMIT = 30
    UNLIMITED_AI_ROLES = {"pro", "enterprise", "admin", "superadmin", "dev", "developer", "administrator"}

    def get_user_ai_quota(self, user_id: int) -> Dict[str, Any]:
        """Return AI usage quota status for a user."""
        with self.db.get_connection() as conn:
            user = conn.execute(
                "SELECT id, username, role, is_admin, COALESCE(ai_usage_count, 0) AS ai_usage_count FROM users WHERE id = ?",
                (user_id,),
            ).fetchone()
            if not user:
                return {"unlimited": False, "limit": self.FREE_AI_REQUEST_LIMIT, "used": 0, "remaining": 0, "role": "user"}

            username = (user["username"] or "").strip().lower()
            role = (user["role"] or "user").strip().lower()
            is_admin = bool(user["is_admin"])
            is_unlimited = is_admin or (role in self.UNLIMITED_AI_ROLES) or (username in {"dev", "admin", "superadmin"})
            used = int(user["ai_usage_count"] or 0)

            if is_unlimited:
                return {
                    "unlimited": True,
                    "role": role if role in self.UNLIMITED_AI_ROLES else ("admin" if is_admin else "dev"),
                    "limit": None,
                    "used": used,
                    "remaining": None
                }
            else:
                remaining = max(0, self.FREE_AI_REQUEST_LIMIT - used)
                return {
                    "unlimited": False,
                    "role": role,
                    "limit": self.FREE_AI_REQUEST_LIMIT,
                    "used": used,
                    "remaining": remaining
                }

    def check_and_increment_ai_usage(self, user_id: int) -> Dict[str, Any]:
        """Check AI quota. If free user and exceeds 30, raise PermissionError. Dev/SuperAdmin/Admin/Pro/Enterprise are Unlimited."""
        with self.db.get_connection() as conn:
            user = conn.execute(
                "SELECT id, username, role, is_admin, COALESCE(ai_usage_count, 0) AS ai_usage_count FROM users WHERE id = ?",
                (user_id,),
            ).fetchone()
            if not user:
                raise PermissionError("Tài khoản không tồn tại.")

            username = (user["username"] or "").strip().lower()
            role = (user["role"] or "user").strip().lower()
            is_admin = bool(user["is_admin"])
            is_unlimited = is_admin or (role in self.UNLIMITED_AI_ROLES) or (username in {"dev", "admin", "superadmin"})
            used = int(user["ai_usage_count"] or 0)

            if not is_unlimited:
                if used >= self.FREE_AI_REQUEST_LIMIT:
                    raise PermissionError(
                        f"Bạn đã sử dụng hết {self.FREE_AI_REQUEST_LIMIT} lượt AI miễn phí ({used}/{self.FREE_AI_REQUEST_LIMIT} lượt). "
                        "Vui lòng nâng cấp lên gói Pro Developer hoặc Enterprise để sử dụng AI không giới hạn!"
                    )
                new_used = used + 1
                conn.execute("UPDATE users SET ai_usage_count = ? WHERE id = ?", (new_used, user_id))
                conn.commit()
                return {
                    "unlimited": False,
                    "used": new_used,
                    "remaining": max(0, self.FREE_AI_REQUEST_LIMIT - new_used)
                }
            else:
                new_used = used + 1
                conn.execute("UPDATE users SET ai_usage_count = ? WHERE id = ?", (new_used, user_id))
                conn.commit()
                return {
                    "unlimited": True,
                    "role": role if role in self.UNLIMITED_AI_ROLES else ("admin" if is_admin else "dev"),
                    "used": new_used,
                    "remaining": None
                }

    def reset_ai_usage(self, user_id: int) -> bool:
        """Reset AI usage count to 0 (admin / dev tool)."""
        with self.db.get_connection() as conn:
            conn.execute("UPDATE users SET ai_usage_count = 0 WHERE id = ?", (user_id,))
            conn.commit()
            return True

    # =========================================================================
    # Community Methods
    # =========================================================================
    def can_create_community(self, user_id: int) -> bool:
        """Return True if the user is allowed to create communities."""
        with self.db.get_connection() as conn:
            row = conn.execute("SELECT role FROM users WHERE id = ?", (user_id,)).fetchone()
        if not row:
            return False
        return row["role"] in self.CAN_CREATE_COMMUNITY_ROLES

    def create_community(self, name: str, description: str, privacy_mode: str, created_by: int) -> Dict[str, Any]:
        if not self.can_create_community(created_by):
            raise PermissionError("Bạn cần gói Pro, Enterprise hoặc quyền Admin để tạo Community.")
        privacy_mode = privacy_mode if privacy_mode in ("public", "private") else "public"
        with self.db.get_connection() as conn:
            cursor = conn.execute(
                "INSERT INTO communities (name, description, privacy_mode, created_by) VALUES (?, ?, ?, ?)",
                (name, description, privacy_mode, created_by),
            )
            community_id = cursor.lastrowid
            conn.execute(
                "INSERT INTO community_members (community_id, user_id, role) VALUES (?, ?, 'owner')",
                (community_id, created_by),
            )
            conn.commit()
        return {"id": community_id, "name": name, "description": description, "privacy_mode": privacy_mode}

    def list_communities(self, viewer_user_id: Optional[int] = None, viewer_role: str = "user") -> List[Dict[str, Any]]:
        """
        dev / superadmin see ALL communities.
        Others see public communities + private communities they are a member of.
        """
        with self.db.get_connection() as conn:
            if viewer_role in ("dev", "superadmin"):
                rows = conn.execute("""
                    SELECT c.*, u.username AS owner_name,
                           (SELECT COUNT(*) FROM community_members cm WHERE cm.community_id = c.id) AS member_count
                    FROM communities c
                    LEFT JOIN users u ON u.id = c.created_by
                    ORDER BY c.id DESC
                """).fetchall()
            else:
                rows = conn.execute("""
                    SELECT c.*, u.username AS owner_name,
                           (SELECT COUNT(*) FROM community_members cm WHERE cm.community_id = c.id) AS member_count
                    FROM communities c
                    LEFT JOIN users u ON u.id = c.created_by
                    WHERE c.privacy_mode = 'public'
                       OR EXISTS (
                           SELECT 1 FROM community_members m
                           WHERE m.community_id = c.id AND m.user_id = ?
                       )
                    ORDER BY c.id DESC
                """, (viewer_user_id,)).fetchall()
            return [dict(r) for r in rows]

    def get_community(self, community_id: int) -> Optional[Dict[str, Any]]:
        with self.db.get_connection() as conn:
            row = conn.execute("""
                SELECT c.*, u.username AS owner_name,
                       (SELECT COUNT(*) FROM community_members cm WHERE cm.community_id = c.id) AS member_count
                FROM communities c
                LEFT JOIN users u ON u.id = c.created_by
                WHERE c.id = ?
            """, (community_id,)).fetchone()
            return dict(row) if row else None

    def join_community(self, community_id: int, user_id: int) -> Dict[str, Any]:
        """Join a public community directly or submit a join request for private."""
        community = self.get_community(community_id)
        if not community:
            raise ValueError("Community không tồn tại.")
        with self.db.get_connection() as conn:
            existing = conn.execute(
                "SELECT role FROM community_members WHERE community_id = ? AND user_id = ?",
                (community_id, user_id),
            ).fetchone()
            if existing:
                return {"status": "already_member", "role": existing["role"]}

            if community["privacy_mode"] == "public":
                conn.execute(
                    "INSERT OR IGNORE INTO community_members (community_id, user_id, role) VALUES (?, ?, 'member')",
                    (community_id, user_id),
                )
                conn.commit()
                return {"status": "joined"}
            else:
                existing_req = conn.execute(
                    "SELECT id, status FROM community_requests WHERE community_id = ? AND user_id = ?",
                    (community_id, user_id),
                ).fetchone()
                if existing_req:
                    return {"status": "request_exists", "request_status": existing_req["status"]}
                conn.execute(
                    "INSERT INTO community_requests (community_id, user_id, status) VALUES (?, ?, 'pending')",
                    (community_id, user_id),
                )
                conn.commit()
                return {"status": "pending_request"}

    def list_join_requests(self, community_id: int, reviewer_user_id: int, reviewer_role: str) -> List[Dict[str, Any]]:
        """Return pending join requests. Only community owners/admins and privileged roles can see these."""
        with self.db.get_connection() as conn:
            is_owner = conn.execute(
                "SELECT 1 FROM community_members WHERE community_id = ? AND user_id = ? AND role IN ('owner', 'admin')",
                (community_id, reviewer_user_id),
            ).fetchone()
            if not is_owner and reviewer_role not in self.PRIVILEGED_ROLES:
                raise PermissionError("Không đủ quyền xem danh sách yêu cầu.")
            rows = conn.execute("""
                SELECT cr.id, cr.community_id, cr.user_id, cr.status, cr.created_at,
                       u.username, u.email
                FROM community_requests cr
                JOIN users u ON u.id = cr.user_id
                WHERE cr.community_id = ? AND cr.status = 'pending'
                ORDER BY cr.id ASC
            """, (community_id,)).fetchall()
            return [dict(r) for r in rows]

    def process_join_request(self, request_id: int, status: str, reviewer_user_id: int, reviewer_role: str) -> bool:
        """Approve ('approved') or reject ('rejected') a join request."""
        if status not in ("approved", "rejected"):
            raise ValueError("status phải là 'approved' hoặc 'rejected'.")
        with self.db.get_connection() as conn:
            req = conn.execute(
                "SELECT * FROM community_requests WHERE id = ?", (request_id,)
            ).fetchone()
            if not req:
                raise ValueError("Yêu cầu không tồn tại.")
            is_owner = conn.execute(
                "SELECT 1 FROM community_members WHERE community_id = ? AND user_id = ? AND role IN ('owner', 'admin')",
                (req["community_id"], reviewer_user_id),
            ).fetchone()
            if not is_owner and reviewer_role not in self.PRIVILEGED_ROLES:
                raise PermissionError("Không đủ quyền duyệt yêu cầu.")
            conn.execute(
                "UPDATE community_requests SET status = ? WHERE id = ?",
                (status, request_id),
            )
            if status == "approved":
                conn.execute(
                    "INSERT OR IGNORE INTO community_members (community_id, user_id, role) VALUES (?, ?, 'member')",
                    (req["community_id"], req["user_id"]),
                )
            conn.commit()
            return True

    def list_community_members(self, community_id: int, viewer_user_id: Optional[int], viewer_role: str) -> List[Dict[str, Any]]:
        with self.db.get_connection() as conn:
            community = conn.execute("SELECT privacy_mode FROM communities WHERE id = ?", (community_id,)).fetchone()
            if not community:
                raise ValueError("Community không tồn tại.")
            if community["privacy_mode"] == "private" and viewer_role not in self.PRIVILEGED_ROLES:
                is_member = conn.execute(
                    "SELECT 1 FROM community_members WHERE community_id = ? AND user_id = ?",
                    (community_id, viewer_user_id),
                ).fetchone()
                if not is_member:
                    raise PermissionError("Bạn chưa là thành viên của community này.")
            rows = conn.execute("""
                SELECT cm.user_id, cm.role, cm.joined_at, u.username, u.email, u.avatar_path
                FROM community_members cm
                JOIN users u ON u.id = cm.user_id
                WHERE cm.community_id = ?
                ORDER BY CASE cm.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END, cm.joined_at ASC
            """, (community_id,)).fetchall()
            return [dict(r) for r in rows]

    def delete_community(self, community_id: int, requester_user_id: int, requester_role: str) -> bool:
        with self.db.get_connection() as conn:
            is_owner = conn.execute(
                "SELECT 1 FROM community_members WHERE community_id = ? AND user_id = ? AND role = 'owner'",
                (community_id, requester_user_id),
            ).fetchone()
            if not is_owner and requester_role not in self.PRIVILEGED_ROLES:
                raise PermissionError("Chỉ Owner hoặc Admin hệ thống mới có thể xóa community.")
            conn.execute("DELETE FROM communities WHERE id = ?", (community_id,))
            conn.commit()
            return True

