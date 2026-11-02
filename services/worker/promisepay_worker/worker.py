"""Background verification worker process entrypoint."""

import asyncio
import logging
import signal
import sys

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("promisepay-worker")


class VerificationWorker:
    def __init__(self):
        self.running = False

    async def start(self):
        self.running = True
        logger.info("PromisePay Verification Worker started. Listening for background jobs...")
        while self.running:
            # Poll or wait for tasks from queue/db
            await asyncio.sleep(2)

    def stop(self):
        logger.info("Stopping PromisePay Verification Worker...")
        self.running = False


async def main():
    worker = VerificationWorker()

    def handle_signal():
        worker.stop()

    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        try:
            loop.add_signal_handler(sig, handle_signal)
        except NotImplementedError:
            # Windows compatibility
            pass

    await worker.start()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Worker terminated by user.")
        sys.exit(0)
