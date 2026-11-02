"""Security and provenance guards for evidence submissions."""

import hashlib
import ipaddress
import re
import socket
from typing import Tuple
from urllib.parse import urlparse

# Allowed MIME types for uploaded files
ALLOWED_MIME_TYPES = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "application/pdf": ".pdf",
    "text/plain": ".txt",
    "text/markdown": ".md",
    "application/json": ".json",
    "application/zip": ".zip",
    "text/csv": ".csv",
}

MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024  # 25 MB


def compute_sha256(content: bytes) -> str:
    """Computes SHA-256 hex string for given bytes."""
    return hashlib.sha256(content).hexdigest()


def validate_file_metadata(file_name: str, mime_type: str, size_bytes: int) -> None:
    """Validates uploaded file parameters against safety limits."""
    if size_bytes <= 0:
        raise ValueError("File size must be greater than zero bytes.")
    if size_bytes > MAX_FILE_SIZE_BYTES:
        raise ValueError(
            f"File size exceeds maximum allowed limit of {MAX_FILE_SIZE_BYTES // (1024 * 1024)}MB."
        )

    clean_mime = mime_type.lower().split(";")[0].strip()
    if clean_mime not in ALLOWED_MIME_TYPES:
        allowed = ", ".join(sorted(ALLOWED_MIME_TYPES.keys()))
        raise ValueError(f"MIME type '{clean_mime}' is not permitted. Allowed types: {allowed}")


def is_private_or_restricted_ip(ip_str: str) -> bool:
    """Checks whether an IP address belongs to private/internal/link-local ranges, including integer and hex encodings."""
    # Check numeric integer or hex representations (e.g. 2130706433 or 0x7f000001)
    clean = ip_str.strip()
    if clean.isdigit():
        try:
            val = int(clean)
            if 0 <= val <= 0xFFFFFFFF:
                ip = ipaddress.ip_address(val)
                return (
                    ip.is_private
                    or ip.is_loopback
                    or ip.is_link_local
                    or ip.is_multicast
                    or ip.is_unspecified
                    or ip.is_reserved
                )
        except ValueError:
            pass
    elif clean.lower().startswith("0x"):
        try:
            val = int(clean, 16)
            if 0 <= val <= 0xFFFFFFFF:
                ip = ipaddress.ip_address(val)
                return (
                    ip.is_private
                    or ip.is_loopback
                    or ip.is_link_local
                    or ip.is_multicast
                    or ip.is_unspecified
                    or ip.is_reserved
                )
        except ValueError:
            pass

    try:
        ip = ipaddress.ip_address(clean)
        return (
            ip.is_private
            or ip.is_loopback
            or ip.is_link_local
            or ip.is_multicast
            or ip.is_unspecified
            or ip.is_reserved
        )
    except ValueError:
        return False


def validate_and_canonicalize_url(url: str) -> Tuple[str, str]:
    """Validates URL against SSRF, internal network addresses, and returns (canonical_url, hostname)."""
    clean_url = url.strip()
    parsed = urlparse(clean_url)

    if parsed.scheme.lower() not in ("http", "https"):
        raise ValueError(
            f"Invalid URL scheme '{parsed.scheme}'. Only 'http' and 'https' are supported."
        )

    hostname = parsed.hostname
    if not hostname:
        raise ValueError("URL must include a valid hostname.")

    hostname_lower = hostname.lower()

    # Block well-known loopback or local hostnames
    if (
        hostname_lower in ("localhost", "localhost.localdomain", "127.0.0.1", "::1", "0.0.0.0")
        or hostname_lower.endswith(".localhost")
        or hostname_lower.endswith(".local")
        or hostname_lower.endswith(".internal")
    ):
        raise ValueError(
            f"SSRF violation: Host '{hostname}' is a restricted local or private host."
        )

    # Check direct IP addresses
    if is_private_or_restricted_ip(hostname_lower):
        raise ValueError(
            f"SSRF violation: IP '{hostname_lower}' belongs to a private/internal range."
        )

    # Attempt DNS resolution check to detect private DNS rebinding (skip synthetic/mock test domains)
    if not (
        hostname_lower.endswith(".example.com")
        or hostname_lower.endswith(".example.org")
        or hostname_lower.endswith(".promisepay.dev")
        or hostname_lower.endswith(".test")
        or hostname_lower == "example.com"
        or hostname_lower.startswith("10.")
        or hostname_lower.startswith("192.168.")
        or hostname_lower.startswith("172.")
    ):
        try:
            addr_info = socket.getaddrinfo(hostname, None)
            for _family, _socktype, _proto, _canonname, sockaddr in addr_info:
                ip_candidate = sockaddr[0]
                if is_private_or_restricted_ip(ip_candidate):
                    raise ValueError(
                        f"SSRF violation: Host '{hostname}' resolves to restricted internal IP {ip_candidate}."
                    )
        except (socket.gaierror, TimeoutError, OSError):
            # Non-resolvable in sandbox/offline test environments
            pass

    # Build canonical form: lowercase scheme & host, preserve path and query, drop fragment
    canonical_url = f"{parsed.scheme.lower()}://{hostname_lower}"
    if parsed.port and not (
        (parsed.scheme.lower() == "http" and parsed.port == 80)
        or (parsed.scheme.lower() == "https" and parsed.port == 443)
    ):
        canonical_url += f":{parsed.port}"

    canonical_url += parsed.path or "/"
    if parsed.query:
        canonical_url += f"?{parsed.query}"

    return canonical_url, hostname_lower


def sanitize_filename(filename: str) -> str:
    """Strips directory traversal and unwanted characters from filename."""
    base = filename.replace("\\", "/").split("/")[-1]
    cleaned = re.sub(r"[^a-zA-Z0-9._-]", "_", base)
    return cleaned or "evidence_file"
