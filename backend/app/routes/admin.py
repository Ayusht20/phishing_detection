from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.user import UserLogin
from app.schemas.admin import AdminTokenResponse, UserOut, RoleUpdate
from app.utils.security import verify_password, create_access_token
from app.utils.dependencies import require_admin

router = APIRouter(prefix="/api/admin", tags=["Admin"])


@router.post("/login", response_model=AdminTokenResponse)
def admin_login(credentials: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == credentials.email).first()
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    if user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")

    token = create_access_token({"sub": str(user.id), "email": user.email, "role": user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user_id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
    }


@router.get("/me", response_model=UserOut)
def admin_me(admin: User = Depends(require_admin)):
    return admin


@router.get("/users", response_model=list[UserOut])
def list_users(skip: int = 0, limit: int = 50, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    return db.query(User).order_by(User.id).offset(skip).limit(limit).all()


@router.patch("/users/{user_id}/role", response_model=UserOut)
def update_user_role(user_id: int, body: RoleUpdate, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    if user_id == admin.id and body.role != "admin":
        raise HTTPException(status_code=400, detail="You cannot remove your own admin role")

    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    user.role = body.role
    db.commit()
    db.refresh(user)
    return user