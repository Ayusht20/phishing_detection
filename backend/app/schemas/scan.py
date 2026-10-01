from pydantic import BaseModel, ConfigDict, HttpUrl
from datetime import datetime
from typing import Optional

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