"""Resolution repository and refund orchestration service (Phase 5)."""

import logging
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional

from promisepay_api.models.promise import AuditTimelineEvent, PromiseStatus
from promisepay_api.models.resolution import (
    CaseTimelineEvent,
    RefundResultResponse,
    ResolutionCaseResponse,
    ResolutionCaseStatus,
    ResolutionDecision,
)
from promisepay_api.services.lock import lock_manager
from promisepay_api.services.paypal_client import paypal_client
from promisepay_api.services.promise_store import promise_store

logger = logging.getLogger("promisepay-resolutions")


class ResolutionStore:
    def __init__(self):
        self._cases: Dict[str, ResolutionCaseResponse] = {}
        self._idempotency_cache: Dict[str, RefundResultResponse] = {}
        self._seed_initial_data()

    def _seed_initial_data(self):
        """Seed initial dispute resolution cases for demonstration."""
        now = datetime.now(timezone.utc).isoformat()
        demo_case = ResolutionCaseResponse(
            caseId="case_demo1_initial",
            promiseId="PP-DEMO1-2026",
            status=ResolutionCaseStatus.OPEN,
            reason="Initial demo resolution case registered for milestone compliance verification.",
            submitter="buyer@example.com",
            submitterRole="BUYER",
            timeline=[
                CaseTimelineEvent(
                    timestamp=now,
                    actor="buyer@example.com",
                    action="CASE_OPENED",
                    notes="Resolution case opened for human compliance adjudication.",
                )
            ],
            createdAt=now,
            updatedAt=now,
        )
        self._cases[demo_case.caseId] = demo_case

    def get_case(self, case_id: str) -> Optional[ResolutionCaseResponse]:
        return self._cases.get(case_id)

    def list_cases_for_promise(self, promise_id: str) -> List[ResolutionCaseResponse]:
        return [c for c in self._cases.values() if c.promiseId == promise_id]

    def open_case(
        self,
        promise_id: str,
        reason: str,
        requested_outcome: str = "REVIEW",
        submitter: str = "buyer@example.com",
        role: str = "BUYER",
    ) -> ResolutionCaseResponse:
        """Opens a resolution case against a promise."""
        promise = promise_store.get(promise_id)
        if not promise:
            raise ValueError(f"Promise '{promise_id}' was not found.")

        now = datetime.now(timezone.utc).isoformat()
        case_id = f"case_{uuid.uuid4().hex[:12]}"

        timeline = [
            CaseTimelineEvent(
                timestamp=now,
                actor=submitter,
                action="CASE_OPENED",
                notes=f"Resolution case opened with reason: {reason}",
            )
        ]

        case = ResolutionCaseResponse(
            caseId=case_id,
            promiseId=promise_id,
            status=ResolutionCaseStatus.OPEN,
            reason=reason,
            submitter=submitter,
            submitterRole=role,
            timeline=timeline,
            createdAt=now,
            updatedAt=now,
        )

        self._cases[case_id] = case

        # Update promise resolution projections
        promise.status = PromiseStatus.REVIEW_REQUIRED
        promise.resolution.status = "OPEN"
        promise.resolution.caseId = case_id
        promise.updated_at = now

        promise.timeline.append(
            AuditTimelineEvent(
                timestamp=now,
                actor=submitter,
                eventType="RESOLUTION_CASE_OPENED",
                summary=f"Resolution case {case_id} opened. Status shifted to REVIEW_REQUIRED.",
            )
        )

        return case

    def record_decision(
        self,
        case_id: str,
        decision: ResolutionDecision,
        reason: str,
        reviewer: str = "reviewer@promisepay.example",
    ) -> ResolutionCaseResponse:
        """Records human reviewer decision with mandatory justification."""
        case = self._cases.get(case_id)
        if not case:
            raise ValueError(f"Resolution case '{case_id}' was not found.")

        if not reason or len(reason.strip()) < 5:
            raise ValueError("Justification reason must be at least 5 characters long.")

        promise = promise_store.get(case.promiseId)
        if not promise:
            raise ValueError(f"Promise '{case.promiseId}' was not found.")

        now = datetime.now(timezone.utc).isoformat()
        case.decision = decision
        case.decisionReason = reason
        case.decisionBy = reviewer
        case.decidedAt = now
        case.updatedAt = now

        if decision == ResolutionDecision.MARK_COMPLETE:
            case.status = ResolutionCaseStatus.RESOLVED_COMPLETE
            promise.status = PromiseStatus.COMPLETE
        elif decision == ResolutionDecision.RECOMMEND_REFUND:
            case.status = ResolutionCaseStatus.DECISION_RECORDED
            promise.resolution.status = "DECISION_RECORDED"
        elif decision == ResolutionDecision.REQUEST_EVIDENCE:
            case.status = ResolutionCaseStatus.EVIDENCE_REQUESTED
            promise.resolution.status = "EVIDENCE_REQUESTED"
        elif decision == ResolutionDecision.OPEN_REVIEW:
            case.status = ResolutionCaseStatus.UNDER_REVIEW
            promise.resolution.status = "UNDER_REVIEW"

        promise.resolution.decision = (
            decision.value if hasattr(decision, "value") else str(decision)
        )
        promise.resolution.reason = reason
        promise.updated_at = now

        case.timeline.append(
            CaseTimelineEvent(
                timestamp=now,
                actor=reviewer,
                action="DECISION_RECORDED",
                notes=f"Decision recorded: {decision}. Reason: {reason}",
            )
        )

        if decision == ResolutionDecision.MARK_COMPLETE:
            promise.timeline.append(
                AuditTimelineEvent(
                    timestamp=now,
                    actor=reviewer,
                    eventType="DECISION_MARK_COMPLETE",
                    summary=f"Human reviewer confirmed completion on case {case_id}: {reason}",
                )
            )

        return case

    async def execute_refund(
        self,
        case_id: str,
        reason: str,
        idempotency_key: str,
        amount_value: Optional[str] = None,
        actor: str = "admin@promisepay.example",
    ) -> RefundResultResponse:
        """Executes a PayPal Sandbox refund with distributed locking, strict human gates, and idempotency protection."""
        if not idempotency_key:
            raise ValueError("Idempotency-Key header is strictly required to execute refunds.")

        # Idempotency cache hit check (24-hour TTL)
        cache_key = f"refund:{case_id}:{idempotency_key}"
        cached = await lock_manager.get_idempotency_result(cache_key)
        if cached:
            logger.info(
                "Returning cached refund result from distributed cache for key %s", idempotency_key
            )
            return RefundResultResponse(**cached)

        if cache_key in self._idempotency_cache:
            logger.info("Returning cached refund result for idempotency key %s", idempotency_key)
            return self._idempotency_cache[cache_key]

        case = self._cases.get(case_id)
        if not case:
            raise ValueError(f"Resolution case '{case_id}' was not found.")

        promise = promise_store.get(case.promiseId)
        if not promise:
            raise ValueError(f"Promise '{case.promiseId}' was not found.")

        # Distributed Lock: Prevent concurrent double-refund race conditions
        lock_key = f"lock:refund:{promise.promise_id}"
        acquired = await lock_manager.acquire_lock(lock_key, ttl_seconds=15)
        if not acquired:
            raise ValueError(
                "Refund operation currently in progress for this agreement. Please retry shortly."
            )

        try:
            # Human gate check: Money cannot move without a confirmed RECOMMEND_REFUND decision
            if case.decision != ResolutionDecision.RECOMMEND_REFUND:
                raise ValueError(
                    f"Refund gate violation: Case '{case_id}' does not have a confirmed 'RECOMMEND_REFUND' decision. "
                    f"Current decision is '{case.decision}'. Reviewer sign-off is mandatory before initiating payment returns."
                )

            if case.status == ResolutionCaseStatus.RESOLVED_REFUNDED:
                raise ValueError(f"Case '{case_id}' has already been refunded.")

            # Payment state check
            if promise.payment.state != "CAPTURED" or not promise.payment.paypalCaptureId:
                raise ValueError(
                    f"Cannot refund promise '{promise.promise_id}': payment state is '{promise.payment.state}', "
                    "not CAPTURED, or PayPal capture ID is missing."
                )

            refund_val = amount_value or promise.payment.amount.value
            currency = promise.payment.amount.currencyCode
            capture_id = promise.payment.paypalCaptureId

            # Execute refund with PayPal client
            paypal_res = await paypal_client.refund_capture(
                paypal_capture_id=capture_id,
                amount_value=refund_val,
                currency_code=currency,
                reason=reason,
                idempotency_key=idempotency_key,
            )

            now = datetime.now(timezone.utc).isoformat()
            refund_id = f"ref_{uuid.uuid4().hex[:10]}"
            paypal_ref_id = paypal_res.get("id", f"PAYPAL_REF_{uuid.uuid4().hex[:8]}")

            # Update case
            case.status = ResolutionCaseStatus.RESOLVED_REFUNDED
            case.refundId = refund_id
            case.paypalRefundId = paypal_ref_id
            case.refundedAmount = refund_val
            case.refundedAt = now
            case.updatedAt = now

            case.timeline.append(
                CaseTimelineEvent(
                    timestamp=now,
                    actor=actor,
                    action="PAYPAL_REFUND_EXECUTED",
                    notes=f"PayPal refund {paypal_ref_id} successfully executed for ${refund_val} {currency}. Reason: {reason}",
                )
            )

            # Update promise payment & resolution projections
            promise.payment.state = "REFUNDED"
            promise.status = PromiseStatus.RESOLVED
            promise.resolution.status = "RESOLVED_REFUNDED"

            promise.timeline.append(
                AuditTimelineEvent(
                    timestamp=now,
                    actor=actor,
                    eventType="PAYPAL_REFUND_EXECUTED",
                    summary=f"PayPal Sandbox refund {paypal_ref_id} completed for ${refund_val} {currency} on case {case_id}.",
                )
            )

            result = RefundResultResponse(
                caseId=case_id,
                promiseId=promise.promise_id,
                refundId=refund_id,
                paypalRefundId=paypal_ref_id,
                amount=refund_val,
                currency=currency,
                status=paypal_res.get("status", "COMPLETED"),
                idempotencyKey=idempotency_key,
                executedAt=now,
            )

            self._idempotency_cache[cache_key] = result
            await lock_manager.set_idempotency_result(
                cache_key, result.model_dump(), ttl_seconds=86400
            )
            return result
        finally:
            await lock_manager.release_lock(lock_key)

    def reset(self):
        """Reset resolution cases and idempotency cache for demo replayability."""
        self._cases.clear()
        self._idempotency_cache.clear()
        self._seed_initial_data()


resolution_store = ResolutionStore()
