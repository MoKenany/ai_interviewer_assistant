from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class CandidateBase(BaseModel):
    full_name: str
    email: EmailStr
    phone: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    source: Optional[str] = None

class CandidateCreate(CandidateBase):
    pass

class CandidateUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    source: Optional[str] = None
    is_active: Optional[bool] = None

class CandidateResponse(CandidateBase):
    id: int
    user_id: int
    resume_file_path: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True
