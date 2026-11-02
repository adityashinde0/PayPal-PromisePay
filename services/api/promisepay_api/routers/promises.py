"""Promise management API router."""

from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query, status

from promisepay_api.models.promise import (
    AtomicRequirement,
    CreatePromiseRequest,
    PromiseCategory,
    PromiseGraphResponse,
    PromiseListResponse,
    PromiseStatus,
    UpdatePromiseRequest,
)
from promisepay_api.services.extractor import extract_requirements
from promisepay_api.services.promise_store import promise_store
from promisepay_api.services.templates import get_template_requirements

router = APIRouter(prefix="/promises", tags=["Promises"])


@router.get("", response_model=PromiseListResponse)
async def list_promises(
    category: Optional[PromiseCategory] = Query(None, description="Filter by category"),
    status_filter: Optional[PromiseStatus] = Query(
        None, alias="status", description="Filter by lifecycle status"
    ),
    q: Optional[str] = Query(None, description="Search by title or Promise ID"),
):
    """Retrieves list of promises for the Promise Ledger."""
    records = promise_store.list(category=category, status=status_filter, q=q)
    return PromiseListResponse(
        items=[r.to_summary_response() for r in records],
        total=len(records),
    )


@router.get("/templates/{category}", response_model=List[AtomicRequirement])
async def get_category_template(category: PromiseCategory):
    """Returns the default atomic requirements for a given category."""
    return get_template_requirements(category)


@router.post("", response_model=PromiseGraphResponse, status_code=status.HTTP_201_CREATED)
async def create_promise(req: CreatePromiseRequest):
    """Creates a draft promise, runs requirement extraction, and creates initial version."""
    extracted_reqs = await extract_requirements(req.category, req.promiseText)

    record = promise_store.create(
        category=req.category,
        title=req.title,
        promise_text=req.promiseText,
        amount=req.amount,
        requirements=extracted_reqs,
        merchant_order_ref=req.merchantOrderRef,
    )
    return record.to_graph_response()


@router.get("/{promise_id}", response_model=PromiseGraphResponse)
async def get_promise(promise_id: str):
    """Retrieves full Promise Graph projection by Promise ID."""
    record = promise_store.get(promise_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Promise with ID '{promise_id}' was not found.",
        )
    return record.to_graph_response()


@router.patch("/{promise_id}", response_model=PromiseGraphResponse)
async def update_promise(promise_id: str, req: UpdatePromiseRequest):
    """Updates editable draft/ready-for-payment promise and requirements, creating a new version."""
    try:
        updated = promise_store.update(
            promise_id=promise_id,
            title=req.title,
            promise_text=req.promiseText,
            requirements=req.requirements,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e

    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Promise with ID '{promise_id}' was not found.",
        )
    return updated.to_graph_response()


@router.post("/{promise_id}/confirm", response_model=PromiseGraphResponse)
async def confirm_promise(promise_id: str):
    """Explicit merchant confirmation of extracted/edited requirements, locking for checkout."""
    try:
        confirmed = promise_store.confirm(promise_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e

    if not confirmed:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Promise with ID '{promise_id}' was not found.",
        )
    return confirmed.to_graph_response()
