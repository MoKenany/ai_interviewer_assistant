from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.job_application import ApplicationStatusEnum

class ApplicationCreate(BaseModel):
    candidate_id: int
    job_version_id: int
    status: Optional[ApplicationStatusEnum] = ApplicationStatusEnum.applied

class ApplicationUpdateStatus(BaseModel):
    status: ApplicationStatusEnum

class ApplicationUpdate(BaseModel):
    status: Optional[ApplicationStatusEnum] = None

class CandidateBasic(BaseModel):
    id: int
    full_name: str
    email: str
    phone: Optional[str] = None
    source: Optional[str] = None
    class Config:
        from_attributes = True

class ApplicationResponse(BaseModel):
    id: int
    candidate_id: int
    job_version_id: int
    status: ApplicationStatusEnum
    created_at: datetime
    updated_at: Optional[datetime]
    candidate: Optional[CandidateBasic] = None

    class Config:
        from_attributes = True
