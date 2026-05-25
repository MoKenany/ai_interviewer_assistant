from pydantic import BaseModel, Field
from typing import List, Optional, Any
from datetime import datetime
from app.models.job import JobStatusEnum
from app.models.job_version import CriteriaModeEnum
from app.models.evaluation_criteria import PriorityLevelEnum

class EvaluationCriteriaBase(BaseModel):
    name: str
    description: Optional[str] = None
    weight: float = Field(gt=0, le=100)
    is_mandatory: bool = False
    priority_level: PriorityLevelEnum = PriorityLevelEnum.medium

class EvaluationCriteriaCreate(EvaluationCriteriaBase):
    pass

class EvaluationCriteriaProposal(EvaluationCriteriaBase):
    pass

class EvaluationCriteriaResponse(EvaluationCriteriaBase):
    id: int
    job_version_id: int
    created_at: datetime
    class Config:
        from_attributes = True

class JobVersionBase(BaseModel):
    raw_jd_text: Optional[str] = None
    structured_jd: Optional[dict] = None
    criteria_mode: CriteriaModeEnum = CriteriaModeEnum.hybrid

class JobVersionCreate(JobVersionBase):
    trigger_jd_agent: Optional[bool] = True

class JobVersionUpdate(BaseModel):
    raw_jd_text: Optional[str] = None
    structured_jd: Optional[dict] = None
    criteria_mode: Optional[CriteriaModeEnum] = None

class JobVersionResponse(JobVersionBase):
    id: int
    job_id: int
    version_number: int
    created_at: datetime
    criteria: List[EvaluationCriteriaResponse] = []
    class Config:
        from_attributes = True

class JobBase(BaseModel):
    title: str
    department: Optional[str] = None
    location: Optional[str] = None
    employment_type: Optional[str] = None
    status: JobStatusEnum = JobStatusEnum.draft

class JobCreate(JobBase):
    pass

class JobUpdate(BaseModel):
    title: Optional[str] = None
    department: Optional[str] = None
    location: Optional[str] = None
    employment_type: Optional[str] = None
    status: Optional[JobStatusEnum] = None

class JobResponse(JobBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime]
    class Config:
        from_attributes = True
