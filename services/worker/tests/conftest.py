"""Pytest configuration for worker tests."""

import pytest

from promisepay_worker.scraper import scraper


@pytest.fixture(autouse=True)
def isolate_worker_test_environment(monkeypatch):
    async def mock_scrape(url: str):
        return {
            "url": url,
            "domain": "example.com",
            "statusCode": 200,
            "latencyMs": 5.0,
            "title": "Mock Deliverable",
            "domTextSample": "Sample text",
            "sections": [{"type": "h1", "text": "Mock", "sectionIndex": 0}],
            "screenshotBase64": "data:image/png;base64,mock",
            "crawledAt": "2026-11-04T00:00:00Z",
            "status": "VERIFIED_ACTIVE",
        }

    monkeypatch.setattr(scraper, "scrape_deliverable", mock_scrape)
