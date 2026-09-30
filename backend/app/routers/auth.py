from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.auth import LoginRequest, TokenResponse, CurrentUserOut
from app.crud.employee import get_user_by_username
from app.services.auth import verify_password, create_access_token, get_current_user
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/login", response_model=TokenResponse)
def login(credentials: LoginRequest, db: Session = Depends(get_db)):
    user = get_user_by_username(db, credentials.username)
    if user is None or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect username or password.")

    from datetime import datetime
    user.last_login = datetime.utcnow()
    db.commit()

    token = create_access_token(user)
    return TokenResponse(
        access_token=token, role=user.role, employee_id=user.employee_id, username=user.username,
    )


@router.get("/me", response_model=CurrentUserOut)
def read_current_user(current_user: User = Depends(get_current_user)):
    return CurrentUserOut(
        user_id=current_user.user_id,
        employee_id=current_user.employee_id,
        username=current_user.username,
        role=current_user.role,
    )
