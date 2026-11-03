"""Context variables for request tracing, correlation ID, and W3C OpenTelemetry traceparent propagation."""

import contextvars
import uuid

correlation_id_ctx: contextvars.ContextVar[str] = contextvars.ContextVar(
    "correlation_id", default=""
)
trace_id_ctx: contextvars.ContextVar[str] = contextvars.ContextVar("trace_id", default="")
span_id_ctx: contextvars.ContextVar[str] = contextvars.ContextVar("span_id", default="")


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


def get_current_traceparent() -> str:
    """Returns W3C traceparent string (00-{trace_id}-{span_id}-01) for OpenTelemetry distributed tracing."""
    tid = trace_id_ctx.get()
    if not tid:
        tid = uuid.uuid4().hex
        trace_id_ctx.set(tid)
    sid = span_id_ctx.get()
    if not sid:
        sid = uuid.uuid4().hex[:16]
        span_id_ctx.set(sid)
    return f"00-{tid}-{sid}-01"


def set_trace_context(trace_id: str, span_id: str) -> None:
    """Sets OpenTelemetry trace and span IDs."""
    trace_id_ctx.set(trace_id)
    span_id_ctx.set(span_id)
