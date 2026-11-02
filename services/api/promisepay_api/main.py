"""PromisePay FastAPI Application Entrypoint."""

import time
import uuid

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from promisepay_api.config import settings
from promisepay_api.routers import health, payments, promises, webhooks

app = FastAPI(
    title="PayPal PromisePay API",
    description="AI-powered proof-of-outcome lifecycle platform for PayPal payments.",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
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
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def correlation_id_and_timing_middleware(request: Request, call_next):
    """Ensure correlation ID and response time tracking on all requests."""
    correlation_id = request.headers.get("X-Correlation-ID", f"req_{uuid.uuid4().hex[:12]}")
    request.state.correlation_id = correlation_id

    start_time = time.time()
    response = await call_next(request)
    duration_ms = round((time.time() - start_time) * 1000, 2)

    response.headers["X-Correlation-ID"] = correlation_id
    response.headers["X-Response-Time-MS"] = str(duration_ms)
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


@app.get("/")
async def root():
    return {
        "name": "PayPal PromisePay API",
        "status": "online",
        "docs": "/docs",
        "health": "/health",
    }
