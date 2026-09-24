import base64
import logging
from urllib.parse import urlparse
import httpx
from app.config import settings

logger = logging.getLogger(__name__)

VIRUSTOTAL_URL = "https://www.virustotal.com/api/v3/urls"

# Private network hostnames to ignore
PRIVATE_HOSTS = {"localhost", "127.0.0.1", "0.0.0.0"}


def get_url_id(url: str) -> str:
    """Encodes a URL into VirusTotal's base64 URL identifier (unpadded)."""
    return base64.urlsafe_b64encode(url.strip().encode("utf-8")).decode("utf-8").rstrip("=")


def is_local_url(url: str) -> bool:
    """Detects localhost or private network addresses."""
    try:
        parsed = urlparse(url)
        hostname = parsed.hostname or ""
        return hostname in PRIVATE_HOSTS or hostname.startswith("192.168.") or hostname.startswith("10.")
    except Exception:
        return False


async def scan_url(url: str) -> dict:
    clean_url = url.strip().rstrip(")")  # Strip accidental trailing punctuation
    
    # Skip external lookup for localhost / LAN targets
    if is_local_url(clean_url):
        return {
            "status": "local",
            "stats": {"malicious": 0, "suspicious": 0, "harmless": 1}
        }

    url_id = get_url_id(clean_url)
    headers = {
        "x-apikey": settings.VIRUSTOTAL_API_KEY,
        "Accept": "application/json"
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            # 1. Instant Cache Lookup
            response = await client.get(f"{VIRUSTOTAL_URL}/{url_id}", headers=headers)

            if response.status_code == 200:
                data = response.json()
                stats = data.get("data", {}).get("attributes", {}).get("last_analysis_stats", {})
                return {
                    "status": "completed",
                    "stats": stats
                }

            # 2. Expected 404: Not seen before -> submit for indexing without warning
            if response.status_code == 404:
                submit_res = await client.post(
                    VIRUSTOTAL_URL,
                    headers=headers,
                    data={"url": clean_url}
                )
                if submit_res.status_code == 200:
                    return {
                        "status": "queued",
                        "stats": {"malicious": 0, "suspicious": 0, "harmless": 0, "undetected": 0}
                    }
                return {"status": "unindexed", "stats": {}}

            # Only log unexpected errors (401 invalid key, 429 rate limit, 500 VT down)
            if response.status_code != 404:
                logger.warning(f"VirusTotal lookup error HTTP {response.status_code}: {response.text}")
            return {"status": "error", "stats": {}}

        except httpx.HTTPError as exc:
            logger.error(f"VirusTotal request error: {exc}")
            return {"status": "error", "stats": {}}