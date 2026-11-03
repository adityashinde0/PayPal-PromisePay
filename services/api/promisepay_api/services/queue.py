"""Asynchronous Distributed Job Queue for Verification Jobs."""

import asyncio
import json
import logging
from typing import Any, Dict, Optional

from promisepay_api.config import settings

logger = logging.getLogger("promisepay-queue")

try:
    import redis.asyncio as aioredis
except ImportError:
    aioredis = None


class VerificationJobQueue:
    """Distributed job queue backed by Redis with in-memory asyncio fallback."""

    QUEUE_KEY = "promisepay:verification_jobs"
    STATUS_PREFIX = "promisepay:job_status:"

    def __init__(self):
        self._redis: Optional[Any] = None
        self._memory_queue: asyncio.Queue = asyncio.Queue()
        self._job_statuses: Dict[str, Dict[str, Any]] = {}

    async def get_redis(self):
        if settings.app_env.lower() in ("test",) or not settings.redis_url or settings.redis_url == "disabled":
            return None
        if self._redis is None and aioredis:
            try:
                client = aioredis.from_url(
                    settings.redis_url,
                    socket_connect_timeout=0.1,
                    decode_responses=True,
                )
                await asyncio.wait_for(client.ping(), timeout=0.1)
                self._redis = client
            except Exception:
                self._redis = False
        return self._redis if self._redis else None

    async def enqueue(self, job_data: Dict[str, Any]) -> str:
        """Enqueues a verification job and returns the job ID."""
        job_id = job_data.get("runId") or job_data.get("jobId")
        job_str = json.dumps(job_data)

        redis = await self.get_redis()
        if redis:
            try:
                await redis.rpush(self.QUEUE_KEY, job_str)
                await redis.set(
                    f"{self.STATUS_PREFIX}{job_id}",
                    json.dumps({"status": "QUEUED", "jobId": job_id, "data": job_data}),
                    ex=86400,
                )
                logger.info("Enqueued verification job %s to Redis queue", job_id)
                return job_id
            except Exception as exc:
                logger.warning("Failed to enqueue job to Redis, using in-memory queue: %s", exc)

        # In-memory queue fallback
        await self._memory_queue.put(job_data)
        self._job_statuses[job_id] = {"status": "QUEUED", "jobId": job_id, "data": job_data}
        logger.info("Enqueued verification job %s to local async queue", job_id)
        return job_id

    async def dequeue(self, timeout_seconds: int = 2) -> Optional[Dict[str, Any]]:
        """Pops the next verification job from the queue."""
        redis = await self.get_redis()
        if redis:
            try:
                item = await redis.blpop(self.QUEUE_KEY, timeout=timeout_seconds)
                if item:
                    _, raw_data = item
                    return json.loads(raw_data)
            except Exception:
                pass

        try:
            return await asyncio.wait_for(self._memory_queue.get(), timeout=timeout_seconds)
        except (asyncio.TimeoutError, TimeoutError):
            return None

    async def update_job_status(self, job_id: str, status: str, result: Optional[Dict[str, Any]] = None) -> None:
        """Updates status of a job in Redis/memory."""
        record = {"status": status, "jobId": job_id, "result": result}
        redis = await self.get_redis()
        if redis:
            try:
                await redis.set(f"{self.STATUS_PREFIX}{job_id}", json.dumps(record), ex=86400)
                return
            except Exception:
                pass
        self._job_statuses[job_id] = record

    async def get_job_status(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves status and outcome of an enqueued job."""
        redis = await self.get_redis()
        if redis:
            try:
                raw = await redis.get(f"{self.STATUS_PREFIX}{job_id}")
                if raw:
                    return json.loads(raw)
            except Exception:
                pass
        return self._job_statuses.get(job_id)


job_queue = VerificationJobQueue()


async def get_redis_client():
    """Returns an active Redis client or None if unavailable/in test mode."""
    return await job_queue.get_redis()

