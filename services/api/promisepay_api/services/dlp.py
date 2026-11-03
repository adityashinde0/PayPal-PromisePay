"""PII / DLP (Data Loss Prevention) Sanitizer for PCI-DSS 4.0 & GDPR Compliance.

Redacts sensitive financial identifiers (credit cards with Luhn check, SSNs,
emails, phone numbers) before sending prompts or evidence text to 3rd-party AI providers.
"""

import re
from typing import Tuple


def luhn_checksum_valid(card_number: str) -> bool:
    """Verifies standard Luhn algorithm for 13-19 digit credit card numbers."""
    digits = [int(d) for d in card_number if d.isdigit()]
    if len(digits) < 13 or len(digits) > 19:
        return False
    checksum = 0
    reverse_digits = digits[::-1]
    for i, digit in enumerate(reverse_digits):
        if i % 2 == 1:
            doubled = digit * 2
            checksum += doubled - 9 if doubled > 9 else doubled
        else:
            checksum += digit
    return checksum % 10 == 0


# Compiled regex patterns for PII detection
_EMAIL_REGEX = re.compile(
    r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b"
)
_SSN_REGEX = re.compile(
    r"\b\d{3}[- ]?\d{2}[- ]?\d{4}\b"
)
_PHONE_REGEX = re.compile(
    r"(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b"
)
_CC_CANDIDATE_REGEX = re.compile(
    r"\b(?:\d{4}[-\s]?){3,4}\d{1,4}\b|\b\d{13,19}\b"
)
_API_KEY_REGEX = re.compile(
    r"\b(?:AIzaSy[0-9A-Za-z-_]{25,45}|ghp_[0-9A-Za-z]{36}|sk-[0-9A-Za-z]{25,})\b"
)


def scrub_pii(text: str) -> Tuple[str, int]:
    """Scrubs sensitive PII/PCI data from text before external AI transmission.

    Returns:
        Tuple[str, int]: (Sanitized text, count of redactions performed)
    """
    if not text:
        return text, 0

    redaction_count = 0

    # 1. Redact API Keys / Tokens
    def _redact_key(match: re.Match) -> str:
        nonlocal redaction_count
        redaction_count += 1
        return "[REDACTED_API_KEY]"

    text = _API_KEY_REGEX.sub(_redact_key, text)

    # 2. Redact Credit Card Numbers (with Luhn check)
    def _redact_cc(match: re.Match) -> str:
        nonlocal redaction_count
        raw = match.group(0)
        digits_only = re.sub(r"\D", "", raw)
        if luhn_checksum_valid(digits_only):
            redaction_count += 1
            return "[REDACTED_CARD_NUMBER]"
        return raw

    text = _CC_CANDIDATE_REGEX.sub(_redact_cc, text)

    # 3. Redact Social Security Numbers (SSN)
    def _redact_ssn(match: re.Match) -> str:
        nonlocal redaction_count
        redaction_count += 1
        return "[REDACTED_SSN]"

    text = _SSN_REGEX.sub(_redact_ssn, text)

    # 4. Redact Email Addresses
    def _redact_email(match: re.Match) -> str:
        nonlocal redaction_count
        redaction_count += 1
        return "[REDACTED_EMAIL]"

    text = _EMAIL_REGEX.sub(_redact_email, text)

    # 5. Redact Phone Numbers
    def _redact_phone(match: re.Match) -> str:
        nonlocal redaction_count
        redaction_count += 1
        return "[REDACTED_PHONE]"

    text = _PHONE_REGEX.sub(_redact_phone, text)

    return text, redaction_count
