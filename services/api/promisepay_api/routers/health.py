"""Health, Observability & Demo Management endpoints."""

import time
from datetime import datetime, timezone
from typing import Any, Dict

from fastapi import APIRouter, Response
from pydantic import BaseModel

from promisepay_api.config import settings
from promisepay_api.services.evidence_store import evidence_store
from promisepay_api.services.promise_store import promise_store
from promisepay_api.services.resolution_store import resolution_store

router = APIRouter(tags=["Health & Observability"])

_START_TIME = time.time()


class HealthResponse(BaseModel):
    status: str
    environment: str
    version: str
    timestamp: str
    service: str


class DetailedHealthResponse(BaseModel):
    status: str
    environment: str
    version: str
    timestamp: str
    uptimeSeconds: float
    subsystems: Dict[str, Any]


@router.get("/health", response_model=HealthResponse)
async def get_health():
    """Returns the operational status of the PromisePay API service."""
    return HealthResponse(
        status="ok",
        environment=settings.app_env,
        version="0.1.0",
        timestamp=datetime.now(timezone.utc).isoformat(),
        service="promisepay-api",
    )


@router.get("/health/detailed", response_model=DetailedHealthResponse)
async def get_detailed_health():
    """Returns comprehensive subsystem health, sandbox config check, and storage diagnostics."""
    promises = promise_store.list()
    evidence_count = sum(len(items) for items in evidence_store._evidence.values())
    cases = list(resolution_store._cases.values())

    subsystems = {
        "paypal_sandbox": {
            "status": "ready" if settings.paypal_client_id else "mock_fallback",
            "mode": settings.paypal_env,
            "baseUrl": settings.paypal_api_base,
            "configured": bool(settings.paypal_client_id and settings.paypal_client_secret),
        },
        "storage": {
            "status": "online",
            "provider": "local_encrypted",
            "totalEvidenceItems": evidence_count,
        },
        "ai_engine": {
            "status": "online",
            "deterministicPrechecks": "active",
            "antiInjectionGuards": "active",
            "failClosedPolicy": "enabled",
        },
        "ledger": {
            "totalPromises": len(promises),
            "openResolutionCases": len([c for c in cases if c.status == "OPEN"]),
        },
    }

    return DetailedHealthResponse(
        status="ok",
        environment=settings.app_env,
        version="0.1.0",
        timestamp=datetime.now(timezone.utc).isoformat(),
        uptimeSeconds=round(time.time() - _START_TIME, 2),
        subsystems=subsystems,
    )


@router.get("/metrics")
async def get_metrics():
    """Returns Prometheus standard text metrics for observability."""
    uptime = round(time.time() - _START_TIME, 2)
    promises = promise_store.list()
    total_promises = len(promises)

    # Status counts
    status_counts: Dict[str, int] = {}
    for p in promises:
        status_counts[p.status.value] = status_counts.get(p.status.value, 0) + 1

    evidence_count = sum(len(items) for items in evidence_store._evidence.values())
    cases = list(resolution_store._cases.values())
    total_cases = len(cases)
    captured_count = len([p for p in promises if p.payment.state == "CAPTURED"])

    lines = [
        "# HELP promisepay_uptime_seconds Total runtime of the API service in seconds.",
        "# TYPE promisepay_uptime_seconds gauge",
        f"promisepay_uptime_seconds {uptime}",
        "# HELP promisepay_promises_total Total promises registered in the ledger.",
        "# TYPE promisepay_promises_total gauge",
        f"promisepay_promises_total {total_promises}",
    ]

    for st, count in sorted(status_counts.items()):
        lines.append(f'promisepay_promises_by_status{{status="{st}"}} {count}')

    lines.extend(
        [
            "# HELP promisepay_evidence_items_total Total evidence artifacts stored with SHA-256 provenance.",
            "# TYPE promisepay_evidence_items_total gauge",
            f"promisepay_evidence_items_total {evidence_count}",
            "# HELP promisepay_resolution_cases_total Total dispute and human review cases.",
            "# TYPE promisepay_resolution_cases_total gauge",
            f"promisepay_resolution_cases_total {total_cases}",
            "# HELP promisepay_payments_captured_total Total PayPal payments successfully captured.",
            "# TYPE promisepay_payments_captured_total counter",
            f"promisepay_payments_captured_total {captured_count}",
        ]
    )

    content = "\n".join(lines) + "\n"
    return Response(content=content, media_type="text/plain; version=0.0.4; charset=utf-8")


@router.post("/demo/reset")
async def reset_demo_state():
    """Re-initializes all stores back to fresh judge demo state."""
    promise_store.reset()
    evidence_store.reset()
    resolution_store.reset()
    return {
        "status": "reset_successful",
        "message": "PromisePay store has been reset to default judge seed scenarios.",
        "promisesCount": len(promise_store.list()),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
