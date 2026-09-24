from sqlalchemy import Column, Integer, String, ForeignKey
from app.database import Base


class Scan(Base):
    __tablename__ = "scans"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(String(2048), nullable=False)
    result = Column(String(50), nullable=False)
    risk_level = Column(String(20), nullable=False)
