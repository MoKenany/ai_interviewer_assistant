import enum
from sqlalchemy import Column, Integer, String, Enum, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from app.database import Base, JSON_TYPE
from sqlalchemy.orm import relationship

class CriteriaModeEnum(str, enum.Enum):
    manual = "manual"
    ai = "ai"
    hybrid = "hybrid"

class JobVersion(Base):
    __tablename__ = "job_versions"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False)
    version_number = Column(Integer, nullable=False)
    raw_jd_text = Column(Text)
    structured_jd = Column(JSON_TYPE)
    criteria_mode = Column(Enum(CriteriaModeEnum), default=CriteriaModeEnum.hybrid)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    job = relationship("Job", back_populates="versions")
    criteria = relationship("EvaluationCriteria", back_populates="job_version", cascade="all, delete-orphan")
