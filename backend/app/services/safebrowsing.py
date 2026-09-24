import httpx
from app.config import settings


SAFE_BROWSING_URL = "https://safebrowsing.googleapis.com/v4/threatMatches:find"


async def check_url(url: str):
    params = {
        "key": settings.GOOGLE_SAFE_BROWSING_API_KEY
    }

    data = {
        "client": {
            "clientId": "ai-phishing-detection",
            "clientVersion": "1.0"
        },
        "threatInfo": {
            "threatTypes": [
                "MALWARE",
                "SOCIAL_ENGINEERING"
            ],
            "platformTypes": [
                "ANY_PLATFORM"
            ],
            "threatEntryTypes": [
                "URL"
            ],
            "threatEntries": [
                {
                    "url": url
                }
            ]
        }
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(
            SAFE_BROWSING_URL,
            params=params,
            json=data
        )

    response.raise_for_status()

    return response.json()