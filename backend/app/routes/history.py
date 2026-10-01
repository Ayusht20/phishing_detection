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