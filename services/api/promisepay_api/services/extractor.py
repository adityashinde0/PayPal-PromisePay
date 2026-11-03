"""Structured AI promise extraction service."""

import json
import logging
import uuid
from typing import List

import httpx

from promisepay_api.config import settings
from promisepay_api.models.promise import AtomicRequirement, PromiseCategory
from promisepay_api.services.templates import get_template_requirements
from promisepay_api.services.verifier import detect_hostile_input

logger = logging.getLogger("promisepay-extractor")


def _deterministic_rule_based_extract(
    category: PromiseCategory, promise_text: str
) -> List[AtomicRequirement]:
    """Fallback extraction when AI provider is unreachable or in offline test mode."""
    base_requirements = get_template_requirements(category)
    lower_text = promise_text.lower()

    # Dynamic adjustments based on keywords in promise_text
    dynamic_reqs: List[AtomicRequirement] = []

    if category == PromiseCategory.DIGITAL_PROJECT:
        req_count = 1
        if any(w in lower_text for w in ["responsive", "mobile", "frontend", "ui", "tailwind"]):
            dynamic_reqs.append(
                AtomicRequirement(
                    id=f"req_{uuid.uuid4().hex[:8]}",
                    key=f"REQ-{req_count}",
                    title="Responsive Frontend Application",
                    description="Mobile and desktop responsive interface matching project specifications.",
                    priority=1,
                    verificationMethod="URL_SCREENSHOT_ANALYSIS",
                )
            )
            req_count += 1

        if any(w in lower_text for w in ["auth", "login", "cart", "checkout", "api", "database"]):
            dynamic_reqs.append(
                AtomicRequirement(
                    id=f"req_{uuid.uuid4().hex[:8]}",
                    key=f"REQ-{req_count}",
                    title="Core Functional Workflows",
                    description="Verified functional user workflows including authentication, data operations, or transaction flows.",
                    priority=1,
                    verificationMethod="URL_FUNCTIONAL_AUDIT",
                )
            )
            req_count += 1

        if any(w in lower_text for w in ["deploy", "vercel", "live", "git", "github", "repo"]):
            dynamic_reqs.append(
                AtomicRequirement(
                    id=f"req_{uuid.uuid4().hex[:8]}",
                    key=f"REQ-{req_count}",
                    title="Live Production Deployment & Git Repo",
                    description="Accessible public HTTPS deployment and clean repository commit history.",
                    priority=2,
                    verificationMethod="GIT_REPO_AND_DNS_CHECK",
                )
            )
            req_count += 1

    elif category == PromiseCategory.PROFESSIONAL_DOCUMENT:
        dynamic_reqs.append(
            AtomicRequirement(
                id=f"req_{uuid.uuid4().hex[:8]}",
                key="REQ-1",
                title="Mandatory Document Sections",
                description="Presence of required document sections based on provided scope.",
                priority=1,
                verificationMethod="DOCUMENT_STRUCTURE_ANALYSIS",
            )
        )
        dynamic_reqs.append(
            AtomicRequirement(
                id=f"req_{uuid.uuid4().hex[:8]}",
                key="REQ-2",
                title="Content Quality & Citation Verification",
                description="Document satisfies length, technical accuracy, and external citations.",
                priority=2,
                verificationMethod="DOCUMENT_METRIC_CHECK",
            )
        )

    elif category == PromiseCategory.DELIVERY:
        dynamic_reqs.append(
            AtomicRequirement(
                id=f"req_{uuid.uuid4().hex[:8]}",
                key="REQ-1",
                title="Active Carrier Tracking",
                description="Valid carrier tracking number showing in-transit movement.",
                priority=1,
                verificationMethod="CARRIER_TRACKING_ADAPTER",
            )
        )
        dynamic_reqs.append(
            AtomicRequirement(
                id=f"req_{uuid.uuid4().hex[:8]}",
                key="REQ-2",
                title="Destination Delivery Confirmation",
                description="Carrier proof of delivery at recipient destination.",
                priority=1,
                verificationMethod="CARRIER_DELIVERY_CONFIRM",
            )
        )

    return dynamic_reqs if dynamic_reqs else base_requirements


async def extract_requirements(
    category: PromiseCategory, promise_text: str
) -> List[AtomicRequirement]:
    """Extracts atomic requirements from agreement text using AI provider or fallback."""
    # Pre-filter hostile prompt injection before sending to AI provider
    if detect_hostile_input(promise_text):
        logger.warning(
            "Adversarial prompt injection pattern detected in agreement text for category %s.",
            category.value,
        )
        raise ValueError(
            "Security Violation: Hostile prompt injection pattern detected in agreement text."
        )

    if not settings.ai_api_key or settings.ai_api_key == "disabled":
        logger.info("Using deterministic extractor (no AI API key configured)")
        return _deterministic_rule_based_extract(category, promise_text)

    # If AI API key is configured, construct prompt with strict schema
    system_prompt = (
        "You are the PromisePay Requirements Extractor. Extract 2-5 atomic, verifiable requirements "
        "from the provided agreement text. Return ONLY a JSON object with a 'requirements' array where "
        "each item has: 'key' (e.g. REQ-1), 'title', 'description', 'priority' (1=Critical, 2=High, 3=Medium), "
        "and 'verificationMethod' (e.g. URL_SCREENSHOT_ANALYSIS, URL_FUNCTIONAL_AUDIT, GIT_REPO_AND_DNS_CHECK, "
        "DOCUMENT_STRUCTURE_ANALYSIS, CARRIER_TRACKING_ADAPTER)."
    )

    try:
        if settings.ai_provider == "google":
            # Gemini JSON endpoint
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.ai_model}:generateContent"
            headers = {
                "x-goog-api-key": settings.ai_api_key,
                "Content-Type": "application/json",
            }
            payload = {
                "contents": [
                    {
                        "parts": [
                            {
                                "text": f"{system_prompt}\n\nCategory: {category.value}\nAgreement: {promise_text}"
                            }
                        ]
                    }
                ],
                "generationConfig": {"response_mime_type": "application/json"},
            }
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(url, headers=headers, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
                    parsed = json.loads(raw_text)
                    req_list = parsed.get("requirements", [])
                    results = []
                    for idx, item in enumerate(req_list, 1):
                        results.append(
                            AtomicRequirement(
                                id=f"req_{uuid.uuid4().hex[:8]}",
                                key=item.get("key", f"REQ-{idx}"),
                                title=item.get("title", f"Requirement {idx}"),
                                description=item.get("description", ""),
                                priority=int(item.get("priority", 1)),
                                verificationMethod=item.get(
                                    "verificationMethod", "URL_SCREENSHOT_ANALYSIS"
                                ),
                            )
                        )
                    if results:
                        return results
                else:
                    logger.error(
                        "AI requirement extraction HTTP error %d: %s (model: %s)",
                        res.status_code,
                        res.text,
                        settings.ai_model,
                    )
                    raise RuntimeError(
                        f"AI requirement extraction failed with HTTP {res.status_code}: {res.text}"
                    )
    except Exception as exc:
        logger.error(
            "AI requirement extraction failed on model '%s': %s",
            settings.ai_model,
            exc,
            exc_info=True,
        )
        raise RuntimeError(f"AI requirement extraction failed on {settings.ai_model}: {exc}") from exc

    return _deterministic_rule_based_extract(category, promise_text)
