import enum
from sqlalchemy import Column, Integer, String, Enum, DateTime
from sqlalchemy.sql import func
from app.database import Base

class UploadStatusEnum(str, enum.Enum):
    pending = "pending"
    uploaded = "uploaded"
    failed = "failed"

class MediaFile(Base):
    __tablename__ = "media_files"

    id = Column(Integer, primary_key=True, index=True)
    file_path = Column(String, nullable=False)
    file_type = Column(String, nullable=False)
    duration_seconds = Column(Integer, nullable=True)
    upload_status = Column(Enum(UploadStatusEnum), default=UploadStatusEnum.pending)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
