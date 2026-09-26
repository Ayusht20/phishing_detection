from pydantic import BaseModel, Field


class EmailScanRequest(BaseModel):
    subject: str = Field(default="", max_length=500)
    sender: str = Field(default="", max_length=255)
    body: str = Field(min_length=10, max_length=20000)


class EmailScanResponse(BaseModel):
    id: int
    result: str
    risk_level: str
    risk_score: int
    summary: str
    red_flags: list[str]
    links_found: list[str]
    flagged_links: list[str]
    analyzed_by: str
