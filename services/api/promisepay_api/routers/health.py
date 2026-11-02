"""Health check endpoint router."""

from datetime import datetime, timezone

from fastapi import APIRouter
from pydantic import BaseModel

from promisepay_api.config import settings

router = APIRouter(tags=["Health"])


class HealthResponse(BaseModel):
    status: str
    environment: str
    version: str
    timestamp: str
    service: str


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
