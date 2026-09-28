from pydantic import BaseModel

from app.models.enums import UserRole


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: UserRole
    employee_id: int
    username: str


class CurrentUserOut(BaseModel):
    user_id: int
    employee_id: int
    username: str
    role: UserRole
