"""
Builds a printable PDF report for a single scan.

Place this file at app/utils/report.py
Requires: pip install reportlab
"""
import json
from datetime import datetime, timezone
from io import BytesIO
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

EMAIL_PREFIX = "[EMAIL]"

INK = colors.HexColor("#0f172a")
MUTED = colors.HexColor("#64748b")
RULE = colors.HexColor("#e2e8f0")

VERDICTS = {
    "phishing": {
        "label": "PHISHING",
        "color": colors.HexColor("#d03b3b"),
        "advice": (
            "Do not open this link or reply to this message. If you already "
            "interacted with it, change any affected passwords and report it "
            "to your IT or security team."
        ),
    },
    "suspicious": {
        "label": "SUSPICIOUS",
        "color": colors.HexColor("#b45309"),
        "advice": (
            "Treat this with caution. Avoid entering credentials or "
            "downloading files until you can verify the source through "
            "another channel."
        ),
    },
    "safe": {
        "label": "SAFE",
        "color": colors.HexColor("#15803d"),
        "advice": (
            "No phishing indicators were found. Stay alert, since automated "
            "checks cannot catch every threat."
        ),
    },
}
UNKNOWN_VERDICT = {
    "label": "UNKNOWN",
    "color": colors.HexColor("#475569"),
    "advice": "Review this result carefully before taking any action.",
}

# Optional attributes on the Scan model. Anything missing or empty is skipped,
# so edit this list to match your model (e.g. add "indicators").
EXTRA_FIELDS = [
    ("score", "Risk score"),
    ("confidence", "Confidence"),
    ("reasons", "Why this verdict"),
    ("details", "Details"),
]


def _styles():
    base = getSampleStyleSheet()

    def style(name, parent="Normal", **kwargs):
        return ParagraphStyle(name, parent=base[parent], **kwargs)

    return {
        "title": style(
            "title", "Title", fontName="Helvetica-Bold", fontSize=20,
            leading=24, textColor=INK, alignment=0, spaceAfter=2,
        ),
        "meta": style(
            "meta", fontName="Helvetica", fontSize=9, leading=12, textColor=MUTED
        ),
        "h2": style(
            "h2", "Heading2", fontName="Helvetica-Bold", fontSize=11,
            leading=14, textColor=INK, spaceBefore=16, spaceAfter=6,
        ),
        "body": style(
            "body", fontName="Helvetica", fontSize=10, leading=14, textColor=INK
        ),
        "label": style(
            "label", fontName="Helvetica-Bold", fontSize=8.5, leading=12,
            textColor=MUTED,
        ),
        "mono": style(
            "mono", fontName="Courier", fontSize=9, leading=12,
            textColor=INK, wordWrap="CJK",
        ),
        "bullet": style(
            "bullet", fontName="Helvetica", fontSize=10, leading=14,
            textColor=INK, leftIndent=10, firstLineIndent=-10, spaceAfter=2,
        ),
        "banner_big": style(
            "banner_big", fontName="Helvetica-Bold", fontSize=18, leading=22,
            textColor=colors.white,
        ),
        "banner_small": style(
            "banner_small", fontName="Helvetica-Bold", fontSize=10, leading=14,
            textColor=colors.white, alignment=TA_RIGHT,
        ),
        "small": style(
            "small", fontName="Helvetica", fontSize=8, leading=11, textColor=MUTED
        ),
    }


def _parse_target(content):
    content = content or ""

    if content.startswith(EMAIL_PREFIX):
        parts = content[len(EMAIL_PREFIX):].strip().split("|", 1)
        primary = parts[0].strip() or "Email analysis"
        secondary = parts[1].strip() if len(parts) > 1 else ""
        return "Email", primary, secondary

    return "URL", content or "Unknown target", ""


def _format_dt(value):
    if isinstance(value, datetime):
        return value.strftime("%d %b %Y, %H:%M")
    return str(value) if value else ""


def _normalize(value):
    """Decode JSON stored in text columns; trim plain strings."""
    if isinstance(value, str):
        text = value.strip()
        if text and text[0] in "[{":
            try:
                return json.loads(text)
            except ValueError:
                pass
        return text
    return value


def _is_empty(value):
    return value is None or value == "" or value == [] or value == {}


def _value_flowables(value, styles):
    if isinstance(value, list):
        return [
            Paragraph(f"\u2022 {escape(str(item))}", styles["bullet"])
            for item in value
        ]

    if isinstance(value, dict):
        return [
            Paragraph(f"<b>{escape(str(k))}:</b> {escape(str(v))}", styles["body"])
            for k, v in value.items()
        ]

    return [Paragraph(escape(str(value)), styles["body"])]


def build_scan_report_pdf(scan, user=None) -> bytes:
    styles = _styles()
    verdict_key = (scan.result or "").lower()
    verdict = VERDICTS.get(verdict_key, UNKNOWN_VERDICT)
    risk = (getattr(scan, "risk_level", None) or "Unknown").title()
    scan_type, primary, secondary = _parse_target(scan.content)

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
        topMargin=18 * mm,
        bottomMargin=22 * mm,
        title=f"PhishGuard scan report #{scan.id}",
        author="PhishGuard",
    )

    story = []

    # --- Title ---
    generated = datetime.now(timezone.utc).strftime("%d %b %Y, %H:%M UTC")
    story.append(Paragraph("Scan Report", styles["title"]))
    story.append(
        Paragraph(f"PhishGuard &middot; Generated {generated}", styles["meta"])
    )
    story.append(Spacer(1, 10))

    # --- Verdict banner ---
    banner = Table(
        [[
            Paragraph(verdict["label"], styles["banner_big"]),
            Paragraph(f"{escape(risk)} risk", styles["banner_small"]),
        ]],
        colWidths=[doc.width * 0.6, doc.width * 0.4],
    )
    banner.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), verdict["color"]),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 14),
        ("RIGHTPADDING", (0, 0), (-1, -1), 14),
        ("TOPPADDING", (0, 0), (-1, -1), 11),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 11),
    ]))
    story.append(banner)

    # --- Scan details ---
    story.append(Paragraph("Scan details", styles["h2"]))

    rows = [
        ("Scan ID", Paragraph(f"#{scan.id}", styles["body"])),
        ("Type", Paragraph(scan_type, styles["body"])),
        ("Target", Paragraph(escape(primary), styles["mono"])),
    ]
    if secondary:
        rows.append(("Details", Paragraph(escape(secondary), styles["body"])))
    if scan.created_at:
        rows.append(
            ("Scanned at", Paragraph(escape(_format_dt(scan.created_at)), styles["body"]))
        )
    user_email = getattr(user, "email", None)
    if user_email:
        rows.append(("Scanned by", Paragraph(escape(user_email), styles["body"])))

    label_width = 34 * mm
    details = Table(
        [[Paragraph(label.upper(), styles["label"]), value] for label, value in rows],
        colWidths=[label_width, doc.width - label_width],
    )
    details.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LINEBELOW", (0, 0), (-1, -1), 0.25, RULE),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    story.append(details)

    # --- Optional analysis fields ---
    extras = []
    for attr, label in EXTRA_FIELDS:
        value = _normalize(getattr(scan, attr, None))
        if not _is_empty(value):
            extras.append((label, value))

    if extras:
        story.append(Paragraph("Analysis", styles["h2"]))
        for label, value in extras:
            story.append(Paragraph(label.upper(), styles["label"]))
            story.extend(_value_flowables(value, styles))
            story.append(Spacer(1, 6))

    # --- Recommended action ---
    story.append(Paragraph("Recommended action", styles["h2"]))
    story.append(Paragraph(escape(verdict["advice"]), styles["body"]))

    # --- Disclaimer ---
    story.append(Spacer(1, 18))
    story.append(
        Paragraph(
            "This report was generated automatically. Results indicate "
            "likelihood, not certainty. Verify through official channels "
            "before acting on any message or link.",
            styles["small"],
        )
    )

    def draw_footer(canvas, document):
        canvas.saveState()
        canvas.setStrokeColor(RULE)
        canvas.setLineWidth(0.5)
        canvas.line(document.leftMargin, 16 * mm, A4[0] - document.rightMargin, 16 * mm)
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(MUTED)
        canvas.drawString(
            document.leftMargin, 11 * mm, f"PhishGuard \u00b7 Scan report #{scan.id}"
        )
        canvas.drawRightString(
            A4[0] - document.rightMargin, 11 * mm, f"Page {document.page}"
        )
        canvas.restoreState()

    doc.build(story, onFirstPage=draw_footer, onLaterPages=draw_footer)
    return buffer.getvalue()