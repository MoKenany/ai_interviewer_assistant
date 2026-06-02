from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional
from app.models.user import RoleEnum

class RegisterRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    role: Optional[RoleEnum] = RoleEnum.hr

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserResponse(BaseModel):
    id: int
    full_name: str
    email: EmailStr
    role: RoleEnum
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True
