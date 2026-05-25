import enum
from sqlalchemy import Column, Integer, Enum, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class SessionTypeEnum(str, enum.Enum):
    screening = "screening"
    technical = "technical"
    cultural_fit = "cultural_fit"
    final = "final"

class SessionAIModeEnum(str, enum.Enum):
    very_strict = "very_strict"
    strict = "strict"
    normal = "normal"
    lenient = "lenient"

class PipelineStatusEnum(str, enum.Enum):
    pending = "pending"
    running = "running"
    completed = "completed"
    failed = "failed"

class InterviewSession(Base):
    __tablename__ = "interview_sessions"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("job_applications.id"), nullable=False, index=True)
    session_type = Column(Enum(SessionTypeEnum), nullable=False)
    media_file_id = Column(Integer, ForeignKey("media_files.id", name="fk_session_media"), nullable=True, index=True)
    ai_mode = Column(Enum(SessionAIModeEnum), default=SessionAIModeEnum.normal, nullable=False, server_default=SessionAIModeEnum.normal.value)
    pipeline_status = Column(Enum(PipelineStatusEnum), default=PipelineStatusEnum.pending, index=True)
    full_transcript = Column(Text, nullable=True)
    auto_delete_media = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    pipeline_runs = relationship("AIPipelineRun", cascade="all, delete-orphan", backref="session")
    evaluations = relationship("InterviewEvaluation", cascade="all, delete-orphan", backref="session")
    artifacts = relationship("SessionArtifact", cascade="all, delete-orphan", backref="session")
    media_file = relationship("MediaFile", foreign_keys=[media_file_id])
