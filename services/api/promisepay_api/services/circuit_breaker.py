"""Enterprise Asynchronous Circuit Breaker & Multi-Provider Failover.

Prevents cascading timeouts and thread starvation when external services (Google Gemini,
PayPal API) encounter 429 rate limits, 503 service unavailabilities, or network delays.
Transitions states: CLOSED -> OPEN -> HALF_OPEN -> CLOSED.
"""

import asyncio
import logging
import time
from enum import Enum
from typing import Any, Callable, Coroutine, Dict, Optional

logger = logging.getLogger("promisepay-circuit-breaker")


class CircuitState(str, Enum):
    CLOSED = "CLOSED"
    OPEN = "OPEN"
    HALF_OPEN = "HALF_OPEN"


class CircuitBreakerOpenException(Exception):
    """Raised when an operation is attempted while the circuit breaker is OPEN."""

    pass


class AsyncCircuitBreaker:
    """Production asynchronous circuit breaker for external API integration."""

    def __init__(
        self,
        name: str,
        failure_threshold: int = 3,
        recovery_timeout_seconds: float = 15.0,
        half_open_success_threshold: int = 1,
    ):
        self.name = name
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout_seconds
        self.half_open_success_threshold = half_open_success_threshold

        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.success_count = 0
        self.last_failure_time: Optional[float] = None
        self._lock = asyncio.Lock()

    def get_status(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "state": self.state.value,
            "failure_count": self.failure_count,
            "last_failure_time": self.last_failure_time,
        }

    async def call(
        self,
        coro_func: Callable[[], Coroutine[Any, Any, Any]],
        fallback_func: Optional[Callable[[], Coroutine[Any, Any, Any]]] = None,
    ) -> Any:
        """Executes a coroutine with circuit-breaker protection and optional fallback."""
        async with self._lock:
            now = time.monotonic()
            if self.state == CircuitState.OPEN:
                if (
                    self.last_failure_time
                    and (now - self.last_failure_time) >= self.recovery_timeout
                ):
                    logger.info(
                        "Circuit breaker '%s' entering HALF_OPEN state for probe", self.name
                    )
                    self.state = CircuitState.HALF_OPEN
                    self.success_count = 0
                else:
                    logger.warning(
                        "Circuit breaker '%s' is OPEN. Tripping to fallback or raising exception.",
                        self.name,
                    )
                    if fallback_func:
                        return await fallback_func()
                    raise CircuitBreakerOpenException(
                        f"Circuit breaker '{self.name}' is OPEN. Fast-failing external request."
                    )

        # Attempt the primary call
        try:
            result = await coro_func()
            async with self._lock:
                if self.state == CircuitState.HALF_OPEN:
                    self.success_count += 1
                    if self.success_count >= self.half_open_success_threshold:
                        logger.info("Circuit breaker '%s' recovered to CLOSED state", self.name)
                        self.state = CircuitState.CLOSED
                        self.failure_count = 0
                elif self.state == CircuitState.CLOSED:
                    self.failure_count = 0
            return result
        except Exception as exc:
            async with self._lock:
                self.failure_count += 1
                self.last_failure_time = time.monotonic()
                logger.error(
                    "Circuit breaker '%s' caught failure (%d/%d): %s",
                    self.name,
                    self.failure_count,
                    self.failure_threshold,
                    exc,
                )
                if (
                    self.failure_count >= self.failure_threshold
                    or self.state == CircuitState.HALF_OPEN
                ):
                    logger.warning("Circuit breaker '%s' TRIPPED to OPEN state", self.name)
                    self.state = CircuitState.OPEN

            if fallback_func:
                logger.info("Executing graceful fallback for circuit '%s'", self.name)
                return await fallback_func()
            raise


# Pre-configured circuit breakers for the platform
ai_circuit_breaker = AsyncCircuitBreaker(
    "google-gemini-ai", failure_threshold=3, recovery_timeout_seconds=20.0
)
paypal_circuit_breaker = AsyncCircuitBreaker(
    "paypal-api", failure_threshold=5, recovery_timeout_seconds=30.0
)
