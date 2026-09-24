import asyncio
import httpx

from app.config import settings


VIRUSTOTAL_URL = "https://www.virustotal.com/api/v3/urls"
VIRUSTOTAL_ANALYSIS_URL = "https://www.virustotal.com/api/v3/analyses"


async def scan_url(url: str):
    headers = {
        "x-apikey": settings.VIRUSTOTAL_API_KEY
    }

    async with httpx.AsyncClient() as client:

        # Submit URL for analysis
        response = await client.post(
            VIRUSTOTAL_URL,
            headers=headers,
            data={"url": url}
        )

        response.raise_for_status()

        analysis_id = response.json()["data"]["id"]

        # Wait for the analysis to complete
        for _ in range(15):
            response = await client.get(
                f"{VIRUSTOTAL_ANALYSIS_URL}/{analysis_id}",
                headers=headers
            )

            response.raise_for_status()

            analysis = response.json()["data"]["attributes"]

            if analysis.get("status") == "completed":
                return analysis

            await asyncio.sleep(2)

    return {
        "status": "timeout",
        "stats": {}
    }