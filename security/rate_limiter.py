from collections import defaultdict, deque
from dataclasses import dataclass
from time import time
from typing import Dict, Tuple


@dataclass
class RateLimitResult:
    allowed: bool
    limit: int
    remaining: int
    reset_seconds: int
    retry_after: int = 0


class RateLimiter:
    """
    Tiered Intelligent Rate Limiter with Sliding Window algorithm,
    burst protection, and standard RFC 6585 rate-limiting metrics.
    """

    ROUTE_TIERS: Dict[str, Tuple[int, int]] = {
        # prefix: (requests_per_minute, burst_limit_5s)
        "/api/auth/": (15, 5),          # Strict auth protection against brute-force
        "/api/compile": (30, 8),        # Sandbox compile & execution
        "/api/ai/": (30, 8),            # LLM & AI inference
        "/api/admin/": (60, 15),        # Admin control operations
        "global": (120, 25),            # Standard API endpoints
    }

    def __init__(
        self,
        requests_per_minute: int = 120,
        window_seconds: int = 60,
        burst_limit: int = 25,
        burst_window_seconds: int = 5,
    ):
        self.default_rpm = requests_per_minute
        self.window_seconds = window_seconds
        self.default_burst = burst_limit
        self.burst_window_seconds = burst_window_seconds
        self._requests = defaultdict(deque)
        self._route_requests = defaultdict(deque)

    @staticmethod
    def _is_local_dev_ip(client_ip: str) -> bool:
        if not client_ip or client_ip == "unknown":
            return False
        normalized = client_ip.strip().lower()
        return normalized in {"127.0.0.1", "::1", "localhost"} or normalized.startswith("127.")

    def _get_tier_limits(self, route: str) -> Tuple[int, int]:
        for prefix, limits in self.ROUTE_TIERS.items():
            if prefix != "global" and route.startswith(prefix):
                return limits
        return self.ROUTE_TIERS["global"]

    def _clean_expired(self, key: str, now: float, window_seconds: int, bucket: deque) -> None:
        cutoff = now - window_seconds
        while bucket and bucket[0] <= cutoff:
            bucket.popleft()
        if not bucket:
            self._requests.pop(key, None)
            self._route_requests.pop(key, None)

    def check(self, client_ip: str, route: str = "global") -> RateLimitResult:
        rpm_limit, burst_limit = self._get_tier_limits(route)
        ip_key = client_ip or "unknown"
        now = time()

        if self._is_local_dev_ip(client_ip):
            return RateLimitResult(
                allowed=True,
                limit=rpm_limit,
                remaining=rpm_limit,
                reset_seconds=self.window_seconds,
                retry_after=0,
            )

        # Sliding window for 60s
        self._clean_expired(ip_key, now, self.window_seconds, self._requests[ip_key])
        requests = self._requests[ip_key]
        remaining = max(0, rpm_limit - len(requests))
        oldest_ts = requests[0] if requests else now
        reset_seconds = max(1, int(self.window_seconds - (now - oldest_ts)))

        if len(requests) >= rpm_limit:
            return RateLimitResult(
                allowed=False,
                limit=rpm_limit,
                remaining=0,
                reset_seconds=reset_seconds,
                retry_after=reset_seconds,
            )

        # Burst window for 5s
        route_key = f"{ip_key}:{route or 'global'}"
        self._clean_expired(route_key, now, self.burst_window_seconds, self._route_requests[route_key])
        route_requests = self._route_requests[route_key]

        if len(route_requests) >= burst_limit:
            burst_oldest = route_requests[0] if route_requests else now
            burst_retry = max(1, int(self.burst_window_seconds - (now - burst_oldest)))
            return RateLimitResult(
                allowed=False,
                limit=burst_limit,
                remaining=0,
                reset_seconds=burst_retry,
                retry_after=burst_retry,
            )

        # Record valid request
        requests.append(now)
        route_requests.append(now)

        return RateLimitResult(
            allowed=True,
            limit=rpm_limit,
            remaining=max(0, rpm_limit - len(requests)),
            reset_seconds=reset_seconds,
            retry_after=0,
        )

    def allow(self, client_ip: str, route: str = "global") -> bool:
        return self.check(client_ip, route).allowed
