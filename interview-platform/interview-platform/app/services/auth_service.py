from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, UserResponse
from app.repositories.user_repo import UserRepo
from app.core.security import verify_password, create_access_token, decode_access_token
from app.services.audit_service import AuditService
from app.schemas.audit import AuditLogCreate
from app.models.audit_log import AuditActionEnum
import jwt
import os

ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
SECRET_KEY = os.getenv("SECRET_KEY", "supersecretkey_change_me_in_production")

class AuthService:
    @staticmethod
    async def register(db: AsyncSession, request: RegisterRequest) -> UserResponse:
        existing_user = await UserRepo.get_by_email(db, request.email)
        if existing_user:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
        
        user = await UserRepo.create(db, request)
        await AuditService.log_action(db, AuditLogCreate(
            user_id=user.id, action=AuditActionEnum.signup, resource_type="user",
            resource_id=user.id, details={"email": user.email, "role": user.role.value}
        ))
        return user

    @staticmethod
    async def login(db: AsyncSession, request: LoginRequest) -> TokenResponse:
        user = await UserRepo.get_by_email(db, request.email)
        if not user or not verify_password(request.password, user.hashed_password):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
        
        if not user.is_active:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user")

        access_token = create_access_token(
            payload={"sub": str(user.id), "role": user.role.value}
        )
        await AuditService.log_action(db, AuditLogCreate(
            user_id=user.id, action=AuditActionEnum.login, resource_type="user",
            resource_id=user.id, details={"email": user.email}
        ))
        return TokenResponse(access_token=access_token)

    @staticmethod
    def refresh_token(token: str) -> TokenResponse:
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM], options={"verify_exp": False})
            new_token = create_access_token({"sub": payload.get("sub"), "role": payload.get("role")})
            return TokenResponse(access_token=new_token)
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
