import asyncio
import re
from typing import Optional, Set

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from backend.database.db import DatabaseManager, MemoryStore
from security.rate_limiter import RateLimiter
from security.sentinel_bot import sentinel_bot
from security.validator import (
    detect_command_injection,
    detect_lfi_rfi,
    detect_nosqli,
    detect_sqli,
    detect_ssrf,
    detect_ssti,
    detect_xss,
    is_honeypot_path,
)


class SecurityMiddleware(BaseHTTPMiddleware):
    """
    Unified 7-Layer Enterprise Security & Sentinel Defense Bot Middleware:
    1. Dev-Immunity Enforcement (Devs are exempt from threat scoring and restrictions)
    2. Privilege Escalation & Unauthorized DEV API Probe Interception
    3. WAF & Honeypot Decoy Trap Countermeasures
    4. Bot & Automated Threat Scanner Blocker
    5. Deep Payload Inspection (SQLi, NoSQLi, XSS, SSRF, SSTI, LFI/RFI, Command Injection)
    6. Threat Scoring & Progressive Auto-Ban + Tarpitting
    7. Multi-Tier Rate Limiting & Hardened Security Headers
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
        "ffuf",
        "hydra",
        "burpcollaboration",
        "metasploit",
        "nuclei",
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
        self.db_manager = DatabaseManager(db_path)
        self.db = MemoryStore(self.db_manager)
        sentinel_bot.db = self.db_manager
        self.allowed_origins = allowed_origins or set()

    @staticmethod
    def _is_local_dev_ip(client_ip: str) -> bool:
        if not client_ip or client_ip == "unknown":
            return False
        normalized = client_ip.strip().lower()
        return normalized in {"127.0.0.1", "::1", "localhost", "testclient"} or normalized.startswith("127.")

    @staticmethod
    def _contains_blocked_pattern(value: str, patterns) -> bool:
        lowered = value.lower()
        return any(pattern.lower() in lowered for pattern in patterns)

    def _extract_user_from_token(self, request: Request) -> Optional[dict]:
        auth_header = request.headers.get("authorization", "")
        if auth_header.lower().startswith("bearer "):
            token = auth_header[7:].strip()
            if token:
                try:
                    return self.db.get_user_by_token(token)
                except Exception:
                    pass
        return None

    def _add_security_headers(self, response, rate_result=None):
        if rate_result:
            response.headers["X-RateLimit-Limit"] = str(rate_result.limit)
            response.headers["X-RateLimit-Remaining"] = str(rate_result.remaining)
            response.headers["X-RateLimit-Reset"] = str(rate_result.reset_seconds)

        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        response.headers["X-Robots-Tag"] = "noindex, nofollow, noarchive, nosnippet, noimageindex"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self' 'unsafe-inline' 'unsafe-eval' https: data: blob:; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://fonts.googleapis.com; "
            "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://fonts.googleapis.com https://cdn.jsdelivr.net; "
            "font-src 'self' data: https://cdnjs.cloudflare.com https://fonts.gstatic.com https://fonts.googleapis.com https://cdn.jsdelivr.net; "
            "img-src 'self' data: https: blob:; "
            "media-src 'self' data: blob:; "
            "connect-src 'self' http://127.0.0.1:* http://localhost:* https: ws: wss:; "
            "worker-src 'self' blob: data: https://cdnjs.cloudflare.com https://cdn.jsdelivr.net; "
            "child-src 'self' blob: data: https://cdnjs.cloudflare.com https://cdn.jsdelivr.net; "
            "frame-ancestors 'none'; "
            "base-uri 'self';"
        )

    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host if request.client else "unknown"
        route = request.url.path
        user_agent = request.headers.get("user-agent", "")
        action = request.method
        query_string = request.url.query or ""

        # ── LAYER 0.5: Dangerous Method & Null Byte Sanitizer ──────────────
        if action.upper() in {"TRACE", "TRACK", "CONNECT", "DEBUG"}:
            return JSONResponse(status_code=405, content={"detail": "HTTP Method Not Allowed by Security Sentinel."})

        if "%00" in route or "\x00" in route or "..%2f" in route.lower() or "..%5c" in route.lower():
            self.db.log_security_event(
                ip=client_ip,
                method=action,
                path=route,
                user_agent=user_agent,
                status_code=400,
                reason="null_byte_path_traversal_blocked",
            )
            return JSONResponse(status_code=400, content={"detail": "Bad Request: Malformed path encoding."})

        # ── LAYER 0: Dev-Immunity Rule & User Context ──────────────────────
        user = self._extract_user_from_token(request)
        is_dev = sentinel_bot.is_dev_exempt(user=user)

        if is_dev:
            # Dev user is strictly exempt from threat evaluations and rate limits
            response = await call_next(request)
            self._add_security_headers(response)
            return response

        # ── LAYER 1: Privilege Escalation & Unauthorized DEV Probes ────────
        is_priv_violation, priv_reason = sentinel_bot.skill_detect_privilege_escalation(
            ip=client_ip,
            path=route,
            method=action,
            user=user,
        )
        if is_priv_violation:
            self.db.log_security_event(
                ip=client_ip,
                method=action,
                path=route,
                user_agent=user_agent,
                status_code=403,
                reason="privilege_escalation_blocked",
            )
            return JSONResponse(status_code=403, content={"detail": priv_reason})

        # ── LAYER 2: Sentinel IP Blacklist & Tarpitting Check ───────────────
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
                content={"detail": "Địa chỉ IP đang trong thời gian tạm khóa an ninh bởi Sentinel Defense Bot. Vui lòng thử lại sau."},
                headers={"Retry-After": "300"},
            )

        # ── LAYER 3: Honeypot Decoy Traps ──────────────────────────────────
        if is_honeypot_path(route):
            self.db.log_security_event(
                ip=client_ip,
                method=action,
                path=route,
                user_agent=user_agent,
                status_code=403,
                reason="honeypot_decoy_trap_triggered",
            )
            if not self._is_local_dev_ip(client_ip):
                sentinel_bot.skill_honeypot_trap(
                    ip=client_ip,
                    method=action,
                    path=route,
                    user_agent=user_agent,
                    payload=query_string,
                )
            return JSONResponse(
                status_code=403,
                content={"detail": "Forbidden: Decoy resource access restricted by Sentinel Shield Bot."},
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
                sentinel_bot.skill_evaluate_and_react(
                    ip=client_ip,
                    event_type="waf_blocked_path_probe",
                    path=route,
                    user_agent=user_agent,
                    details=f"Path probe blocked: {route}",
                    user=user,
                )
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
                sentinel_bot.skill_evaluate_and_react(
                    ip=client_ip,
                    event_type="automated_scanner_blocked",
                    path=route,
                    user_agent=user_agent,
                    details=f"Scanner user-agent: {user_agent}",
                    user=user,
                )
            return JSONResponse(status_code=403, content={"detail": "Security scanner activity blocked by Sentinel Bot."})

        # ── LAYER 4: Deep Injection Inspection (SQLi, NoSQLi, XSS, SSRF, SSTI, LFI, CMD)
        if query_string:
            is_malicious = (
                detect_sqli(query_string)
                or detect_nosqli(query_string)
                or detect_command_injection(query_string)
                or detect_xss(query_string)
                or detect_ssrf(query_string)
                or detect_ssti(query_string)
                or detect_lfi_rfi(query_string)
            )
            if is_malicious:
                self.db.log_security_event(
                    ip=client_ip,
                    method=action,
                    path=route,
                    user_agent=user_agent,
                    status_code=403,
                    reason="malicious_query_injection",
                )
                if not self._is_local_dev_ip(client_ip):
                    sentinel_bot.skill_evaluate_and_react(
                        ip=client_ip,
                        event_type="malicious_query_injection",
                        path=route,
                        user_agent=user_agent,
                        details=f"Query payload signature detected in {query_string[:100]}",
                        user=user,
                    )
                return JSONResponse(status_code=403, content={"detail": "Malicious payload signature detected in query."})

        # ── LAYER 5: Intelligent Rate Limiting with RFC 6585 Headers ───────
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
                sentinel_bot.skill_evaluate_and_react(
                    ip=client_ip,
                    event_type="rate_limit_exceeded",
                    path=route,
                    user_agent=user_agent,
                    details=f"Rate limit exceeded on {route}",
                    user=user,
                )
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

        # ── LAYER 6: Payload Size Enforcement ──────────────────────────────
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

        # ── Tarpit Throttle Delay for suspicious IPs (Score >= 30) ──────────
        if not self._is_local_dev_ip(client_ip):
            threat_rec = sentinel_bot.threat_cache.get(client_ip)
            if threat_rec and threat_rec.get("score", 0) >= sentinel_bot.THRESHOLD_WARNING:
                await asyncio.sleep(0.5)  # Slow down scanner tools

        # ── Pass to Application Pipeline ───────────────────────────────────
        response = await call_next(request)

        # ── LAYER 7: Hardened HTTP Security Headers & RateLimit Telemetry ──
        self._add_security_headers(response, rate_result)

        return response
