from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.database import get_db
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, UserResponse
from app.services.auth_service import AuthService
from app.core.security import get_current_user
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["auth"])
security_scheme = HTTPBearer()

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(request: RegisterRequest, db: AsyncSession = Depends(get_db)):
    return await AuthService.register(db, request)

@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    return await AuthService.login(db, request)

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

from app.services.audit_service import AuditService
from app.schemas.audit import AuditLogCreate
from app.models.audit_log import AuditActionEnum

@router.post("/logout")
async def logout(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await AuditService.log_action(db, AuditLogCreate(
        user_id=current_user.id, action=AuditActionEnum.logout, resource_type="user",
        resource_id=current_user.id, details={"email": current_user.email}
    ))
    return {"message": "Logged out successfully"}

@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: AsyncSession = Depends(get_db)
):
    return await AuthService.refresh_token(db, credentials.credentials)
