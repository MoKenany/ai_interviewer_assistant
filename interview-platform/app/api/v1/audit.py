from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from datetime import datetime
from app.database import get_db
from app.schemas.audit import AuditLogResponse
from app.services.audit_service import AuditService
from app.core.security import get_current_user
from app.models.user import User, RoleEnum

router = APIRouter(prefix="/audit", tags=["audit"], dependencies=[Depends(get_current_user)])

@router.get("/logs")
async def get_audit_logs(
    user_email: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    resource_type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    limit: int = Query(500, le=1000),
    skip: int = Query(0),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    if user.role != RoleEnum.admin:
        raise HTTPException(status_code=403, detail="Audit logs are accessible only by administrators.")
    return await AuditService.get_audit_logs(db, user_email=user_email, limit=limit, skip=skip, action=action, resource_type=resource_type, search=search, start_date=start_date, end_date=end_date)
