import enum
from sqlalchemy import Column, Integer, String, Enum, DateTime, ForeignKey, Float, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class PriorityLevelEnum(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"

class EvaluationCriteria(Base):
    __tablename__ = "evaluation_criteria"

    id = Column(Integer, primary_key=True, index=True)
    job_version_id = Column(Integer, ForeignKey("job_versions.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(String)
    weight = Column(Float, nullable=False)
    is_mandatory = Column(Boolean, default=False, nullable=False)
    priority_level = Column(Enum(PriorityLevelEnum), default=PriorityLevelEnum.medium)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    job_version = relationship("JobVersion", back_populates="criteria")
