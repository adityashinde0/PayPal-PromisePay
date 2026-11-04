"""Default category templates for PromisePay agreements."""

from typing import List

from promisepay_api.models.promise import AtomicRequirement, PromiseCategory

CATEGORY_TEMPLATES = {
    PromiseCategory.DIGITAL_PROJECT: [
        AtomicRequirement(
            id="req_digital_ui",
            key="REQ-1",
            title="Responsive User Interface",
            description="Mobile-responsive layout adhering to design specifications with working navigation and components.",
            priority=1,
            verificationMethod="URL_SCREENSHOT_ANALYSIS",
        ),
        AtomicRequirement(
            id="req_digital_functional",
            key="REQ-2",
            title="Interactive Core Functional Flow",
            description="Core user workflows (e.g. catalog browsing, shopping cart, authentication) operate with valid state changes.",
            priority=1,
            verificationMethod="URL_FUNCTIONAL_AUDIT",
        ),
        AtomicRequirement(
            id="req_digital_deployment",
            key="REQ-3",
            title="Live Production Deployment & Repository",
            description="Reachable public HTTPS URL and linked Git repository with reproducible build configuration.",
            priority=2,
            verificationMethod="GIT_REPO_AND_DNS_CHECK",
        ),
    ],
    PromiseCategory.PROFESSIONAL_DOCUMENT: [
        AtomicRequirement(
            id="req_doc_sections",
            key="REQ-1",
            title="Required Document Sections",
            description="Document includes all mandatory structural sections: Executive Summary, Architecture, Methodology, and Findings.",
            priority=1,
            verificationMethod="DOCUMENT_STRUCTURE_ANALYSIS",
        ),
        AtomicRequirement(
            id="req_doc_depth",
            key="REQ-2",
            title="Substantive Length & Verification Claims",
            description="Document satisfies agreed minimum length requirements and includes verifiable claims and citations.",
            priority=2,
            verificationMethod="DOCUMENT_METRIC_CHECK",
        ),
    ],
    PromiseCategory.DELIVERY: [
        AtomicRequirement(
            id="req_del_tracking",
            key="REQ-1",
            title="Valid Carrier Tracking Reference",
            description="Active tracking reference number from supported carrier (FedEx, UPS, USPS, DHL) in transit.",
            priority=1,
            verificationMethod="CARRIER_TRACKING_ADAPTER",
        ),
        AtomicRequirement(
            id="req_del_confirmed",
            key="REQ-2",
            title="Proof of Delivery",
            description="Carrier status indicates delivered to recipient destination coordinates or address.",
            priority=1,
            verificationMethod="CARRIER_DELIVERY_CONFIRM",
        ),
    ],
}


def get_template_requirements(category: PromiseCategory) -> List[AtomicRequirement]:
    """Returns standard atomic requirements for the specified category."""
    return [req.model_copy() for req in CATEGORY_TEMPLATES.get(category, [])]
