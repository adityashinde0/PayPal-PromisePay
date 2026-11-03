# ruff: noqa: E402
"""PromisePay API Server Runner with Dual-Stack (IPv4 + IPv6) Socket."""

import logging
import os
import socket
import sys
from pathlib import Path

# Add services/api to sys.path
api_dir = Path(__file__).resolve().parent.parent
if str(api_dir) not in sys.path:
    sys.path.insert(0, str(api_dir))

import uvicorn

from promisepay_api.main import app

logger = logging.getLogger("promisepay-server")


def create_dual_stack_socket(port: int = 8000) -> socket.socket:
    """Creates a dual-stack socket that accepts IPv6 (::1, ::) and IPv4 (127.0.0.1, 0.0.0.0)."""
    try:
        sock = socket.socket(socket.AF_INET6, socket.SOCK_STREAM)
        sock.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        sock.bind(("::", port))
        sock.listen(128)
        sock.setblocking(False)
        return sock
    except Exception as exc:
        logger.warning("Dual-stack IPv6 bind failed (%s); falling back to IPv4 0.0.0.0", exc)
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        sock.bind(("0.0.0.0", port))
        sock.listen(128)
        sock.setblocking(False)
        return sock


def main():
    port = int(os.environ.get("PORT", 8000))
    sock = create_dual_stack_socket(port)
    print("\n=======================================================")
    print("  PayPal PromisePay API Running (Dual-Stack IPv4 & IPv6)")
    print(f"  Local API:   http://localhost:{port}/")
    print(f"  IPv4 API:    http://127.0.0.1:{port}/")
    print(f"  Docs:        http://localhost:{port}/docs")
    print(f"  Health:      http://localhost:{port}/api/health")
    print("=======================================================\n")
    config = uvicorn.Config(
        app=app,
        log_level="info",
        access_log=True,
    )
    server = uvicorn.Server(config)
    server.run(sockets=[sock])


if __name__ == "__main__":
    main()
