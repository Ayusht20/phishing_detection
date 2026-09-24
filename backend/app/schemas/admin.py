from datetime import datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict


class AdminTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    name: str
    email: str
    role: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str
    role: str
    created_at: datetime | None = None


class RoleUpdate(BaseModel):
    role: Literal["user", "admin"]