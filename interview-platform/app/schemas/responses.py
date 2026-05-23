"""
API Response Models - Pydantic models for API responses
Ensures consistent data format between backend and frontend
"""

from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from datetime import datetime
from enum import Enum


# ==================== Pipeline Status Responses ====================

class PipelineStepStatusEnum(str, Enum):
    """Pipeline step status"""
    pending = "pending"
    running = "running"
    success = "success"
    failed = "failed"


class AIPipelineStepResponse(BaseModel):
    """Response model for individual pipeline step"""
    id: int
    step_name: str
    status: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    latency_ms: Optional[int] = None
    tokens_used: Optional[int] = 0
    error_message: Optional[str] = None
    
    class Config:
        from_attributes = True


class AIPipelineRunResponse(BaseModel):
    """Response model for complete pipeline run"""
    id: int
    status: str  # "pending", "running", "completed", "failed"
    started_at: datetime
    completed_at: Optional[datetime] = None
    steps: List[AIPipelineStepResponse] = Field(default_factory=list)
    error_message: Optional[str] = None
    total_tokens_used: int = 0
    
    class Config:
        from_attributes = True


# ==================== Evaluation Responses ====================

class CompetencyScore(BaseModel):
    """Individual competency score"""
    criterion_name: str
    score: int = Field(ge=0, le=100)
    justification: str
    evidence_quote: str


class StrengthItem(BaseModel):
    """Identified strength"""
    criterion: str
    description: str
    evidence_quote: str


class WeaknessItem(BaseModel):
    """Identified weakness"""
    criterion: str
    description: str
    gap_analysis: str


class InterviewerNotesData(BaseModel):
    """Interviewer notes"""
    communication_style: str
    confidence_level: str
    seniority_signals: str
    red_flags: str


class SuggestedQuestionItem(BaseModel):
    """Suggested follow-up question"""
    criterion: str
    weakness_reference: str
    question: str


class EvaluationResponse(BaseModel):
    """Response model for interview evaluation"""
    id: int
    session_id: int
    overall_score: float = Field(ge=0, le=100)
    competency_breakdown: Dict[str, CompetencyScore] = Field(
        description="Competency scores as dict (criterion_name -> score)"
    )
    executive_summary: str
    hiring_recommendation: str  # "strong_hire", "hire", "no_hire", "strong_no_hire"
    confidence_score: float = Field(ge=0, le=1)
    strengths: List[StrengthItem] = Field(default_factory=list)
    weaknesses: List[WeaknessItem] = Field(default_factory=list)
    interviewer_notes: Optional[InterviewerNotesData] = None
    suggested_questions: List[SuggestedQuestionItem] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# ==================== Session Responses ====================

class SessionUploadResponse(BaseModel):
    """Response for media upload"""
    session_id: int
    task_id: str = Field(description="Celery task ID for polling progress")
    status: str = Field(default="queued", description="Task status")
    message: str


class SessionStatusResponse(BaseModel):
    """Response for session status check"""
    session_id: int
    pipeline_status: str  # "pending", "running", "completed", "failed"
    pipeline_run: Optional[AIPipelineRunResponse] = None
    evaluation: Optional[EvaluationResponse] = None
    
    class Config:
        from_attributes = True


# ==================== Error Responses ====================

class ErrorDetail(BaseModel):
    """Standard error response"""
    error_type: str = Field(description="Machine-readable error type")
    message: str = Field(description="Human-readable error message")
    details: Optional[Dict[str, Any]] = Field(default=None, description="Additional context")
    retry_after: Optional[int] = Field(default=None, description="Seconds to wait before retry")


# ==================== Task Status Responses ====================

class CeleryTaskStatusResponse(BaseModel):
    """Response for Celery task status check"""
    task_id: str
    status: str  # "PENDING", "STARTED", "SUCCESS", "FAILURE", "RETRY"
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    progress: Optional[Dict[str, Any]] = None


# ==================== List Responses ====================

class PaginatedResponse(BaseModel):
    """Base model for paginated responses"""
    items: List[Any]
    total: int
    page: int
    page_size: int
    total_pages: int


class SessionListResponse(BaseModel):
    """Response for session list"""
    sessions: List[Dict[str, Any]]
    total: int


class EvaluationListResponse(BaseModel):
    """Response for evaluation list"""
    evaluations: List[EvaluationResponse]
    total: int
