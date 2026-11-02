"""Tests for health check endpoints."""


def test_health_endpoint(client):
    """Test that /health returns 200 and valid status."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "promisepay-api"
    assert "timestamp" in data
    assert "environment" in data


def test_api_health_endpoint(client):
    """Test that /api/health returns 200 and valid status."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"


def test_root_endpoint(client):
    """Test root endpoint information."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "PayPal PromisePay API"
    assert data["status"] == "online"


def test_correlation_id_header(client):
    """Test that requests receive correlation IDs in headers."""
    response = client.get("/health", headers={"X-Correlation-ID": "test-cid-123"})
    assert response.status_code == 200
    assert response.headers.get("X-Correlation-ID") == "test-cid-123"
    assert "X-Response-Time-MS" in response.headers
