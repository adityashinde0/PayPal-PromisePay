"""Enterprise Token-Bucket & Sliding Window Rate Limiter.

Protects public API endpoints and expensive AI verification routes from
brute-force attacks, DDoS, and token-cost exhaustion.
Backed by Redis when available, with in-memory sliding-window fallback.
"""

import logging
import time
from typing import Dict, List, Tuple

from promisepay_api.services.queue import get_redis_client

logger = logging.getLogger("promisepay-rate-limiter")

# Local in-memory fallback state: {client_key: [(timestamp, count)]}
_memory_buckets: Dict[str, List[float]] = {}


class RateLimiter:
    """Sliding-window rate limiter with Redis backend and in-memory fallback."""

    def __init__(self, default_rate: int = 120, default_window_seconds: int = 60):
        self.default_rate = default_rate
        self.default_window = default_window_seconds

    async def is_allowed(
        self,
        key: str,
        max_requests: int = 120,
        window_seconds: int = 60,
    ) -> Tuple[bool, int, int]:
        """Checks if a request under `key` is allowed within `window_seconds`.

        Returns:
            Tuple[bool, int, int]: (is_allowed, remaining_quota, reset_seconds)
        """
        now = time.time()
        redis = await get_redis_client()

        if redis:
            try:
                redis_key = f"rate_limit:{key}"
                pipe = redis.pipeline()
                # Remove timestamps older than window
                pipe.zremrangebyscore(redis_key, 0, now - window_seconds)
                # Count elements in current window
                pipe.zcard(redis_key)
                # Add current request timestamp
                pipe.zadd(redis_key, {str(now): now})
                # Expire bucket after window
                pipe.expire(redis_key, window_seconds)
                results = await pipe.execute()

                current_count = results[1]
                if current_count >= max_requests:
                    return False, 0, window_seconds

                remaining = max(0, max_requests - current_count - 1)
                return True, remaining, window_seconds
            except Exception as exc:
                logger.warning("Redis rate limiter error, using in-memory fallback: %s", exc)

        # In-memory sliding-window fallback
        timestamps = _memory_buckets.get(key, [])
        cutoff = now - window_seconds
        valid_timestamps = [t for t in timestamps if t > cutoff]

        if len(valid_timestamps) >= max_requests:
            _memory_buckets[key] = valid_timestamps
            reset_in = int(window_seconds - (now - valid_timestamps[0]))
            return False, 0, max(1, reset_in)

        valid_timestamps.append(now)
        _memory_buckets[key] = valid_timestamps
        remaining = max_requests - len(valid_timestamps)
        return True, remaining, window_seconds


rate_limiter = RateLimiter()
