from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.admin import UserOut, RoleUpdate
from app.utils.dependencies import require_admin

router = APIRouter(prefix="/api/admin", tags=["Admin"])


@router.get("/me", response_model=UserOut)
def admin_me(admin: User = Depends(require_admin)):
    """Validates active admin session for the admin dashboard."""
    return admin


@router.get("/users", response_model=list[UserOut])
def list_users(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Fetches paginated directory of registered accounts."""
    return db.query(User).order_by(User.id).offset(skip).limit(limit).all()


@router.patch("/users/{user_id}/role", response_model=UserOut)
def update_user_role(
    user_id: int,
    body: RoleUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Promotes or demotes user roles with self-demotion protection."""
    if user_id == admin.id and body.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot remove your own admin role"
        )

    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    user.role = body.role
    db.commit()
    db.refresh(user)
    return user