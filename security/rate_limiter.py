from collections import defaultdict, deque
from time import time


class RateLimiter:
    def __init__(
        self,
        requests_per_minute: int = 100,
        window_seconds: int = 60,
        burst_limit: int = 20,
        burst_window_seconds: int = 5,
    ):
        self.requests_per_minute = requests_per_minute
        self.window_seconds = window_seconds
        self.burst_limit = burst_limit
        self.burst_window_seconds = burst_window_seconds
        self._requests = defaultdict(deque)
        self._route_requests = defaultdict(deque)

    @staticmethod
    def _is_local_dev_ip(client_ip: str) -> bool:
        if not client_ip or client_ip == "unknown":
            return False
        normalized = client_ip.strip().lower()
        return normalized in {"127.0.0.1", "::1", "localhost"} or normalized.startswith("127.")

    def _clean_expired(self, key: str, now: float, window_seconds: int, bucket: deque) -> None:
        cutoff = now - window_seconds
        while bucket and bucket[0] <= cutoff:
            bucket.popleft()
        if not bucket:
            self._requests.pop(key, None)
            self._route_requests.pop(key, None)

    def allow(self, client_ip: str, route: str = "global") -> bool:
        if self._is_local_dev_ip(client_ip):
            return True

        now = time()
        ip_key = client_ip or "unknown"

        self._clean_expired(ip_key, now, self.window_seconds, self._requests[ip_key])
        requests = self._requests[ip_key]
        if len(requests) >= self.requests_per_minute:
            return False
        requests.append(now)

        route_key = f"{ip_key}:{route or 'global'}"
        self._clean_expired(route_key, now, self.burst_window_seconds, self._route_requests[route_key])
        route_requests = self._route_requests[route_key]
        if len(route_requests) >= self.burst_limit:
            return False
        route_requests.append(now)

        return True
