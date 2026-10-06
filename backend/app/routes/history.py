import logging
import math
from typing import List, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.scan import Scan
from app.models.user import User
from app.utils.security import get_current_user
from app.schemas.scan import ScanHistoryItem

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/scan", tags=["Threat Scans"])

EMAIL_PREFIX = "[EMAIL]"


# --- Schemas ---
class ScanHistoryPage(BaseModel):
    """Paginated wrapper around scan history records."""

    model_config = ConfigDict(from_attributes=True)

    items: List[ScanHistoryItem]
    total: int
    page: int
    page_size: int
    total_pages: int
    has_next: bool
    has_prev: bool


# --- List (paginated) ---
@router.get("/history", response_model=ScanHistoryPage)
def get_user_scan_history(
    page: int = Query(default=1, ge=1, description="Page number, starting at 1"),
    page_size: int = Query(default=10, ge=1, le=100, description="Records per page"),
    scan_type: Literal["all", "url", "email"] = Query(
        default="all", description="Filter by scan type"
    ),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns a page of the authenticated user's scan history,
    newest records first. Supports filtering by scan type.
    """
    try:
        query = db.query(Scan).filter(Scan.user_id == current_user.id)

        # Email scans are stored with an "[EMAIL]" prefix in `content`.
        is_email = Scan.content.startswith(EMAIL_PREFIX, autoescape=True)

        if scan_type == "email":
            query = query.filter(is_email)
        elif scan_type == "url":
            query = query.filter(or_(Scan.content.is_(None), ~is_email))

        total = query.count()
        total_pages = max(1, math.ceil(total / page_size))

        scans = (
            query.order_by(Scan.id.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )

        return {
            "items": scans,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_prev": page > 1,
        }
    except Exception as exc:
        logger.error(
            f"Failed to fetch scan history for user_id={current_user.id}: {exc}"
        )
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