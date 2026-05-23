from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.job_application import ApplicationStatusEnum

class ApplicationCreate(BaseModel):
    candidate_id: int
    job_version_id: int

class ApplicationUpdateStatus(BaseModel):
    status: ApplicationStatusEnum

class ApplicationUpdate(BaseModel):
    status: Optional[ApplicationStatusEnum] = None

class ApplicationResponse(BaseModel):
    id: int
    candidate_id: int
    job_version_id: int
    status: ApplicationStatusEnum
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True
