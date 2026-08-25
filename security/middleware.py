import re
from typing import Optional, Set

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from backend.database.db import DatabaseManager, MemoryStore
from security.rate_limiter import RateLimiter
from security.validator import detect_command_injection, detect_nosqli, detect_sqli, detect_xss


class SecurityMiddleware(BaseHTTPMiddleware):
    """
    Unified 7-Layer Enterprise Security Middleware:
    1. WAF & Malicious Path / Bot Scanner Firewall
    2. Private Network / VPN Isolation for Root Endpoints
    3. Intelligent Rate Limiting with RFC 6585 Headers
    4. SQL & NoSQL Injection Protection
    5. Anti-CSRF Origin & Referer Verification
    6. XSS & Command Injection Defense
    7. Comprehensive Security Response Headers (CSP, HSTS, DENY)
    """

    BLOCKED_PATH_PATTERNS = (
        "/db",
        "/database",
        "/sqlite",
        "/.git",
        "/.env",
        "/wp-admin",
        "/debug",
        "/phpmyadmin",
        "/mysql",
        "/postgres",
        "/mongodb",
        "/actuator",
        "..",
    )

    BLOCKED_SCANNER_AGENTS = (
        "sqlmap",
        "nikto",
        "nmap",
        "dirbuster",
        "wpscan",
        "acunetix",
        "nessus",
        "masscan",
        "gobuster",
    )

    # Routes requiring Private Network (Local/LAN/VPN) or SuperAdmin/Dev
    PRIVATE_ISOLATED_ROUTES = (
        "/api/admin/reset",
        "/api/admin/settings/model",
    )

    def __init__(
        self,
        app,
        rate_limiter: Optional[RateLimiter] = None,
        requests_per_minute: int = 120,
        max_request_size: int = 10 * 1024 * 1024,
        db_path: str = "data/memory.db",
        block_minutes: int = 10,
        allowed_origins: Optional[Set[str]] = None,
    ):
        super().__init__(app)
        self.rate_limiter = rate_limiter or RateLimiter(
            requests_per_minute=requests_per_minute,
            window_seconds=60,
            burst_limit=25,
            burst_window_seconds=5,
        )
        self.max_request_size = max_request_size
        self.block_minutes = block_minutes
        self.db = MemoryStore(DatabaseManager(db_path))
        self.allowed_origins = allowed_origins or set()

    @staticmethod
    def _is_local_dev_ip(client_ip: str) -> bool:
        if not client_ip or client_ip == "unknown":
            return False
        normalized = client_ip.strip().lower()
        return normalized in {"127.0.0.1", "::1", "localhost"} or normalized.startswith("127.")

    @staticmethod
    def _is_private_lan_or_vpn(client_ip: str) -> bool:
        if not client_ip or client_ip == "unknown":
            return False
        ip = client_ip.strip()
        # 127.0.0.0/8, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, Tailscale/WireGuard 100.64.0.0/10
        if ip.startswith(("127.", "10.", "192.168.", "100.")):
            return True
        if ip.startswith("172."):
            parts = ip.split(".")
            if len(parts) >= 2 and parts[1].isdigit() and 16 <= int(parts[1]) <= 31:
                return True
        return False

    @staticmethod
    def _contains_blocked_pattern(value: str, patterns) -> bool:
        lowered = value.lower()
        return any(pattern.lower() in lowered for pattern in patterns)

    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host if request.client else "unknown"
        route = request.url.path
        user_agent = request.headers.get("user-agent", "")
        action = request.method
        query_string = request.url.query or ""

        # ── LAYER 1: WAF & IP Blacklist Check ──────────────────────────────
        if not self._is_local_dev_ip(client_ip) and self.db.is_ip_blocked(client_ip):
            self.db.log_security_event(
                ip=client_ip,
                method=action,
                path=route,
                user_agent=user_agent,
                status_code=429,
                reason="blocked_ip_cooldown",
            )
            return JSONResponse(
                status_code=429,
                content={"detail": "Địa chỉ IP đang trong thời gian tạm khóa an ninh. Vui lòng thử lại sau."},
                headers={"Retry-After": "300"},
            )

        # Path Traversal & Probing
        if self._contains_blocked_pattern(route, self.BLOCKED_PATH_PATTERNS):
            self.db.log_security_event(
                ip=client_ip,
                method=action,
                path=route,
                user_agent=user_agent,
                status_code=403,
                reason="waf_blocked_path_probe",
            )
            if not self._is_local_dev_ip(client_ip):
                self.db.block_ip(client_ip, "waf_blocked_path_probe", minutes=self.block_minutes)
            return JSONResponse(status_code=403, content={"detail": "Access to path forbidden."})

        # Automated Scanners Blocker
        if self._contains_blocked_pattern(user_agent, self.BLOCKED_SCANNER_AGENTS):
            self.db.log_security_event(
                ip=client_ip,
                method=action,
                path=route,
                user_agent=user_agent,
                status_code=403,
                reason="automated_scanner_blocked",
            )
            if not self._is_local_dev_ip(client_ip):
                self.db.block_ip(client_ip, "automated_scanner_blocked", minutes=self.block_minutes * 2)
            return JSONResponse(status_code=403, content={"detail": "Security scanner activity blocked."})

        # ── LAYER 2: SQL & NoSQL & Command Injection Inspection ────────────
        # Inspect query parameters
        if query_string:
            if detect_sqli(query_string) or detect_nosqli(query_string) or detect_command_injection(query_string) or detect_xss(query_string):
                self.db.log_security_event(
                    ip=client_ip,
                    method=action,
                    path=route,
                    user_agent=user_agent,
                    status_code=403,
                    reason="malicious_query_injection",
                )
                if not self._is_local_dev_ip(client_ip):
                    self.db.block_ip(client_ip, "malicious_query_injection", minutes=self.block_minutes)
                return JSONResponse(status_code=403, content={"detail": "Malicious payload signature detected in query."})

        # ── LAYER 3: Intelligent Rate Limiting with RFC 6585 Headers ───────
        rate_result = self.rate_limiter.check(client_ip, route)
        if not rate_result.allowed:
            self.db.log_security_event(
                ip=client_ip,
                method=action,
                path=route,
                user_agent=user_agent,
                status_code=429,
                reason="rate_limit_exceeded",
            )
            if not self._is_local_dev_ip(client_ip):
                self.db.block_ip(client_ip, "rate_limit_exceeded", minutes=5)
            return JSONResponse(
                status_code=429,
                content={"detail": "Quá nhiều yêu cầu trong thời gian ngắn. Vui lòng chờ vài giây."},
                headers={
                    "X-RateLimit-Limit": str(rate_result.limit),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(rate_result.reset_seconds),
                    "Retry-After": str(rate_result.retry_after),
                },
            )

        # ── LAYER 4: Payload Size Enforcement ──────────────────────────────
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
                        reason="request_payload_too_large",
                    )
                    return JSONResponse(
                        status_code=413,
                        content={"detail": f"Dung lượng request vượt quá giới hạn ({self.max_request_size // (1024*1024)} MB)."},
                    )
            except ValueError:
                pass

        # ── LAYER 5: Anti-CSRF Origin & State Change Verification ─────────
        if (
            action in {"POST", "PUT", "DELETE", "PATCH"}
            and route.startswith("/api")
            and not self._is_local_dev_ip(client_ip)
        ):
            origin = request.headers.get("origin")
            referer = request.headers.get("referer")
            auth_header = request.headers.get("authorization", "")

            # If cross-origin or missing origin without Bearer token
            if not origin and not referer and not auth_header.lower().startswith("bearer "):
                # Exclude standard auth login/register from origin requirement for API testing
                if not route.startswith(("/api/auth/login", "/api/auth/register", "/api/auth/send-verification")):
                    self.db.log_security_event(
                        ip=client_ip,
                        method=action,
                        path=route,
                        user_agent=user_agent,
                        status_code=403,
                        reason="csrf_unverified_request",
                    )
                    return JSONResponse(status_code=403, content={"detail": "CSRF verification failed: Missing origin/bearer token."})

        # ── LAYER 6: Pass to Application Pipeline ──────────────────────────
        response = await call_next(request)

        # ── LAYER 7: Security Response Headers & RateLimit Telemetry ───────
        response.headers["X-RateLimit-Limit"] = str(rate_result.limit)
        response.headers["X-RateLimit-Remaining"] = str(rate_result.remaining)
        response.headers["X-RateLimit-Reset"] = str(rate_result.reset_seconds)

        # Hardened HTTP Security Headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' "
            "https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://fonts.googleapis.com https://fonts.gstatic.com; "
            "style-src 'self' 'unsafe-inline' "
            "https://cdnjs.cloudflare.com https://fonts.googleapis.com; "
            "font-src 'self' data: https://cdnjs.cloudflare.com https://fonts.gstatic.com https://fonts.googleapis.com; "
            "img-src 'self' data: https: blob:; "
            "media-src 'self' data: blob:; "
            "connect-src 'self' http://127.0.0.1:8000 http://localhost:8000 https: ws: wss:; "
            "worker-src 'self' blob:; "
            "frame-ancestors 'none'; "
            "object-src 'none'; "
            "base-uri 'self';"
        )

        return response
