from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import case, func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.scan import Scan
from app.models.user import User
from app.utils.dependencies import require_admin

router = APIRouter(prefix="/api/admin", tags=["Admin"])

EMAIL_PREFIX = "[EMAIL]"
VERDICTS = ("phishing", "suspicious", "safe")


def _is_email():
    return Scan.content.startswith(EMAIL_PREFIX, autoescape=True)


def _short(content: str) -> str:
    if content.startswith(EMAIL_PREFIX):
        content = content[len(EMAIL_PREFIX):].strip().split(" | ")[0]
    return content if len(content) <= 80 else content[:77] + "..."


@router.get("/stats")
def admin_stats(
    days: int = Query(default=14, ge=7, le=90),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    now = datetime.now(timezone.utc)
    today = now.date()
    start_day = today - timedelta(days=days - 1)
    start_dt = datetime.combine(start_day, datetime.min.time(), tzinfo=timezone.utc)

    total_users = db.query(func.count(User.id)).scalar() or 0
    total_admins = db.query(func.count(User.id)).filter(User.role == "admin").scalar() or 0

    verdict_rows = db.query(Scan.result, func.count(Scan.id)).group_by(Scan.result).all()
    by_verdict = {v: 0 for v in VERDICTS}
    for result, count in verdict_rows:
        by_verdict[result if result in by_verdict else "safe"] += count
    total_scans = sum(by_verdict.values())

    email_scans = db.query(func.count(Scan.id)).filter(_is_email()).scalar() or 0
    url_scans = total_scans - email_scans

    scans_today = (
        db.query(func.count(Scan.id))
        .filter(Scan.created_at >= datetime.combine(today, datetime.min.time(), tzinfo=timezone.utc))
        .scalar()
        or 0
    )
    threats = by_verdict["phishing"] + by_verdict["suspicious"]
    threat_rate = round(threats * 100 / total_scans, 1) if total_scans else 0.0

    day_col = func.date(Scan.created_at)
    daily_rows = (
        db.query(
            day_col.label("day"),
            func.sum(case((Scan.result == "phishing", 1), else_=0)),
            func.sum(case((Scan.result == "suspicious", 1), else_=0)),
            func.sum(case((Scan.result == "safe", 1), else_=0)),
        )
        .filter(Scan.created_at >= start_dt)
        .group_by(day_col)
        .all()
    )
    by_day = {}
    for day, phishing, suspicious, safe in daily_rows:
        key = day if isinstance(day, date) else date.fromisoformat(str(day)[:10])
        by_day[key] = (int(phishing or 0), int(suspicious or 0), int(safe or 0))

    daily = []
    for i in range(days):
        d = start_day + timedelta(days=i)
        phishing, suspicious, safe = by_day.get(d, (0, 0, 0))
        daily.append({
            "date": d.isoformat(),
            "phishing": phishing,
            "suspicious": suspicious,
            "safe": safe,
            "total": phishing + suspicious + safe,
        })

    top_rows = (
        db.query(
            User.id,
            User.name,
            User.email,
            func.count(Scan.id).label("scans"),
            func.sum(case((Scan.result != "safe", 1), else_=0)).label("threats"),
        )
        .join(Scan, Scan.user_id == User.id)
        .group_by(User.id, User.name, User.email)
        .order_by(func.count(Scan.id).desc())
        .limit(5)
        .all()
    )
    top_users = [
        {"id": r.id, "name": r.name, "email": r.email, "scans": r.scans, "threats": int(r.threats or 0)}
        for r in top_rows
    ]

    recent_rows = (
        db.query(Scan, User.email)
        .join(User, Scan.user_id == User.id)
        .filter(Scan.result != "safe")
        .order_by(Scan.created_at.desc())
        .limit(6)
        .all()
    )
    recent_threats = [
        {
            "id": s.id,
            "type": "email" if s.content.startswith(EMAIL_PREFIX) else "url",
            "content": _short(s.content),
            "result": s.result,
            "risk_level": s.risk_level,
            "user_email": email,
            "created_at": s.created_at.isoformat() if s.created_at else None,
        }
        for s, email in recent_rows
    ]

    return {
        "totals": {
            "users": total_users,
            "admins": total_admins,
            "scans": total_scans,
            "scans_today": scans_today,
            "url_scans": url_scans,
            "email_scans": email_scans,
            "threats": threats,
            "threat_rate": threat_rate,
        },
        "by_verdict": by_verdict,
        "daily": daily,
        "top_users": top_users,
        "recent_threats": recent_threats,
    }
