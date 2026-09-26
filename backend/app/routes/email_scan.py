import asyncio
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.scan import Scan
from app.models.user import User
from app.schemas.email_scan import EmailScanRequest, EmailScanResponse
from app.services.ai_email import analyze_email_with_ai
from app.services.email_rules import analyze_email_rules
from app.services.safebrowsing import check_url
from app.utils.security import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/scan", tags=["Email Analysis"])

MAX_LINKS_TO_CHECK = 5


def _ai_to_score(ai: dict) -> int:
    confidence = ai["confidence"]
    if ai["verdict"] == "phishing":
        return int(70 + confidence * 0.3)
    if ai["verdict"] == "suspicious":
        return 45
    return int(max(0, 30 - confidence * 0.3))


def _score_to_level(score: int) -> tuple[str, str]:
    if score >= 60:
        return "phishing", "high"
    if score >= 30:
        return "suspicious", "medium"
    return "safe", "low"


async def _safe_check(url: str) -> bool:
    try:
        return bool(await check_url(url))
    except Exception as exc:
        logger.warning(f"Safe Browsing check failed for {url}: {exc}")
        return False


@router.post("/email", response_model=EmailScanResponse)
async def scan_email(
    data: EmailScanRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rules = analyze_email_rules(data.subject, data.sender, data.body)
    links = rules["urls"][:MAX_LINKS_TO_CHECK]

    ai_task = analyze_email_with_ai(data.subject, data.sender, data.body)
    link_tasks = [_safe_check(u) for u in links]
    ai_result, *link_results = await asyncio.gather(ai_task, *link_tasks)
    flagged_links = [u for u, bad in zip(links, link_results) if bad]

    if ai_result:
        score = round(0.7 * _ai_to_score(ai_result) + 0.3 * rules["score"])
        analyzed_by = f"{ai_result['provider']} + rules"
        summary = ai_result["summary"]
        red_flags = ai_result["red_flags"] + [f for f in rules["flags"] if f not in ai_result["red_flags"]]
    else:
        score = rules["score"]
        analyzed_by = "rules"
        summary = "AI analysis unavailable; result is based on keyword and link rules."
        red_flags = rules["flags"]

    if flagged_links:
        score = 100
        red_flags = [f"Google Safe Browsing flagged: {u}" for u in flagged_links] + red_flags

    result, risk_level = _score_to_level(score)
    if not summary:
        summary = {
            "phishing": "Warning: Possible phishing attempt.",
            "suspicious": "This email has some suspicious signs. Be careful.",
            "safe": "No strong phishing signs found.",
        }[result]

    content = f"[EMAIL] {data.subject or '(no subject)'} | {data.body}"[:2000]
    try:
        new_scan = Scan(user_id=current_user.id, content=content, result=result, risk_level=risk_level)
        db.add(new_scan)
        db.commit()
        db.refresh(new_scan)
    except Exception as exc:
        db.rollback()
        logger.error(f"Database error while saving email scan: {exc}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to record scan result.")

    return EmailScanResponse(
        id=new_scan.id,
        result=result,
        risk_level=risk_level,
        risk_score=score,
        summary=summary,
        red_flags=red_flags[:10],
        links_found=rules["urls"],
        flagged_links=flagged_links,
        analyzed_by=analyzed_by,
    )
