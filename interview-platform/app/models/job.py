import enum
from sqlalchemy import Column, Integer, String, Enum, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class JobStatusEnum(str, enum.Enum):
    open = "open"
    closed = "closed"
    draft = "draft"

class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    department = Column(String)
    location = Column(String)
    employment_type = Column(String)
    status = Column(Enum(JobStatusEnum), default=JobStatusEnum.draft, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    versions = relationship("JobVersion", back_populates="job", cascade="all, delete-orphan")
