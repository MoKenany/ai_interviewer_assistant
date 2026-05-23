from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from app.database import get_db
from app.schemas.application import ApplicationCreate, ApplicationUpdateStatus, ApplicationUpdate, ApplicationResponse
from app.services.candidate_service import ApplicationService
from app.core.security import get_current_user

router = APIRouter(prefix="/applications", tags=["applications"], dependencies=[Depends(get_current_user)])

@router.post("", response_model=ApplicationResponse)
async def create_application(app_in: ApplicationCreate, db: AsyncSession = Depends(get_db)):
    return await ApplicationService.create_application(db, app_in)

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
async def update_status(application_id: int, status_in: ApplicationUpdateStatus, db: AsyncSession = Depends(get_db)):
    return await ApplicationService.update_status(db, application_id, status_in)

@router.patch("/{application_id}", response_model=ApplicationResponse)
async def update_application(application_id: int, app_in: ApplicationUpdate, db: AsyncSession = Depends(get_db)):
    return await ApplicationService.update_application(db, application_id, app_in)

@router.delete("/{application_id}")
async def delete_application(application_id: int, db: AsyncSession = Depends(get_db)):
    await ApplicationService.delete_application(db, application_id)
    return {"message": "Application deleted"}
