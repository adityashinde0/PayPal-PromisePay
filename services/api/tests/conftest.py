"""Pytest configuration and test client fixtures."""

import pytest
from fastapi.testclient import TestClient

from promisepay_api.main import app


@pytest.fixture
def client():
    """Provides a TestClient for FastAPI endpoints."""
    with TestClient(app) as test_client:
        yield test_client
