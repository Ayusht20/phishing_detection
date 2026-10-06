import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.scan import Scan
from app.models.user import User
from app.utils.security import get_current_user
from app.schemas.scan import ScanHistoryItem
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/scan", tags=["Threat Scans"])



# --- Endpoint ---
@router.get("/history", response_model=List[ScanHistoryItem])
def get_user_scan_history(
    limit: int = Query(default=20, ge=1, le=100, description="Max records to return"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns the scan history for the authenticated user,
    ordered chronologically with the newest records first.
    """
    try:
        scans = (
            db.query(Scan)
            .filter(Scan.user_id == current_user.id)
            .order_by(Scan.id.desc())
            .limit(limit)
            .all()
        )
        return scans
    except Exception as exc:
        logger.error(f"Failed to fetch scan history for user_id={current_user.id}: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve scan history from database.",
        )
    # --- Delete a single scan ---
@router.delete("/history/{scan_id}")
def delete_scan_history(
    scan_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Deletes a single scan history record belonging to the authenticated user.
    """
    scan = (
        db.query(Scan)
        .filter(
            Scan.id == scan_id,
            Scan.user_id == current_user.id,
        )
        .first()
    )

    if not scan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scan history record not found.",
        )

    try:
        db.delete(scan)
        db.commit()

        return {
            "message": "Scan history record deleted successfully.",
            "id": scan_id,
        }

    except Exception as exc:
        db.rollback()
        logger.error(
            f"Failed to delete scan_id={scan_id} "
            f"for user_id={current_user.id}: {exc}"
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete scan history record.",
        )


# --- Clear all scan history ---
@router.delete("/history")
def clear_scan_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Deletes all scan history records belonging to the authenticated user.
    """
    try:
        deleted_count = (
            db.query(Scan)
            .filter(Scan.user_id == current_user.id)
            .delete(synchronize_session=False)
        )

        db.commit()

        return {
            "message": "Scan history cleared successfully.",
            "deleted_count": deleted_count,
        }

    except Exception as exc:
        db.rollback()
        logger.error(
            f"Failed to clear scan history for user_id={current_user.id}: {exc}"
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to clear scan history.",
        )
