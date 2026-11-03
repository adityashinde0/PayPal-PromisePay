"""PayPal Customer Disputes API Router (Phase 3 Enterprise Integration)."""

import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from promisepay_api.auth import AuthenticatedUser, require_roles
from promisepay_api.services.paypal_client import paypal_client
from promisepay_api.services.promise_store import promise_store
from promisepay_api.services.rust_verifier import seal_dispute_dossier

logger = logging.getLogger("promisepay-disputes")
router = APIRouter(prefix="/disputes", tags=["PayPal Disputes"])


@router.get("", summary="List disputes from PayPal Disputes API")
async def list_paypal_disputes(
    state: Optional[str] = Query(None, description="Filter by dispute state"),
    current_user: AuthenticatedUser = Depends(require_roles(["REVIEWER", "ADMIN"])),
):
    """Retrieves dispute cases directly from PayPal Customer Disputes API (/v1/customer/disputes)."""
    disputes = await paypal_client.list_disputes(state=state)
    return {"items": disputes, "total": len(disputes), "mode": "LIVE_OR_SANDBOX"}


@router.get("/{dispute_id}", summary="Get dispute details by ID")
async def get_paypal_dispute(
    dispute_id: str,
    current_user: AuthenticatedUser = Depends(require_roles(["REVIEWER", "ADMIN"])),
):
    """Fetches details for a specific dispute from PayPal."""
    dispute = await paypal_client.get_dispute(dispute_id)
    if not dispute:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dispute '{dispute_id}' not found on PayPal API.",
        )
    return dispute


@router.post(
    "/{dispute_id}/submit-dossier",
    summary="Automatically compile and submit cryptographic Merkle dossier to PayPal Dispute",
)
async def submit_dossier_to_paypal_dispute(
    dispute_id: str,
    promise_id: str = Query(..., description="Target promise ID to seal"),
    current_user: AuthenticatedUser = Depends(require_roles(["REVIEWER", "ADMIN"])),
):
    """Compiles the Rust SHA-256 Merkle dossier and automatically uploads it to PayPal's Customer Disputes API."""
    promise = promise_store.get(promise_id)
    if not promise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Promise '{promise_id}' not found.",
        )

    from promisepay_api.routers.resolutions import generate_dispute_defense_dossier

    dossier = await generate_dispute_defense_dossier(promise_id=promise_id, download=False)

    res = await paypal_client.provide_dispute_evidence(dispute_id=dispute_id, dossier_data=dossier)
    return {
        "status": "DOSSIER_UPLOADED",
        "disputeId": dispute_id,
        "promiseId": promise_id,
        "merkleRoot": dossier.get("cryptographicProof", {}).get("merkle_root"),
        "paypalResult": res,
    }

