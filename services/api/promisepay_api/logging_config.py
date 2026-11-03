"""Structured JSON Logging Configuration using structlog."""

import logging
import sys
import structlog

from promisepay_api.context import get_current_correlation_id


def add_correlation_id(logger, method_name, event_dict):
    """Injects current X-Correlation-ID into every structured log entry."""
    cid = get_current_correlation_id()
    if cid:
        event_dict["correlation_id"] = cid
    return event_dict


def setup_structured_logging(log_level: str = "INFO"):
    """Configures standard library logging and structlog to output JSON in production."""
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=getattr(logging, log_level.upper(), logging.INFO),
    )

    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            add_correlation_id,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(
            getattr(logging, log_level.upper(), logging.INFO)
        ),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )

