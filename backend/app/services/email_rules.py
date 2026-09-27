import re
from urllib.parse import urlparse

URL_PATTERN = re.compile(r"https?://[^\s<>\"')\]]+", re.IGNORECASE)

KEYWORD_GROUPS = {
    "Urgency / pressure": (
        15,
        ["urgent", "immediately", "within 24 hours", "act now", "final notice",
         "last warning", "expires today", "limited time", "right away"],
    ),
    "Threatening language": (
        15,
        ["account will be suspended", "account suspended", "account will be closed",
         "legal action", "unauthorized activity", "unusual activity", "blocked",
         "terminated", "penalty"],
    ),
    "Fake login / credential request": (
        25,
        ["verify your account", "confirm your password", "update your password",
         "login to confirm", "verify your identity", "enter your password",
         "reset your password", "confirm your details", "otp", "pin number",
         "security code", "kyc"],
    ),
    "Money / prize bait": (
        15,
        ["you have won", "lottery", "prize", "claim your reward", "gift card",
         "refund", "cashback", "wire transfer", "bitcoin", "crypto", "inheritance"],
    ),
    "Generic greeting": (
        5,
        ["dear customer", "dear user", "dear account holder", "dear sir/madam", "valued customer"],
    ),
}

URL_SHORTENERS = {"bit.ly", "tinyurl.com", "goo.gl", "t.co", "ow.ly", "is.gd", "cutt.ly", "rb.gy", "shorturl.at"}
RISKY_TLDS = (".xyz", ".top", ".click", ".zip", ".mov", ".tk", ".ml", ".ga", ".cf", ".gq", ".ru")


def extract_urls(text: str) -> list[str]:
    urls = [u.rstrip(".,;:") for u in URL_PATTERN.findall(text)]
    return list(dict.fromkeys(urls))


def _check_url(url: str) -> list[str]:
    issues = []
    parsed = urlparse(url)
    host = (parsed.hostname or "").lower()

    if re.fullmatch(r"\d{1,3}(\.\d{1,3}){3}", host):
        issues.append(f"Link uses a raw IP address: {host}")
    if host in URL_SHORTENERS:
        issues.append(f"Link hidden behind a URL shortener: {host}")
    if host.endswith(RISKY_TLDS):
        issues.append(f"Link uses a high-risk domain ending: {host}")
    if "@" in parsed.netloc:
        issues.append("Link contains '@', which can hide the real destination")
    if parsed.scheme == "http":
        issues.append(f"Link is not secure (http, not https): {host}")
    if host.count("-") >= 3 or host.count(".") >= 4:
        issues.append(f"Link has an unusually complex domain: {host}")
    return issues


def analyze_email_rules(subject: str, sender: str, body: str) -> dict:
    text = f"{subject}\n{body}".lower()
    score = 0
    flags: list[str] = []

    for label, (weight, words) in KEYWORD_GROUPS.items():
        hits = [w for w in words if w in text]
        if hits:
            score += weight
            flags.append(f"{label}: {', '.join(hits[:3])}")

    urls = extract_urls(body)
    url_issue_count = 0
    for url in urls:
        for issue in _check_url(url):
            flags.append(issue)
            url_issue_count += 1
    score += min(url_issue_count * 10, 30)

    if sender and "@" in sender:
        domain = sender.split("@")[-1].strip(" >").lower()
        free_mail = {"gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "proton.me"}
        brands = ["paypal", "amazon", "bank", "microsoft", "apple", "netflix", "sbi", "hdfc", "icici"]
        if domain in free_mail and any(b in text for b in brands):
            score += 15
            flags.append(f"Claims to be a company but sent from a free email address ({domain})")

    score = min(score, 100)
    if score >= 60:
        verdict, risk = "phishing", "high"
    elif score >= 30:
        verdict, risk = "suspicious", "medium"
    else:
        verdict, risk = "safe", "low"

    return {"score": score, "verdict": verdict, "risk_level": risk, "flags": flags, "urls": urls}
