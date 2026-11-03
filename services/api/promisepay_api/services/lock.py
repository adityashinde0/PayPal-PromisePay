"""Distributed Locking (Redlock) and 24-Hour Idempotency Cache."""

import asyncio
import logging
import time
from typing import Any, Dict, Optional

from promisepay_api.config import settings

logger = logging.getLogger("promisepay-lock")

try:
    import redis.asyncio as aioredis
except ImportError:
    aioredis = None


class DistributedLockManager:
    """Provides distributed locks across payments, captures, and refunds.

    Uses Redis Redlock when available, and falls back to an asyncio Lock
    registry for hermetic testing or when Redis is offline.
    """

    def __init__(self):
        self._redis_client: Optional[Any] = None
        self._local_locks: Dict[str, asyncio.Lock] = {}
        self._idempotency_cache: Dict[str, Dict[str, Any]] = {}

    async def get_redis(self):
        if settings.app_env.lower() in ("test",) or not settings.redis_url or settings.redis_url == "disabled":
            return None
        if self._redis_client is None and aioredis:
            try:
                client = aioredis.from_url(
                    settings.redis_url,
                    socket_connect_timeout=0.1,
                    decode_responses=True,
                )
                await asyncio.wait_for(client.ping(), timeout=0.1)
                self._redis_client = client
                logger.info("Connected to Redis distributed lock manager at %s", settings.redis_url)
            except Exception:
                self._redis_client = False
        return self._redis_client if self._redis_client else None

    async def acquire_lock(self, lock_key: str, ttl_seconds: int = 15) -> bool:
        """Acquires a distributed lock. Returns True if acquired, False otherwise."""
        redis = await self.get_redis()
        if redis:
            try:
                res = await redis.set(f"lock:{lock_key}", "1", ex=ttl_seconds, nx=True)
                return bool(res)
            except Exception as e:
                logger.warning("Redis lock acquisition error for %s: %s", lock_key, e)

        # Fallback to local asyncio lock
        if lock_key not in self._local_locks:
            self._local_locks[lock_key] = asyncio.Lock()
        lock = self._local_locks[lock_key]
        if lock.locked():
            return False
        await lock.acquire()
        return True

    async def release_lock(self, lock_key: str) -> None:
        """Releases the distributed lock."""
        redis = await self.get_redis()
        if redis:
            try:
                await redis.delete(f"lock:{lock_key}")
                return
            except Exception as e:
                logger.warning("Redis lock release error for %s: %s", lock_key, e)

        # Fallback release
        if lock_key in self._local_locks:
            lock = self._local_locks[lock_key]
            if lock.locked():
                lock.release()

    async def get_idempotency_result(self, key: str) -> Optional[Dict[str, Any]]:
        """Retrieves cached result for an idempotency key (24-hour TTL)."""
        redis = await self.get_redis()
        if redis:
            try:
                import json
                val = await redis.get(f"idempotency:{key}")
                if val:
                    return json.loads(val)
            except Exception:
                pass

        cached = self._idempotency_cache.get(key)
        if cached and time.time() < cached["expires_at"]:
            return cached["data"]
        return None

    async def set_idempotency_result(
        self, key: str, data: Dict[str, Any], ttl_seconds: int = 86400
    ) -> None:
        """Persists idempotency key result with 24-hour TTL in Redis."""
        redis = await self.get_redis()
        if redis:
            try:
                import json
                await redis.set(f"idempotency:{key}", json.dumps(data), ex=ttl_seconds)
                return
            except Exception:
                pass

        self._idempotency_cache[key] = {
            "data": data,
            "expires_at": time.time() + ttl_seconds,
        }


lock_manager = DistributedLockManager()
