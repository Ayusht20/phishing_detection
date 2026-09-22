import hashlib
import bcrypt
from datetime import datetime, timedelta
import jwt
from app.config import settings

def _prepare_password(password: str) -> bytes:
    # Pre-hash with SHA-256 so length is strictly 64 hex characters (under Bcrypt's 72-byte ceiling)
    digest = hashlib.sha256(password.encode("utf-8")).hexdigest()
    return digest.encode("utf-8")

def hash_password(password: str) -> str:
    prepared = _prepare_password(password)
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(prepared, salt).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    prepared = _prepare_password(plain_password)
    return bcrypt.checkpw(prepared, hashed_password.encode("utf-8"))

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)