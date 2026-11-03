"""PromisePay FastAPI Application Entrypoint."""

import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from promisepay_api.config import settings
from promisepay_api.context import get_current_traceparent, set_current_correlation_id, set_trace_context
from promisepay_api.db.database import init_db
from promisepay_api.logging_config import setup_structured_logging
from promisepay_api.services.rate_limiter import rate_limiter
from promisepay_api.routers import (
    disputes,
    evidence,
    health,
    payments,
    promises,
    resolutions,
    verifications,
    webhooks,
)

# Initialize structured JSON logging
setup_structured_logging(settings.log_level)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle manager: initializes database tables and resources."""
    await init_db()
    yield


app = FastAPI(
    title="PayPal PromisePay API",
    description="AI-powered proof-of-outcome lifecycle platform for PayPal payments.",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS setup
origins = [
    settings.web_origin,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


@app.middleware("http")
async def correlation_id_and_timing_middleware(request: Request, call_next):
    """Ensure correlation ID, OpenTelemetry trace context, and response time tracking on all requests."""
    correlation_id = request.headers.get("X-Correlation-ID", f"req_{uuid.uuid4().hex[:12]}")
    request.state.correlation_id = correlation_id
    set_current_correlation_id(correlation_id)

    # Ingress OpenTelemetry W3C traceparent extraction or propagation
    traceparent = request.headers.get("traceparent")
    if traceparent and len(traceparent.split("-")) == 4:
        parts = traceparent.split("-")
        set_trace_context(parts[1], parts[2])
    outbound_traceparent = get_current_traceparent()

    # Rate Limiting check per client host
    client_ip = request.client.host if request.client else "127.0.0.1"
    allowed, remaining, window = await rate_limiter.is_allowed(key=client_ip, max_requests=240, window_seconds=60)
    if not allowed:
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=429,
            content={"detail": "Too Many Requests: Rate limit exceeded. Please retry shortly."},
            headers={"Retry-After": str(window), "X-RateLimit-Limit": "240", "X-RateLimit-Remaining": "0"},
        )

    start_time = time.time()
    response = await call_next(request)
    duration_ms = round((time.time() - start_time) * 1000, 2)

    response.headers["X-Correlation-ID"] = correlation_id
    response.headers["traceparent"] = outbound_traceparent
    response.headers["X-RateLimit-Limit"] = "240"
    response.headers["X-RateLimit-Remaining"] = str(remaining)
    response.headers["X-Response-Time-MS"] = str(duration_ms)

    # Security Headers Hardening
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    return response


# Include Routers
app.include_router(health.router)
app.include_router(health.router, prefix="/api")

# Promise Core Routers
app.include_router(promises.router)
app.include_router(promises.router, prefix="/api")

# Payment & Webhook Routers
app.include_router(payments.router)
app.include_router(payments.router, prefix="/api")
app.include_router(webhooks.router)
app.include_router(webhooks.router, prefix="/api")

# Evidence Routers
app.include_router(evidence.router)
app.include_router(evidence.router, prefix="/api")

# Verification Routers
app.include_router(verifications.router)
app.include_router(verifications.router, prefix="/api")

# Resolution Routers
app.include_router(resolutions.router)
app.include_router(resolutions.router, prefix="/api")

# PayPal Customer Disputes Routers (Phase 3)
app.include_router(disputes.router)
app.include_router(disputes.router, prefix="/api")


@app.get("/api/config")
async def get_public_config():
    """Provides public configuration for the frontend checkout client."""
    return {
        "paypalClientId": settings.paypal_client_id or "sb-b7szm53645276@business.example.com",
        "paypalEnv": settings.paypal_env,
        "appEnv": settings.app_env,
        "version": "0.1.0",
    }


@app.get("/")
async def root():
    return {
        "name": "PayPal PromisePay API",
        "status": "online",
        "docs": "/docs",
        "health": "/health",
    }
