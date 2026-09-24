import asyncio
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.scan import Scan
from app.models.user import User
from app.schemas.scan import ScanRequest, ScanResponse
from app.services.virustotal import scan_url as virus_total_scan
from app.services.safebrowsing import check_url
from app.utils.security import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/scan", tags=["URL Security"])


@router.post("/url", response_model=ScanResponse)
async def scan(
    scan_data: ScanRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    url = str(scan_data.url).strip()

    # 1. Run external vendor checks concurrently to cut latency
    try:
        virus_total_result, safe_browsing_result = await asyncio.gather(
            virus_total_scan(url),
            check_url(url),
            return_exceptions=True
        )
    except Exception as exc:
        logger.error(f"Error executing security services: {exc}")
        virus_total_result = {}
        safe_browsing_result = False

    # Handle exceptions gracefully if return_exceptions caught them
    if isinstance(virus_total_result, Exception):
        logger.warning(f"VirusTotal error: {virus_total_result}")
        virus_total_result = {}

    if isinstance(safe_browsing_result, Exception):
        logger.warning(f"Google Safe Browsing error: {safe_browsing_result}")
        safe_browsing_result = False

    # 2. Extract stats safely
    virus_total_stats = virus_total_result.get("stats", {}) if isinstance(virus_total_result, dict) else {}
    malicious_count = virus_total_stats.get("malicious", 0)
    suspicious_count = virus_total_stats.get("suspicious", 0)

    # 3. Risk Assessment Engine
    # Safe Browsing flag OR 2+ VT vendors = confirmed high risk phishing
    if safe_browsing_result or malicious_count >= 2:
        result = "phishing"
        risk_level = "high"
    elif malicious_count == 1 or suspicious_count > 0:
        result = "suspicious"
        risk_level = "medium"
    else:
        result = "safe"
        risk_level = "low"

    # 4. Safe Database Persistence
    try:
        new_scan = Scan(
            user_id=current_user.id,
            content=url,
            result=result,
            risk_level=risk_level
        )
        db.add(new_scan)
        db.commit()
        db.refresh(new_scan)
        return new_scan
    except Exception as db_exc:
        db.rollback()
        logger.error(f"Database error while saving scan: {db_exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to record scan result."
        )