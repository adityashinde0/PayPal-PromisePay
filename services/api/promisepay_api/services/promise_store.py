"""Promise data store and repository."""

import random
import string
from datetime import datetime, timezone
from typing import Dict, List, Optional

from promisepay_api.models.promise import (
    AtomicRequirement,
    AuditTimelineEvent,
    Money,
    PaymentSummary,
    PromiseCategory,
    PromiseGraphResponse,
    PromiseStatus,
    PromiseSummaryResponse,
    ResolutionSummary,
    StructuredPromiseVersion,
    VerificationSummary,
)


def generate_promise_id() -> str:
    """Generates a stable public promise ID matching ^PP-[A-Z0-9]{4,12}-\\d{4}$."""
    chars = "".join(random.choices(string.ascii_uppercase + string.digits, k=5))
    year = datetime.now(timezone.utc).year
    return f"PP-{chars}-{year}"


class PromiseRecord:
    def __init__(
        self,
        promise_id: str,
        title: str,
        category: PromiseCategory,
        status: PromiseStatus,
        amount: Money,
        organization_id: str = "00000000-0000-0000-0000-000000000001",
        merchant_order_ref: Optional[str] = None,
    ):
        self.promise_id = promise_id
        self.organization_id = organization_id
        self.title = title
        self.category = category
        self.status = status
        self.amount = amount
        self.merchant_order_ref = merchant_order_ref
        self.created_at = datetime.now(timezone.utc).isoformat()
        self.updated_at = self.created_at

        # Versioning
        self.versions: List[StructuredPromiseVersion] = []
        self.current_requirements: List[AtomicRequirement] = []

        # Payment & lifecycle projections
        self.payment = PaymentSummary(amount=amount)
        self.verification = VerificationSummary()
        self.resolution = ResolutionSummary()
        self.timeline: List[AuditTimelineEvent] = []

    def to_graph_response(self) -> PromiseGraphResponse:
        from promisepay_api.services.evidence_store import evidence_store

        evidence_items = [e.to_response() for e in evidence_store.list_evidence(self.promise_id)]
        return PromiseGraphResponse(
            promiseId=self.promise_id,
            organizationId=self.organization_id,
            title=self.title,
            category=self.category,
            status=self.status,
            amount=self.amount,
            currentVersion=len(self.versions),
            requirements=self.current_requirements,
            payment=self.payment,
            verification=self.verification,
            resolution=self.resolution,
            timeline=self.timeline,
            evidence=evidence_items,
            createdAt=self.created_at,
            updatedAt=self.updated_at,
        )

    def to_summary_response(self) -> PromiseSummaryResponse:
        return PromiseSummaryResponse(
            promiseId=self.promise_id,
            title=self.title,
            category=self.category,
            status=self.status,
            amount=self.amount,
            paymentState=self.payment.state,
            outcome=self.verification.outcome,
            confidence=self.verification.confidence,
            createdAt=self.created_at,
        )


class PromiseStore:
    def __init__(self):
        self._promises: Dict[str, PromiseRecord] = {}
        self._seed_initial_data()

    def _seed_initial_data(self):
        """Seed initial demo promises matching infra/supabase/seed.sql."""
        # 1. Digital Project
        p1 = PromiseRecord(
            promise_id="PP-DEMO1-2026",
            title="Next.js Headless E-Commerce Storefront",
            category=PromiseCategory.DIGITAL_PROJECT,
            status=PromiseStatus.PAID,
            amount=Money(currencyCode="USD", value="450.00"),
            merchant_order_ref="DEMO-1001",
        )
        p1.current_requirements = [
            AtomicRequirement(
                id="req_demo1_ui",
                key="REQ-1",
                title="Responsive Storefront UI",
                description="Mobile-responsive catalog layout with working search and filter controls.",
                priority=1,
                verificationMethod="URL_SCREENSHOT_ANALYSIS",
            ),
            AtomicRequirement(
                id="req_demo1_flow",
                key="REQ-2",
                title="Shopping Cart & Checkout Flow",
                description="Interactive shopping cart supporting item quantity updates and cart summary.",
                priority=1,
                verificationMethod="URL_FUNCTIONAL_AUDIT",
            ),
            AtomicRequirement(
                id="req_demo1_deploy",
                key="REQ-3",
                title="Public Repository & Deployment",
                description="Accessible Git repository and live HTTPS production URL.",
                priority=2,
                verificationMethod="GIT_REPO_AND_DNS_CHECK",
            ),
        ]
        p1.versions.append(
            StructuredPromiseVersion(
                version=1,
                sourceText="Build and deploy a responsive Next.js storefront with customer authentication, product catalog, cart checkout, and production deployment on Vercel.",
                requirements=p1.current_requirements,
                approvedAt=datetime.now(timezone.utc).isoformat(),
                approvedBy="bob.merchant@example.com",
            )
        )
        p1.payment.state = "CAPTURED"
        p1.payment.paypalOrderId = "8XY82019AA120934K"
        p1.payment.paypalCaptureId = "44D091243B590219M"
        p1.payment.createdAt = p1.created_at
        p1.payment.capturedAt = p1.created_at
        p1.payment.buyerApproved = True
        p1.payment.webhookVerified = False
        p1.payment.webhookStatus = "AWAITING_ENDPOINT"
        p1.payment.paymentMode = "Real PayPal Sandbox"
        p1.timeline.append(
            AuditTimelineEvent(
                timestamp=datetime.now(timezone.utc).isoformat(),
                actor="System",
                eventType="PROMISE_CREATED",
                summary="Promise created in DRAFT state.",
            )
        )
        p1.timeline.append(
            AuditTimelineEvent(
                timestamp=datetime.now(timezone.utc).isoformat(),
                actor="bob.merchant@example.com",
                eventType="REQUIREMENTS_CONFIRMED",
                summary="Requirements approved; transitioned to READY_FOR_PAYMENT.",
            )
        )
        p1.timeline.append(
            AuditTimelineEvent(
                timestamp=datetime.now(timezone.utc).isoformat(),
                actor="PayPal Sandbox",
                eventType="PAYMENT_CAPTURED",
                summary="PayPal capture 44D091243B590219M confirmed for $450.00 USD.",
            )
        )
        self._promises[p1.promise_id] = p1

        # 2. Professional Document
        p2 = PromiseRecord(
            promise_id="PP-DEMO2-2026",
            title="SOC2 Type II Readiness & Threat Model Whitepaper",
            category=PromiseCategory.PROFESSIONAL_DOCUMENT,
            status=PromiseStatus.READY_FOR_PAYMENT,
            amount=Money(currencyCode="USD", value="300.00"),
            merchant_order_ref="DEMO-1002",
        )
        p2.current_requirements = [
            AtomicRequirement(
                id="req_demo2_sec",
                key="REQ-1",
                title="Required Security Sections",
                description="Includes Executive Summary, Architecture, STRIDE Threat Model, and Access Matrix.",
                priority=1,
                verificationMethod="DOCUMENT_STRUCTURE_ANALYSIS",
            ),
            AtomicRequirement(
                id="req_demo2_len",
                key="REQ-2",
                title="Minimum Length & Citations",
                description="Document contains at least 15 substantive pages and external citations.",
                priority=2,
                verificationMethod="DOCUMENT_METRIC_CHECK",
            ),
        ]
        p2.versions.append(
            StructuredPromiseVersion(
                version=1,
                sourceText="Comprehensive 15+ page security architecture document covering trust boundaries, STRIDE threat analysis, and access policies.",
                requirements=p2.current_requirements,
                approvedAt=datetime.now(timezone.utc).isoformat(),
                approvedBy="bob.merchant@example.com",
            )
        )
        p2.timeline.append(
            AuditTimelineEvent(
                timestamp=datetime.now(timezone.utc).isoformat(),
                actor="bob.merchant@example.com",
                eventType="REQUIREMENTS_CONFIRMED",
                summary="Requirements approved and ready for buyer checkout.",
            )
        )
        self._promises[p2.promise_id] = p2

        # 3. Delivery
        p3 = PromiseRecord(
            promise_id="PP-DEMO3-2026",
            title="IoT Development Sensor Kit Dispatch",
            category=PromiseCategory.DELIVERY,
            status=PromiseStatus.DRAFT,
            amount=Money(currencyCode="USD", value="120.00"),
            merchant_order_ref="DEMO-1003",
        )
        p3.current_requirements = [
            AtomicRequirement(
                id="req_demo3_trk",
                key="REQ-1",
                title="Valid Carrier Tracking",
                description="Verifiable carrier tracking number and dispatch status within 48h.",
                priority=1,
                verificationMethod="CARRIER_TRACKING_ADAPTER",
            ),
            AtomicRequirement(
                id="req_demo3_del",
                key="REQ-2",
                title="Delivery Confirmation",
                description="Carrier status confirms delivered to recipient destination.",
                priority=1,
                verificationMethod="CARRIER_DELIVERY_CONFIRM",
            ),
        ]
        p3.versions.append(
            StructuredPromiseVersion(
                version=1,
                sourceText="Express shipment of IoT sensor hardware kit with tracking number and signed delivery receipt.",
                requirements=p3.current_requirements,
            )
        )
        p3.timeline.append(
            AuditTimelineEvent(
                timestamp=datetime.now(timezone.utc).isoformat(),
                actor="System",
                eventType="PROMISE_CREATED",
                summary="Promise created in DRAFT state.",
            )
        )
        self._promises[p3.promise_id] = p3

    def create(
        self,
        category: PromiseCategory,
        title: str,
        promise_text: str,
        amount: Money,
        requirements: List[AtomicRequirement],
        merchant_order_ref: Optional[str] = None,
        actor: str = "merchant",
    ) -> PromiseRecord:
        promise_id = generate_promise_id()
        record = PromiseRecord(
            promise_id=promise_id,
            title=title,
            category=category,
            status=PromiseStatus.DRAFT,
            amount=amount,
            merchant_order_ref=merchant_order_ref,
        )
        record.current_requirements = requirements
        record.versions.append(
            StructuredPromiseVersion(
                version=1,
                sourceText=promise_text,
                requirements=[req.model_copy() for req in requirements],
            )
        )
        record.timeline.append(
            AuditTimelineEvent(
                timestamp=datetime.now(timezone.utc).isoformat(),
                actor=actor,
                eventType="PROMISE_CREATED",
                summary=f"Promise created with {len(requirements)} extracted requirements in DRAFT status.",
            )
        )
        self._promises[promise_id] = record
        return record

    def get(self, promise_id: str) -> Optional[PromiseRecord]:
        return self._promises.get(promise_id)

    def update(
        self,
        promise_id: str,
        title: Optional[str] = None,
        promise_text: Optional[str] = None,
        requirements: Optional[List[AtomicRequirement]] = None,
        actor: str = "merchant",
    ) -> Optional[PromiseRecord]:
        record = self.get(promise_id)
        if not record:
            return None

        if record.status not in (PromiseStatus.DRAFT, PromiseStatus.READY_FOR_PAYMENT):
            raise ValueError(f"Cannot update promise in status {record.status}")

        if title:
            record.title = title

        if requirements is not None:
            record.current_requirements = requirements

        # Increment version snapshot
        new_version_num = len(record.versions) + 1
        source_text = promise_text or (record.versions[-1].sourceText if record.versions else "")
        record.versions.append(
            StructuredPromiseVersion(
                version=new_version_num,
                sourceText=source_text,
                requirements=[req.model_copy() for req in record.current_requirements],
            )
        )

        record.updated_at = datetime.now(timezone.utc).isoformat()
        record.timeline.append(
            AuditTimelineEvent(
                timestamp=record.updated_at,
                actor=actor,
                eventType="PROMISE_UPDATED",
                summary=f"Updated to version {new_version_num}.",
            )
        )
        return record

    def confirm(self, promise_id: str, actor: str = "merchant") -> Optional[PromiseRecord]:
        record = self.get(promise_id)
        if not record:
            return None

        if record.status != PromiseStatus.DRAFT:
            raise ValueError(
                f"Promise is already in status {record.status}; only DRAFT can be confirmed"
            )

        now = datetime.now(timezone.utc).isoformat()
        record.status = PromiseStatus.READY_FOR_PAYMENT
        if record.versions:
            record.versions[-1].approvedAt = now
            record.versions[-1].approvedBy = actor

        record.updated_at = now
        record.timeline.append(
            AuditTimelineEvent(
                timestamp=now,
                actor=actor,
                eventType="REQUIREMENTS_CONFIRMED",
                summary="Merchant confirmed atomic requirements. Promise is now READY_FOR_PAYMENT.",
            )
        )
        return record

    def list(
        self,
        category: Optional[PromiseCategory] = None,
        status: Optional[PromiseStatus] = None,
        q: Optional[str] = None,
    ) -> List[PromiseRecord]:
        items = list(self._promises.values())

        if category:
            items = [item for item in items if item.category == category]

        if status:
            items = [item for item in items if item.status == status]

        if q:
            query = q.lower()
            items = [
                item
                for item in items
                if query in item.title.lower() or query in item.promise_id.lower()
            ]

        # Sort descending by creation date
        items.sort(key=lambda x: x.created_at, reverse=True)
        return items

    def reset(self):
        """Reset store to default initial seed promises for demo replayability."""
        self._promises.clear()
        self._seed_initial_data()


# Global singleton instance
promise_store = PromiseStore()
