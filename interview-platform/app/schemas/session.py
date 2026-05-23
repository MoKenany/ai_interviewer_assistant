from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.models.interview_session import SessionTypeEnum, PipelineStatusEnum
from app.models.media_file import UploadStatusEnum
from app.models.session_artifact import ArtifactTypeEnum

class SessionCreate(BaseModel):
    application_id: int
    session_type: SessionTypeEnum
    auto_delete_media: bool = False

class SessionResponse(BaseModel):
    id: int
    application_id: int
    session_type: SessionTypeEnum
    media_file_id: Optional[int] = None
    pipeline_status: PipelineStatusEnum
    full_transcript: Optional[str] = None
    auto_delete_media: bool = False
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True

class MediaFileResponse(BaseModel):
    id: int
    session_id: Optional[int] = None
    file_path: str
    file_type: str
    duration_seconds: Optional[int] = None
    upload_status: UploadStatusEnum
    created_at: datetime

    class Config:
        from_attributes = True

class SessionArtifactResponse(BaseModel):
    id: int
    session_id: int
    pipeline_step_id: Optional[int] = None
    artifact_type: ArtifactTypeEnum
    content: dict
    created_at: datetime

    class Config:
        from_attributes = True
