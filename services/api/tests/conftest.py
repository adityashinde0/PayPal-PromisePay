"""Pytest configuration and test client fixtures."""

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
    monkeypatch.setattr("promisepay_api.config.settings.ai_api_key", "")
    monkeypatch.setattr("promisepay_api.config.settings.app_env", "test")
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
