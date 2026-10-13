from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.config import settings
from app.database import Base, engine
from app.routes import admin, admin_stats, auth, email_scan, history, scan
from app.utils.limiter import limiter

Base.metadata.create_all(bind=engine)
app = FastAPI(title=settings.PROJECT_NAME)

# Attach SlowAPI limiter state and error handling
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(scan.router)
app.include_router(email_scan.router)
app.include_router(history.router)
app.include_router(admin_stats.router)


@app.get("/")
def health_check():
    return {"status": "ok", "app": settings.PROJECT_NAME}