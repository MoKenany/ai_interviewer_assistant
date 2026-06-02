import asyncio
from fastapi import APIRouter, Depends, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from app.database import get_db
from app.schemas.application import ApplicationCreate, ApplicationUpdateStatus, ApplicationUpdate, ApplicationResponse
from app.services.candidate_service import ApplicationService
from app.core.security import get_current_user
from app.models.user import User
from app.services.audit_service import AuditService
from app.schemas.audit import AuditLogCreate
from app.models.audit_log import AuditActionEnum

router = APIRouter(prefix="/applications", tags=["applications"], dependencies=[Depends(get_current_user)])

@router.post("", response_model=ApplicationResponse)
async def create_application(app_in: ApplicationCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    app = await ApplicationService.create_application(db, app_in)
    await AuditService.log_action(db, AuditLogCreate(
        user_id=user.id, action=AuditActionEnum.create, resource_type="application",
        resource_id=app.id, details={"candidate_id": app_in.candidate_id, "job_version_id": app_in.job_version_id}
    ))
    return app

@router.post("/job-versions/{job_version_id}/bulk-import")
async def bulk_import_candidates_to_job_version(
    job_version_id: int,
    files: List[UploadFile] = File(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    try:
        result = await asyncio.wait_for(
            ApplicationService.bulk_import_candidates_to_job_version(db, user.id, job_version_id, files),
            timeout=300.0
        )
    except asyncio.TimeoutError:
        from fastapi import HTTPException
        raise HTTPException(status_code=504, detail="Candidate import timed out. Please try fewer/smaller files.")

    await AuditService.log_action(db, AuditLogCreate(
        user_id=user.id,
        action=AuditActionEnum.create,
        resource_type="application",
        details={
            "bulk_import_to_job_version": True,
            "job_version_id": job_version_id,
            "linked": len(result.get("linked", [])),
            "created_candidates": len(result.get("created_candidates", [])),
            "skipped": len(result.get("skipped", [])),
            "errors": len(result.get("errors", [])),
            "files": [f.filename for f in files]
        }
    ))
    return result

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
    result = await ApplicationService.update_status(db, application_id, status_in)
    await AuditService.log_action(db, AuditLogCreate(
        user_id=user.id, action=AuditActionEnum.update, resource_type="application",
        resource_id=application_id, details={"new_status": status_in.status}
    ))
    return result

@router.patch("/{application_id}", response_model=ApplicationResponse)
async def update_application(application_id: int, app_in: ApplicationUpdate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await ApplicationService.update_application(db, application_id, app_in)
    await AuditService.log_action(db, AuditLogCreate(
        user_id=user.id, action=AuditActionEnum.update, resource_type="application",
        resource_id=application_id, details={"changes": app_in.model_dump(exclude_unset=True)}
    ))
    return result

@router.delete("/{application_id}")
async def delete_application(application_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    app = await ApplicationService.get_application(db, application_id)
    await AuditService.log_action(db, AuditLogCreate(
        user_id=user.id, action=AuditActionEnum.delete, resource_type="application",
        resource_id=application_id, details={"candidate_id": app.candidate_id, "status": app.status}
    ))
    await ApplicationService.delete_application(db, application_id)
    return {"message": "Application deleted"}
