from pydantic import BaseModel, ConfigDict, HttpUrl


class ScanRequest(BaseModel):
    url: HttpUrl


class ScanResponse(BaseModel):
    id: int
    content: str
    result: str
    risk_level: str

    model_config = ConfigDict(from_attributes=True)
