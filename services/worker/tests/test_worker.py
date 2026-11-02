"""Test worker initialization and lifecycle."""

import pytest

from promisepay_worker.worker import VerificationWorker


@pytest.mark.asyncio
async def test_worker_initialization():
    worker = VerificationWorker()
    assert worker.running is False
    worker.stop()
    assert worker.running is False
