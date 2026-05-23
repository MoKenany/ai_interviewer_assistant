from pydantic import BaseModel, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.models.interview_evaluation import HiringRecommendationEnum

class EvaluationResponse(BaseModel):
    id: int
    session_id: int
    application_id: int
    overall_score: float
    competency_breakdown: Optional[Dict[str, Dict[str, Any]]] = None
    executive_summary: Optional[str] = None
    hiring_recommendation: HiringRecommendationEnum
    confidence_score: Optional[float] = None
    strengths: Optional[List[Dict[str, Any]]] = None
    weaknesses: Optional[List[Dict[str, Any]]] = None
    interviewer_notes: Optional[Dict[str, Any]] = None
    suggested_questions: Optional[List[Dict[str, Any]]] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    @field_validator("competency_breakdown", mode="before")
    @classmethod
    def normalize_competency_breakdown(cls, value):
        if value is None or isinstance(value, dict):
            return value
        if isinstance(value, list):
            normalized = {}
            for index, item in enumerate(value):
                if not isinstance(item, dict):
                    normalized[f"criterion_{index + 1}"] = {"value": item}
                    continue
                name = (
                    item.get("criterion_name")
                    or item.get("criterion")
                    or item.get("competency")
                    or item.get("name")
                    or f"criterion_{index + 1}"
                )
                normalized[str(name)] = item
            return normalized
        return value

    class Config:
        from_attributes = True

class EvaluationNotesUpdate(BaseModel):
    notes: Dict[str, Any]

class InsightsResponse(BaseModel):
    strengths: Optional[List[Dict[str, Any]]] = None
    weaknesses: Optional[List[Dict[str, Any]]] = None
    interviewer_notes: Optional[Dict[str, Any]] = None

class SuggestedQuestionsResponse(BaseModel):
    suggested_questions: Optional[List[Dict[str, Any]]] = None
