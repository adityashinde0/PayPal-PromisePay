"""Database repository implementation for PromisePay entities."""

import logging
from typing import Any, Dict, List, Optional

from sqlalchemy import delete, select
from sqlalchemy.orm import selectinload

from promisepay_api.db.database import AsyncSessionLocal
from promisepay_api.db.models import (
    AuditLogModel,
    EvidenceModel,
    PaymentModel,
    PromiseModel,
    PromiseRequirementModel,
    PromiseVersionModel,
    ResolutionCaseModel,
    VerificationRunModel,
)

logger = logging.getLogger("promisepay-repository")


class DatabaseRepository:
    """Async database repository implementing CRUD persistence across all models."""

    @staticmethod
    async def save_promise(
        promise_id: str,
        title: str,
        category: str,
        status: str,
        amount_value: float,
        currency_code: str = "USD",
        organization_id: str = "00000000-0000-0000-0000-000000000001",
        merchant_order_ref: Optional[str] = None,
        versions_data: Optional[List[Dict[str, Any]]] = None,
        requirements_data: Optional[List[Dict[str, Any]]] = None,
    ) -> PromiseModel:
        async with AsyncSessionLocal() as session:
            stmt = select(PromiseModel).where(PromiseModel.promise_id == promise_id)
            res = await session.execute(stmt)
            record = res.scalars().first()

            if not record:
                record = PromiseModel(
                    promise_id=promise_id,
                    organization_id=organization_id,
                    title=title,
                    category=category,
                    status=status,
                    amount_value=amount_value,
                    currency_code=currency_code,
                    merchant_order_ref=merchant_order_ref,
                )
                session.add(record)
                await session.flush()
            else:
                record.title = title
                record.category = category
                record.status = status
                record.amount_value = amount_value
                record.currency_code = currency_code
                record.merchant_order_ref = merchant_order_ref
                await session.flush()

            # Save version and requirements
            if versions_data:
                for v in versions_data:
                    ver_num = v.get("version", 1)
                    v_stmt = select(PromiseVersionModel).where(
                        PromiseVersionModel.promise_id == record.id,
                        PromiseVersionModel.version == ver_num,
                    )
                    v_res = await session.execute(v_stmt)
                    v_record = v_res.scalars().first()
                    if not v_record:
                        v_record = PromiseVersionModel(
                            promise_id=record.id,
                            version=ver_num,
                            source_text=v.get("sourceText", ""),
                            structured_promise=v.get("structuredPromise", {}),
                            approved_by=v.get("approvedBy"),
                        )
                        session.add(v_record)
                        await session.flush()

                    if requirements_data:
                        for req in requirements_data:
                            r_key = req.get("key", "")
                            r_stmt = select(PromiseRequirementModel).where(
                                PromiseRequirementModel.promise_version_id == v_record.id,
                                PromiseRequirementModel.key == r_key,
                            )
                            r_res = await session.execute(r_stmt)
                            r_record = r_res.scalars().first()
                            if not r_record:
                                r_record = PromiseRequirementModel(
                                    promise_version_id=v_record.id,
                                    key=r_key,
                                    title=req.get("title", ""),
                                    description=req.get("description", ""),
                                    priority=req.get("priority", 1),
                                    verification_method=req.get("verificationMethod", "URL_SCREENSHOT_ANALYSIS"),
                                )
                                session.add(r_record)

            await session.commit()
            return record

    @staticmethod
    async def get_promise(promise_id: str) -> Optional[PromiseModel]:
        async with AsyncSessionLocal() as session:
            stmt = (
                select(PromiseModel)
                .options(
                    selectinload(PromiseModel.versions).selectinload(PromiseVersionModel.requirements),
                    selectinload(PromiseModel.evidence),
                    selectinload(PromiseModel.payments),
                    selectinload(PromiseModel.resolution_cases),
                )
                .where(PromiseModel.promise_id == promise_id)
            )
            res = await session.execute(stmt)
            return res.scalars().first()

    @staticmethod
    async def list_promises() -> List[PromiseModel]:
        async with AsyncSessionLocal() as session:
            stmt = select(PromiseModel).order_by(PromiseModel.created_at.desc())
            res = await session.execute(stmt)
            return list(res.scalars().all())

    @staticmethod
    async def save_evidence(
        promise_id_str: str,
        evidence_id: str,
        kind: str,
        sha256: str,
        title: str,
        source_uri: Optional[str] = None,
        storage_key: Optional[str] = None,
        summary: Optional[str] = None,
        submitter_claim: Optional[str] = None,
        provenance_json: Optional[Dict[str, Any]] = None,
    ) -> EvidenceModel:
        async with AsyncSessionLocal() as session:
            p_stmt = select(PromiseModel).where(PromiseModel.promise_id == promise_id_str)
            p_res = await session.execute(p_stmt)
            promise = p_res.scalars().first()
            if not promise:
                raise ValueError(f"Promise {promise_id_str} not found in DB")

            e_stmt = select(EvidenceModel).where(EvidenceModel.evidence_id == evidence_id)
            e_res = await session.execute(e_stmt)
            ev = e_res.scalars().first()

            if not ev:
                ev = EvidenceModel(
                    promise_id=promise.id,
                    evidence_id=evidence_id,
                    kind=kind,
                    sha256=sha256,
                    title=title,
                    source_uri=source_uri,
                    storage_key=storage_key,
                    summary=summary,
                    submitter_claim=submitter_claim,
                    provenance_json=provenance_json or {},
                )
                session.add(ev)
            else:
                ev.title = title
                ev.sha256 = sha256
                ev.source_uri = source_uri
                ev.storage_key = storage_key
                ev.summary = summary
                ev.submitter_claim = submitter_claim
                ev.provenance_json = provenance_json or {}

            await session.commit()
            return ev

    @staticmethod
    async def save_resolution_case(case_data: Dict[str, Any]) -> ResolutionCaseModel:
        async with AsyncSessionLocal() as session:
            promise_id_str = case_data.get("promiseId", "")
            p_stmt = select(PromiseModel).where(PromiseModel.promise_id == promise_id_str)
            p_res = await session.execute(p_stmt)
            promise = p_res.scalars().first()
            if not promise:
                raise ValueError(f"Promise {promise_id_str} not found for resolution case")

            case_id = case_data.get("caseId", "")
            c_stmt = select(ResolutionCaseModel).where(ResolutionCaseModel.case_id == case_id)
            c_res = await session.execute(c_stmt)
            c_record = c_res.scalars().first()

            if not c_record:
                c_record = ResolutionCaseModel(
                    case_id=case_id,
                    promise_id=promise.id,
                    status=case_data.get("status", "OPEN"),
                    opened_by=case_data.get("openedBy"),
                    role=case_data.get("role", "BUYER"),
                    reason=case_data.get("reason", ""),
                    requested_outcome=case_data.get("requestedOutcome", "REVIEW"),
                    decision=case_data.get("decision"),
                    refund_id=case_data.get("refundId"),
                    paypal_refund_id=case_data.get("paypalRefundId"),
                    timeline=case_data.get("timeline", []),
                )
                session.add(c_record)
            else:
                c_record.status = case_data.get("status", "OPEN")
                c_record.decision = case_data.get("decision")
                c_record.refund_id = case_data.get("refundId")
                c_record.paypal_refund_id = case_data.get("paypalRefundId")
                c_record.timeline = case_data.get("timeline", [])

            await session.commit()
            return c_record

    @staticmethod
    async def save_verification_run(run_data: Dict[str, Any]) -> VerificationRunModel:
        async with AsyncSessionLocal() as session:
            run_id = run_data.get("runId", "")
            stmt = select(VerificationRunModel).where(VerificationRunModel.run_id == run_id)
            res = await session.execute(stmt)
            record = res.scalars().first()

            if not record:
                record = VerificationRunModel(
                    run_id=run_id,
                    promise_id=run_data.get("promiseId", ""),
                    state=run_data.get("state", "QUEUED"),
                    outcome=run_data.get("outcome", "PENDING"),
                    overall_confidence=float(run_data.get("overallConfidence", 0.0) or 0.0),
                    evidence_manifest_hash=run_data.get("evidenceManifestHash", ""),
                    results=run_data.get("results", []),
                    model_metadata=run_data.get("deterministicChecks", {}),
                )
                session.add(record)
            else:
                record.state = run_data.get("state", "COMPLETED")
                record.outcome = run_data.get("outcome", "PENDING")
                record.overall_confidence = float(run_data.get("overallConfidence", 0.0) or 0.0)
                record.results = run_data.get("results", [])
                record.model_metadata = run_data.get("deterministicChecks", {})

            await session.commit()
            return record

    @staticmethod
    async def clear_all_data() -> None:
        """Resets all database tables for test isolation."""
        async with AsyncSessionLocal() as session:
            await session.execute(delete(AuditLogModel))
            await session.execute(delete(ResolutionCaseModel))
            await session.execute(delete(VerificationRunModel))
            await session.execute(delete(EvidenceModel))
            await session.execute(delete(PaymentModel))
            await session.execute(delete(PromiseRequirementModel))
            await session.execute(delete(PromiseVersionModel))
            await session.execute(delete(PromiseModel))
            await session.commit()

