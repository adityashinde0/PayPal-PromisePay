"""Test worker lifecycle and background evidence scanning."""

import pytest

from promisepay_worker.worker import VerificationWorker


@pytest.mark.asyncio
async def test_worker_initialization():
    worker = VerificationWorker()
    assert worker.running is False
    assert worker.processed_jobs == 0
    worker.stop()
    assert worker.running is False


@pytest.mark.asyncio
async def test_worker_scan_evidence():
    worker = VerificationWorker()
    result = await worker.scan_evidence(
        evidence_id="ev_test_123",
        kind="live_url",
        source="https://store.example.com",
    )
    assert result["evidenceId"] == "ev_test_123"
    assert result["status"] == "SCAN_CLEAN"
    assert "computedHash" in result
    assert result["matchesExpected"] is True
    assert worker.processed_jobs == 1


@pytest.mark.asyncio
async def test_worker_execute_verification_job():
    worker = VerificationWorker()
    reqs = [
        {"id": "req_1", "key": "REQ-1", "title": "Storefront"},
        {"id": "req_2", "key": "REQ-2", "title": "Cart"},
    ]
    manifest = [
        {"evidenceId": "ev_1", "requirementIds": ["req_1"]},
    ]
    res = await worker.execute_verification_job("PP-TEST-123", reqs, manifest)
    assert res["promiseId"] == "PP-TEST-123"
    assert res["status"] == "COMPLETED"
    assert res["outcome"] == "REVIEW_REQUIRED"
    assert len(res["results"]) == 2
    assert res["results"][0]["status"] == "VERIFIED"
    assert res["results"][1]["status"] == "NOT_VERIFIED"
    assert worker.processed_jobs == 1
