from pydantic import BaseModel, ConfigDict, HttpUrl
from datetime import datetime
from typing import Optional
from typing import List

class ScanRequest(BaseModel):
    url: HttpUrl


class ScanResponse(BaseModel):
    id: int
    content: str
    result: str
    risk_level: str

    model_config = ConfigDict(from_attributes=True)


class ScanHistoryItem(BaseModel):
    id: int
    content: str
    result: str
    risk_level: Optional[str] = "unknown"
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ScanHistoryPage(BaseModel):
    """Paginated wrapper around scan history records."""

    model_config = ConfigDict(from_attributes=True)

    items: List[ScanHistoryItem]
    total: int
    page: int
    page_size: int
    total_pages: int
    has_next: bool
    has_prev: bool