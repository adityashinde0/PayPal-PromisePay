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
