"""Context variables for request tracing and correlation ID propagation."""

import contextvars
import uuid

correlation_id_ctx: contextvars.ContextVar[str] = contextvars.ContextVar(
    "correlation_id", default=""
)


def get_current_correlation_id() -> str:
    """Returns the current request correlation ID, or generates a fresh one."""
    cid = correlation_id_ctx.get()
    if not cid:
        cid = f"req_{uuid.uuid4().hex[:12]}"
        correlation_id_ctx.set(cid)
    return cid


def set_current_correlation_id(cid: str) -> None:
    """Sets the correlation ID for the active request context."""
    correlation_id_ctx.set(cid)

