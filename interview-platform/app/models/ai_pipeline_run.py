import enum
from sqlalchemy import Column, Integer, String, Enum, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class PipelineRunStatusEnum(str, enum.Enum):
    pending = "pending"
    running = "running"
    completed = "completed"
    failed = "failed"

class AIPipelineRun(Base):
    __tablename__ = "ai_pipeline_runs"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("interview_sessions.id"), nullable=False, index=True)
    status = Column(Enum(PipelineRunStatusEnum), default=PipelineRunStatusEnum.pending, index=True)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    error_message = Column(String, nullable=True)

    steps = relationship("AIPipelineStep", back_populates="run", cascade="all, delete-orphan")
