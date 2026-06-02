from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from app.database import get_db
from app.schemas.application import ApplicationCreate, ApplicationUpdateStatus, ApplicationUpdate, ApplicationResponse
from app.schemas.audit import AuditLogCreate
from app.services.candidate_service import ApplicationService
from app.services.audit_service import AuditService
from app.core.security import get_current_user
from app.models.user import User
from app.core.enums import AuditActionEnum

router = APIRouter(prefix="/applications", tags=["applications"], dependencies=[Depends(get_current_user)])

@router.post("", response_model=ApplicationResponse)
async def create_application(app_in: ApplicationCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    app = await ApplicationService.create_application(db, app_in)
    await AuditService.log_action(db, AuditLogCreate(
        user_id=user.id, action=AuditActionEnum.create, resource_type="application",
        resource_id=app.id, details={"candidate_id": app.candidate_id, "job_version_id": app.job_version_id}
    ))
    return app

@router.get("", response_model=List[ApplicationResponse])
async def list_applications(
    candidate_id: Optional[int] = Query(None),
    job_version_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    return await ApplicationService.get_applications(db, candidate_id, job_version_id)

@router.get("/{application_id}", response_model=ApplicationResponse)
async def get_application(application_id: int, db: AsyncSession = Depends(get_db)):
    return await ApplicationService.get_application(db, application_id)

@router.patch("/{application_id}/status", response_model=ApplicationResponse)
async def update_status(application_id: int, status_in: ApplicationUpdateStatus, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    app = await ApplicationService.update_status(db, application_id, status_in)
    await AuditService.log_action(db, AuditLogCreate(
        user_id=user.id, action=AuditActionEnum.update, resource_type="application",
        resource_id=application_id, details={"new_status": status_in.status}
    ))
    return app

@router.patch("/{application_id}", response_model=ApplicationResponse)
async def update_application(application_id: int, app_in: ApplicationUpdate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    app = await ApplicationService.update_application(db, application_id, app_in)
    await AuditService.log_action(db, AuditLogCreate(
        user_id=user.id, action=AuditActionEnum.update, resource_type="application",
        resource_id=application_id, details=app_in.model_dump(exclude_unset=True)
    ))
    return app

@router.delete("/{application_id}")
async def delete_application(application_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    await ApplicationService.delete_application(db, application_id)
    await AuditService.log_action(db, AuditLogCreate(
        user_id=user.id, action=AuditActionEnum.delete, resource_type="application",
        resource_id=application_id, details={}
    ))
    return {"message": "Application deleted"}
