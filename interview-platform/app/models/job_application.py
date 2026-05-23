import enum
from sqlalchemy import Column, Integer, String, Enum, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class ApplicationStatusEnum(str, enum.Enum):
    applied = "applied"
    screening = "screening"
    interview = "interview"
    offer = "offer"
    hired = "hired"
    rejected = "rejected"

class JobApplication(Base):
    __tablename__ = "job_applications"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id"), nullable=False)
    job_version_id = Column(Integer, ForeignKey("job_versions.id"), nullable=False)
    status = Column(Enum(ApplicationStatusEnum), default=ApplicationStatusEnum.applied, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    candidate = relationship("Candidate", back_populates="applications")
    job_version = relationship("JobVersion")
    sessions = relationship("InterviewSession", cascade="all, delete-orphan", backref="application")
