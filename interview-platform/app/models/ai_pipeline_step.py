import enum
from sqlalchemy import Column, Integer, String, Enum, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class StepNameEnum(str, enum.Enum):
    audio_extract = "audio_extract"
    stt = "stt"
    qa_extraction = "qa_extraction"
    scoring = "scoring"
    insight_generation = "insight_generation"

class StepStatusEnum(str, enum.Enum):
    pending = "pending"
    running = "running"
    success = "success"
    failed = "failed"

class AIPipelineStep(Base):
    __tablename__ = "ai_pipeline_steps"

    id = Column(Integer, primary_key=True, index=True)
    run_id = Column(Integer, ForeignKey("ai_pipeline_runs.id"), nullable=False)
    step_name = Column(Enum(StepNameEnum), nullable=False)
    status = Column(Enum(StepStatusEnum), default=StepStatusEnum.pending)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    error_message = Column(String, nullable=True)
    tokens_used = Column(Integer, nullable=True)
    latency_ms = Column(Integer, nullable=True)
    prompt_version = Column(String, nullable=True)

    run = relationship("AIPipelineRun", back_populates="steps")
