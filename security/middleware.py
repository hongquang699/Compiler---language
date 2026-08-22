from typing import Optional

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from backend.database.db import DatabaseManager, MemoryStore
from security.rate_limiter import RateLimiter


class SecurityMiddleware(BaseHTTPMiddleware):
    BLOCKED_PATH_PATTERNS = (
        "/db",
        "/database",
        "/sqlite",
        "/.git",
        "/debug",
        "/phpmyadmin",
        "/mysql",
        "/postgres",
        "/mongodb",
        "..",
    )
    BLOCKED_QUERY_PATTERNS = (
        "sqlite",
        "database",
        "drop table",
        "union select",
        "select * from",
        "delete from",
        "update users",
        "grant all",
        "load_file",
        "into outfile",
        "information_schema",
    )

    def __init__(
        self,
        app,
        rate_limiter: Optional[RateLimiter] = None,
        requests_per_minute: int = 100,
        max_request_size: int = 10 * 1024 * 1024,
        db_path: str = "data/memory.db",
        block_minutes: int = 10,
    ):
        super().__init__(app)
        self.rate_limiter = rate_limiter or RateLimiter(
            requests_per_minute=requests_per_minute,
            window_seconds=60,
            burst_limit=20,
            burst_window_seconds=5,
        )
        self.max_request_size = max_request_size
        self.block_minutes = block_minutes
        self.db = MemoryStore(DatabaseManager(db_path))

    @staticmethod
    def _contains_blocked_pattern(value: str, patterns) -> bool:
        lowered = value.lower()
        return any(pattern.lower() in lowered for pattern in patterns)

    @staticmethod
    def _is_local_dev_ip(client_ip: str) -> bool:
        if not client_ip or client_ip == "unknown":
            return False
        normalized = client_ip.strip().lower()
        return normalized in {"127.0.0.1", "::1", "localhost"} or normalized.startswith("127.")

    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host if request.client else "unknown"
        route = request.url.path
        user_agent = request.headers.get("user-agent", "")
        action = request.method

        if self._is_local_dev_ip(client_ip):
            # Local development is always allowed; security checks still run for suspicious paths and payloads.
            pass
        elif self.db.is_ip_blocked(client_ip):
            self.db.log_security_event(
                ip=client_ip,
                method=action,
                path=route,
                user_agent=user_agent,
                status_code=429,
                reason="blocked_ip",
            )
            return JSONResponse(
                status_code=429,
                content={"detail": "IP đã bị khóa vì spam hoặc truy cập bất thường. Vui lòng thử lại sau 5-10 phút."},
            )

        if self._contains_blocked_pattern(route, self.BLOCKED_PATH_PATTERNS):
            self.db.log_security_event(
                ip=client_ip,
                method=action,
                path=route,
                user_agent=user_agent,
                status_code=403,
                reason="blocked_path",
            )
            if not self._is_local_dev_ip(client_ip):
                self.db.block_ip(client_ip, "blocked_path", minutes=self.block_minutes)
            return JSONResponse(status_code=403, content={"detail": "Blocked path."})

        query_string = request.url.query or ""
        if self._contains_blocked_pattern(query_string, self.BLOCKED_QUERY_PATTERNS):
            self.db.log_security_event(
                ip=client_ip,
                method=action,
                path=route,
                user_agent=user_agent,
                status_code=403,
                reason="suspicious_db_probe",
            )
            if not self._is_local_dev_ip(client_ip):
                self.db.block_ip(client_ip, "suspicious_db_probe", minutes=self.block_minutes)
            return JSONResponse(status_code=403, content={"detail": "Suspicious database access attempt blocked."})

        if not self._is_local_dev_ip(client_ip) and not self.rate_limiter.allow(client_ip, route):
            self.db.block_ip(client_ip, "rate_limit_exceeded", minutes=self.block_minutes)
            self.db.log_security_event(
                ip=client_ip,
                method=action,
                path=route,
                user_agent=user_agent,
                status_code=429,
                reason="rate_limit_exceeded",
            )
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many requests. Please slow down and avoid automated spam."},
            )

        content_length = request.headers.get("content-length")
        if content_length is not None:
            try:
                if int(content_length) > self.max_request_size:
                    self.db.log_security_event(
                        ip=client_ip,
                        method=action,
                        path=route,
                        user_agent=user_agent,
                        status_code=413,
                        reason="request_too_large",
                    )
                    if not self._is_local_dev_ip(client_ip):
                        self.db.block_ip(client_ip, "request_too_large", minutes=self.block_minutes)
                    return JSONResponse(
                        status_code=413,
                        content={"detail": "Request body is too large."},
                    )
            except ValueError:
                pass

        low_entropy_bot = (
            request.method in {"POST", "PUT", "DELETE", "PATCH"}
            and (
                not user_agent
                or len(user_agent) < 8
                or user_agent.lower().startswith("curl/")
                or user_agent.lower().startswith("python-requests/")
            )
        )
        if low_entropy_bot:
            self.db.log_security_event(
                ip=client_ip,
                method=action,
                path=route,
                user_agent=user_agent,
                status_code=403,
                reason="anti_automation_detected",
            )
            if not self._is_local_dev_ip(client_ip):
                self.db.block_ip(client_ip, "anti_automation_detected", minutes=self.block_minutes)
            return JSONResponse(status_code=403, content={"detail": "Automation is not allowed."})

        if (
            request.method in {"POST", "PUT", "DELETE", "PATCH"}
            and not self._is_local_dev_ip(client_ip)
            and route.startswith("/api")
            and not request.headers.get("origin")
        ):
            self.db.log_security_event(
                ip=client_ip,
                method=action,
                path=route,
                user_agent=user_agent,
                status_code=403,
                reason="csrf_missing_origin",
            )
            return JSONResponse(status_code=403, content={"detail": "Missing Origin header for sensitive request."})

        response = await call_next(request)

        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' "
            "https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://fonts.googleapis.com https://fonts.gstatic.com; "
            "style-src 'self' 'unsafe-inline' "
            "https://cdnjs.cloudflare.com https://fonts.googleapis.com; "
            "font-src 'self' data: https://cdnjs.cloudflare.com https://fonts.gstatic.com https://fonts.googleapis.com; "
            "img-src 'self' data: https:; "
            "media-src 'self' data: blob:; "
            "connect-src 'self' http://127.0.0.1:8000 https:; "
            "worker-src 'self' blob:; "
            "frame-ancestors 'none'; "
            "object-src 'none'; "
            "base-uri 'self'"
        )

        return response
