"""Pytest configuration and test client fixtures."""

import os

os.environ["APP_ENV"] = "test"
os.environ["REDIS_URL"] = "disabled"

import pytest
from fastapi.testclient import TestClient

from promisepay_api.main import app
from promisepay_api.routers.webhooks import PROCESSED_EVENT_IDS
from promisepay_api.services.evidence_store import evidence_store
from promisepay_api.services.paypal_client import paypal_client
from promisepay_api.services.promise_store import promise_store
from promisepay_api.services.resolution_store import resolution_store
from promisepay_api.services.verifier import verification_store


@pytest.fixture(autouse=True)
def isolate_test_environment(monkeypatch, tmp_path):
    """Ensure tests always use deterministic sandbox mocks, never hitting live external APIs, with clean per-test state."""
    monkeypatch.setattr(paypal_client, "client_id", "")
    monkeypatch.setattr(paypal_client, "client_secret", "")
    monkeypatch.setattr(paypal_client, "webhook_id", "")
    monkeypatch.setattr("promisepay_api.config.settings.ai_api_key", "")
    monkeypatch.setattr("promisepay_api.config.settings.app_env", "test")
    monkeypatch.setattr("promisepay_api.config.settings.redis_url", "disabled")
    from promisepay_api.services.queue import job_queue
    from promisepay_api.services.scraper import scraper

    async def mock_scrape_deliverable(url: str):
        return {
            "url": url,
            "domain": "example.com",
            "statusCode": 200,
            "latencyMs": 10.0,
            "title": "Mock Deliverable",
            "domTextSample": "Mock DOM deliverable text",
            "sections": [{"type": "h1", "text": "Mock Deliverable", "sectionIndex": 0}],
            "screenshotBase64": "data:image/png;base64,mock",
            "crawledAt": "2026-11-04T00:00:00Z",
            "status": "VERIFIED_ACTIVE",
        }

    monkeypatch.setattr(scraper, "scrape_deliverable", mock_scrape_deliverable)
    monkeypatch.setattr(job_queue, "_redis", False)
    monkeypatch.setattr(
        "promisepay_api.routers.webhooks._STORAGE_FILE", tmp_path / "test_events.txt"
    )
    PROCESSED_EVENT_IDS.clear()

    # Reset in-memory stores to pristine seed state before every test
    promise_store.reset()
    evidence_store.reset()
    resolution_store.reset()
    verification_store._runs.clear()


@pytest.fixture
def client():
    """Provides a TestClient for FastAPI endpoints authenticated with a valid test token."""
    with TestClient(app) as test_client:
        test_client.headers.update({"Authorization": "Bearer test_token_admin"})
        yield test_client
