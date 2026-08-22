import sqlite3
import json
import os
import hashlib
import secrets
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime

class DatabaseManager:
    def __init__(self, db_path: str = "data/memory.db"):
        self.db_path = db_path
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
        self._init_db()

    def get_connection(self):
        conn = sqlite3.connect(self.db_path, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        return conn

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
                    FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE CASCADE
                )
            """)
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
            self._add_column_if_missing(cursor, "users", "email", "TEXT")
            conn.commit()
            self._ensure_default_admin()

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
            digest = hashlib.pbkdf2_hmac("sha256", admin_password.encode(), salt, 120000).hex()
            conn.execute(
                "INSERT INTO users (username, email, password_hash, role, is_admin) VALUES (?, ?, ?, 'admin', 1)",
                (admin_username, "admin@local.cp", f"{salt.hex()}${digest}"),
            )
            conn.commit()

    @staticmethod
    def hash_password(password: str, salt: Optional[bytes] = None) -> str:
        salt_bytes = salt or secrets.token_bytes(16)
        digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt_bytes, 120000).hex()
        return f"{salt_bytes.hex()}${digest}"

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
            row = conn.execute("SELECT id, username, email, password_hash, role, is_admin FROM users WHERE username = ? OR email = ?", (login, login.lower())).fetchone()
        if not row:
            return None
        salt, expected = row["password_hash"].split("$", 1)
        actual = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), 120000).hex()
        if not secrets.compare_digest(actual, expected):
            return None
        return {
            "id": row["id"],
            "username": row["username"],
            "email": row["email"],
            "role": row["role"] or ("admin" if row["is_admin"] else "user"),
            "is_admin": bool(row["is_admin"]),
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
                "SELECT users.id, users.username, users.email, users.role, users.is_admin FROM auth_tokens JOIN users ON users.id = auth_tokens.user_id WHERE auth_tokens.token = ? AND (auth_tokens.expires_at IS NULL OR auth_tokens.expires_at > CURRENT_TIMESTAMP)",
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

    def get_member_detail(self, user_id: int) -> Optional[Dict[str, Any]]:
        with self.db.get_connection() as conn:
            user = conn.execute(
                "SELECT id, username, role, is_admin, created_at FROM users WHERE id = ?",
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
            return {
                "user": {
                    "id": user["id"],
                    "username": user["username"],
                    "role": user["role"] or ("admin" if user["is_admin"] else "user"),
                    "is_admin": bool(user["is_admin"]),
                    "created_at": user["created_at"],
                },
                "sessions": [dict(r) for r in sessions],
                "solved_problems": [dict(r) for r in solved],
                "ips": self.list_user_ips(user_id),
            }

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

    def get_overview(self) -> Dict[str, Any]:
        with self.db.get_connection() as conn:
            member_count = conn.execute("SELECT COUNT(*) AS cnt FROM users").fetchone()["cnt"]
            admin_count = conn.execute("SELECT COUNT(*) AS cnt FROM users WHERE is_admin = 1").fetchone()["cnt"]
            session_count = conn.execute("SELECT COUNT(*) AS cnt FROM sessions").fetchone()["cnt"]
            solved_count = conn.execute("SELECT COUNT(*) AS cnt FROM solved_problems").fetchone()["cnt"]
            return {
                "total_members": member_count,
                "admin_count": admin_count,
                "total_sessions": session_count,
                "total_saved_problems": solved_count,
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
