from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.models.ai_pipeline_run import PipelineRunStatusEnum
from app.models.ai_pipeline_step import StepNameEnum, StepStatusEnum

class AIPipelineStepResponse(BaseModel):
    id: int
    run_id: int
    step_name: StepNameEnum
    status: StepStatusEnum
    started_at: datetime
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    tokens_used: Optional[int] = None
    latency_ms: Optional[int] = None
    prompt_version: Optional[str] = None

    class Config:
        from_attributes = True

class AIPipelineRunResponse(BaseModel):
    id: int
    session_id: int
    status: PipelineRunStatusEnum
    started_at: datetime
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    steps: List[AIPipelineStepResponse] = []

    class Config:
        from_attributes = True
