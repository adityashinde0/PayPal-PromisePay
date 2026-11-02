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
    """Test that requests receive correlation IDs and security headers in response."""
    response = client.get("/health", headers={"X-Correlation-ID": "test-cid-123"})
    assert response.status_code == 200
    assert response.headers.get("X-Correlation-ID") == "test-cid-123"
    assert "X-Response-Time-MS" in response.headers
    assert response.headers.get("X-Content-Type-Options") == "nosniff"
    assert response.headers.get("X-Frame-Options") == "DENY"
    assert response.headers.get("X-XSS-Protection") == "1; mode=block"
    assert response.headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"


def test_detailed_health_endpoint(client):
    """Test that /health/detailed returns 200, uptime, and subsystem health."""
    response = client.get("/health/detailed")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "uptimeSeconds" in data
    assert "subsystems" in data
    assert "paypal_sandbox" in data["subsystems"]
    assert "storage" in data["subsystems"]
    assert "ai_engine" in data["subsystems"]


def test_metrics_endpoint(client):
    """Test that /metrics returns Prometheus format text metrics."""
    response = client.get("/metrics")
    assert response.status_code == 200
    assert "text/plain" in response.headers.get("content-type", "")
    content = response.text
    assert "promisepay_uptime_seconds" in content
    assert "promisepay_promises_total" in content
    assert "promisepay_evidence_items_total" in content


def test_demo_reset_endpoint(client):
    """Test that /demo/reset successfully resets and re-seeds state."""
    response = client.post("/demo/reset")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "reset_successful"
    assert data["promisesCount"] >= 3
