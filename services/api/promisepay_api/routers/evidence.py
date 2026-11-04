"""Evidence API Router for Phase 3."""

import base64
import json
import logging
from typing import Optional

from fastapi import APIRouter, File, Form, HTTPException, Request, Response, UploadFile, status

from promisepay_api.models.evidence import (
    EvidenceListResponse,
    EvidenceResponse,
    EvidenceUploadIntentRequest,
    EvidenceUploadIntentResponse,
    RegisterEvidenceRequest,
)
from promisepay_api.services.evidence_guard import (
    compute_sha256,
    sanitize_filename,
    validate_file_metadata,
)
from promisepay_api.services.evidence_store import evidence_store
from promisepay_api.services.multimodal_ai import multimodal_ai
from promisepay_api.services.promise_store import promise_store
from promisepay_api.services.scraper import scraper

logger = logging.getLogger("promisepay-evidence")

router = APIRouter(prefix="/promises", tags=["Evidence"])


@router.post(
    "/{promise_id}/evidence/upload-intents",
    response_model=EvidenceUploadIntentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_upload_intent(
    promise_id: str,
    request_data: EvidenceUploadIntentRequest,
    request: Request,
):
    """Generates a short-lived signed upload URL and storage key after validating metadata."""
    promise = promise_store.get(promise_id)
    if not promise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Promise with ID '{promise_id}' was not found.",
        )

    base_url = str(request.base_url).rstrip("/")
    try:
        response = evidence_store.create_upload_intent(promise, request_data, base_url=base_url)
        return response
    except ValueError as err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(err)) from err


@router.put("/{promise_id}/evidence/uploads/{evidence_id}")
async def upload_file_content(
    promise_id: str,
    evidence_id: str,
    request: Request,
):
    """Upload target for binary file upload matching pre-signed intent."""
    promise = promise_store.get(promise_id)
    if not promise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Promise with ID '{promise_id}' was not found.",
        )

    content = await request.body()
    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Request body cannot be empty.",
        )

    try:
        intent = evidence_store.store_uploaded_content(evidence_id, content)
        return {
            "evidenceId": evidence_id,
            "status": "UPLOADED",
            "sha256": intent.uploaded_sha256,
            "sizeBytes": len(content),
            "storageKey": intent.storage_key,
        }
    except KeyError as err:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(err)) from err
    except ValueError as err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(err)) from err


@router.post(
    "/{promise_id}/evidence",
    response_model=EvidenceResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register_evidence(
    promise_id: str,
    request_data: RegisterEvidenceRequest,
    request: Request,
):
    """Registers evidence (URL, repository, tracking reference, or uploaded file).

    Validates provenance, enforces SSRF defenses, and links evidence to requirements.
    """
    promise = promise_store.get(promise_id)
    if not promise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Promise with ID '{promise_id}' was not found.",
        )

    try:
        record = evidence_store.register_evidence(promise, request_data)
        if request_data.kind in ("live_url", "url_snapshot", "repository", "git_repository") and request_data.source:
            try:
                crawl_res = await scraper.scrape_deliverable(request_data.source)
                if record.provenance:
                    record.provenance.metadata["crawler"] = crawl_res
                    record.provenance.metadata["screenshotBase64"] = crawl_res.get("screenshotBase64")
                    record.provenance.metadata["latencyMs"] = crawl_res.get("latencyMs")
                    record.provenance.metadata["statusCode"] = crawl_res.get("statusCode")
            except Exception as exc:
                logger.warning("Scraper fallback: %s", exc)

        base_url = str(request.base_url).rstrip("/")
        return record.to_response(base_url=base_url)
    except ValueError as err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(err)) from err


@router.post(
    "/{promise_id}/evidence/files",
    response_model=EvidenceResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_evidence_file_direct(
    promise_id: str,
    request: Request,
    file: UploadFile = File(...),
    requirement_ids: str = Form(...),
    submitter_claim: str = Form(...),
    title: Optional[str] = Form(None),
):
    """Direct multipart file upload with automated checksum, validation, and registration."""
    promise = promise_store.get(promise_id)
    if not promise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Promise with ID '{promise_id}' was not found.",
        )

    # Parse requirement IDs JSON array or comma-separated
    try:
        if requirement_ids.startswith("["):
            req_ids_list = json.loads(requirement_ids)
        else:
            req_ids_list = [r.strip() for r in requirement_ids.split(",") if r.strip()]
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid requirementIds format. Provide a JSON array or comma-separated list.",
        ) from err

    if not req_ids_list:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one requirement ID must be linked.",
        )

    file_bytes = await file.read()
    mime_type = file.content_type or "application/octet-stream"
    file_name = file.filename or "evidence_file"

    try:
        validate_file_metadata(file_name, mime_type, len(file_bytes))
    except ValueError as err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(err)) from err

    # Create upload intent & store content
    intent_req = EvidenceUploadIntentRequest(
        fileName=file_name,
        mimeType=mime_type,
        sizeBytes=len(file_bytes),
        requirementIds=req_ids_list,
    )
    base_url = str(request.base_url).rstrip("/")
    intent_resp = evidence_store.create_upload_intent(promise, intent_req, base_url=base_url)
    evidence_store.store_uploaded_content(intent_resp.evidenceId, file_bytes)

    # Determine kind
    kind = "screenshot" if mime_type.startswith("image/") else "document"

    # Register
    reg_req = RegisterEvidenceRequest(
        kind=kind,
        title=title or f"File - {sanitize_filename(file_name)}",
        source=file_name,
        requirementIds=req_ids_list,
        submitterClaim=submitter_claim,
        evidenceId=intent_resp.evidenceId,
        storageKey=intent_resp.storageKey,
        sha256=compute_sha256(file_bytes),
        mimeType=mime_type,
        sizeBytes=len(file_bytes),
    )

    try:
        record = evidence_store.register_evidence(promise, reg_req)
        try:
            reqs = [
                {"id": getattr(r, "id", None) or r.key, "key": r.key, "title": r.title}
                for r in promise.current_requirements
            ]
            ocr_result = await multimodal_ai.extract_document_ocr(
                file_bytes=file_bytes,
                mime_type=mime_type,
                requirements=reqs,
            )
            if record.provenance:
                record.provenance.metadata["multimodalAi"] = ocr_result
                if mime_type.startswith("image/"):
                    record.provenance.metadata["screenshotBase64"] = (
                        f"data:{mime_type};base64,{base64.b64encode(file_bytes).decode('utf-8')}"
                    )
        except Exception as exc:
            logger.warning("Multimodal AI extraction fallback: %s", exc)

        return record.to_response(base_url=base_url)
    except ValueError as err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(err)) from err


@router.get(
    "/{promise_id}/evidence",
    response_model=EvidenceListResponse,
)
async def list_promise_evidence(
    promise_id: str,
    request: Request,
):
    """Retrieves all evidence submitted for the specified promise with provenance data."""
    promise = promise_store.get(promise_id)
    if not promise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Promise with ID '{promise_id}' was not found.",
        )

    base_url = str(request.base_url).rstrip("/")
    items = evidence_store.list_evidence(promise_id)
    responses = [item.to_response(base_url=base_url) for item in items]
    return EvidenceListResponse(
        promiseId=promise_id,
        items=responses,
        total=len(responses),
    )


@router.get("/{promise_id}/evidence/{evidence_id}/download")
async def download_evidence_file(
    promise_id: str,
    evidence_id: str,
):
    """Safely retrieves uploaded file content with defensive HTTP security headers."""
    promise = promise_store.get(promise_id)
    if not promise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Promise with ID '{promise_id}' was not found.",
        )

    item = evidence_store.get_evidence_item(promise_id, evidence_id)
    if not item or not item.storage_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Evidence item '{evidence_id}' has no associated file content.",
        )

    content = evidence_store.get_file_bytes(item.storage_key)
    if not content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File content not found in storage.",
        )

    mime_type = item.provenance.mimeType if item.provenance else "application/octet-stream"
    filename = item.storage_key.split("/")[-1]

    headers = {
        "Content-Disposition": f'inline; filename="{filename}"',
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'",
    }
    return Response(content=content, media_type=mime_type, headers=headers)
