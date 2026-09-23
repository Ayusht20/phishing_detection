from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.scan import Scan
from app.models.user import User
from app.schemas.scan import ScanRequest, ScanResponse
from app.services.virustotal import scan_url as virus_total_scan
from app.services.safebrowsing import check_url
from app.utils.security import get_current_user


router = APIRouter(prefix="/api/scan", tags=["URL Security"])


@router.post("/url", response_model=ScanResponse)
async def scan(
    scan_data: ScanRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    url = str(scan_data.url)
    # Check with VirusTotal
    virus_total_result = await virus_total_scan(url)

    # Check with Google Safe Browsing
    safe_browsing_result = await check_url(url)

    # Determine risk using both security services
    virus_total_stats = virus_total_result.get("stats", {})

    virus_total_malicious = virus_total_stats.get("malicious", 0)
    virus_total_suspicious = virus_total_stats.get("suspicious", 0)

    if safe_browsing_result:
        result = "phishing"
        risk_level = "high"

    elif virus_total_malicious > 0:
        result = "phishing"
        risk_level = "high"

    elif virus_total_suspicious > 0:
        result = "suspicious"
        risk_level = "medium"

    else:
        result = "safe"
        risk_level = "low"

    # Save scan to database
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