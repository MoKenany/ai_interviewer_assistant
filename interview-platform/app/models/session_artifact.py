import enum
from sqlalchemy import Column, Integer, String, Enum, DateTime, ForeignKey, Index
from sqlalchemy.sql import func
from app.database import Base, JSON_TYPE

class ArtifactTypeEnum(str, enum.Enum):
    transcript = "transcript"
    qa_pairs = "qa_pairs"
    evidence_quotes = "evidence_quotes"
    competency_map = "competency_map"

class SessionArtifact(Base):
    __tablename__ = "session_artifacts"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("interview_sessions.id"), nullable=False, index=True)
    pipeline_step_id = Column(Integer, ForeignKey("ai_pipeline_steps.id"), nullable=True, index=True)
    artifact_type = Column(Enum(ArtifactTypeEnum), nullable=False, index=True)
    content = Column(JSON_TYPE, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("idx_session_artifact_type", "session_id", "artifact_type"),
        Index("idx_pipeline_step_artifact_type", "pipeline_step_id", "artifact_type"),
    )
