from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from app.database import get_db
from app.schemas.audit import AuditLogResponse
from app.services.audit_service import AuditService
from app.core.security import get_current_user
from app.models.user import User, RoleEnum

router = APIRouter(prefix="/audit", tags=["audit"], dependencies=[Depends(get_current_user)])

@router.get("/logs", response_model=List[AuditLogResponse])
async def get_audit_logs(
    user_id: Optional[int] = Query(None),
    limit: int = Query(100, le=1000),
    offset: int = Query(0),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    if user.role != RoleEnum.admin:
        raise HTTPException(status_code=403, detail="Audit logs are accessible only by administrators.")
    return await AuditService.get_audit_logs(db, user_id, limit, offset)
