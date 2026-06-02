import enum
from sqlalchemy import Column, Integer, String, Enum, DateTime, ForeignKey, Float, Text
from sqlalchemy.orm import validates
from sqlalchemy.sql import func
from app.database import Base, JSON_TYPE

class HiringRecommendationEnum(str, enum.Enum):
    strong_hire = "strong_hire"
    hire = "hire"
    no_hire = "no_hire"
    strong_no_hire = "strong_no_hire"

class InterviewEvaluation(Base):
    __tablename__ = "interview_evaluations"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("interview_sessions.id"), unique=True, nullable=False)
    application_id = Column(Integer, ForeignKey("job_applications.id"), nullable=False)
    overall_score = Column(Float, nullable=False)
    competency_breakdown = Column(JSON_TYPE, nullable=True)
    executive_summary = Column(Text, nullable=True)
    hiring_recommendation = Column(Enum(HiringRecommendationEnum), nullable=False)
    confidence_score = Column(Float, nullable=True)
    strengths = Column(JSON_TYPE, nullable=True)
    weaknesses = Column(JSON_TYPE, nullable=True)
    interviewer_notes = Column(JSON_TYPE, nullable=True)
    suggested_questions = Column(JSON_TYPE, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    @validates("strengths")
    def validate_strengths(self, key, value):
        return self._validate_list_of_dicts(
            key,
            value,
            required_fields=("criterion", "description", "evidence_quote"),
        )

    @validates("weaknesses")
    def validate_weaknesses(self, key, value):
        return self._validate_list_of_dicts(
            key,
            value,
            required_fields=("criterion", "description", "gap_analysis"),
        )

    @validates("suggested_questions")
    def validate_suggested_questions(self, key, value):
        return self._validate_list_of_dicts(
            key,
            value,
            required_fields=("criterion", "weakness_reference", "question"),
        )

    @validates("interviewer_notes")
    def validate_interviewer_notes(self, key, value):
        if value is None:
            return value
        if not isinstance(value, dict):
            raise ValueError(f"{key} must be a JSON object")
        return value

    @staticmethod
    def _validate_list_of_dicts(key, value, required_fields=()):
        if value is None:
            return value
        if not isinstance(value, list):
            raise ValueError(f"{key} must be a JSON array")
        for index, item in enumerate(value):
            if not isinstance(item, dict):
                raise ValueError(f"{key}[{index}] must be a JSON object")
            missing = [field for field in required_fields if field not in item]
            if missing:
                raise ValueError(f"{key}[{index}] missing required fields: {', '.join(missing)}")
        return value
