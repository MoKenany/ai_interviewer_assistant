"""
storage.py — Local file system storage manager.

Centralizes all file read/write operations so the rest of the codebase
never directly touches os.path or aiofiles.
"""

import os
import aiofiles
import uuid
from fastapi import UploadFile, HTTPException
from app.core.config import (
    RESUME_UPLOAD_DIR, VIDEO_UPLOAD_DIR,
    AUDIO_UPLOAD_DIR, PROCESSED_DIR,
    MAX_UPLOAD_BYTES,
)

ALLOWED_RESUME_TYPES = {
    "application/pdf": ".pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "application/msword": ".doc",
}

ALLOWED_MEDIA_TYPES = {
    "video/mp4": "mp4",
    "video/quicktime": "mov",
    "video/webm": "webm",
    "audio/mpeg": "mp3",
    "audio/wav": "wav",
    "audio/x-wav": "wav",
    "audio/webm": "webm",
    "audio/mp4": "m4a",
    "audio/x-m4a": "m4a",
    "audio/ogg": "ogg",
    "text/plain": "txt",
}


async def save_resume(candidate_id: int, file: UploadFile) -> str:
    """Save a candidate resume. Returns the absolute file path."""
    if file.content_type not in ALLOWED_RESUME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type '{file.content_type}'. Allowed: PDF, DOCX."
        )
    ext = ALLOWED_RESUME_TYPES[file.content_type]
    file_path = os.path.join(RESUME_UPLOAD_DIR, f"{candidate_id}_resume{ext}")
    await _write_file(file, file_path)
    return file_path


async def save_media(session_id: int, file: UploadFile) -> tuple[str, str]:
    """Save an interview media file. Returns (absolute_path, file_type)."""
    if file.content_type not in ALLOWED_MEDIA_TYPES:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid media type '{file.content_type}'. Allowed: MP4, MOV, WEBM, MP3, WAV, M4A, OGG, TXT."
        )
    ext = ALLOWED_MEDIA_TYPES[file.content_type]
    if ext == "txt":
        storage_dir = PROCESSED_DIR
    elif ext in ["mp4", "mov", "webm"] and "video" in file.content_type:
        storage_dir = VIDEO_UPLOAD_DIR
    else:
        storage_dir = AUDIO_UPLOAD_DIR
        
    file_path = os.path.join(storage_dir, f"{session_id}_{uuid.uuid4().hex}_media.{ext}")
    await _write_file(file, file_path)
    return file_path, ext


def get_processed_path(session_id: int, suffix: str = "extracted.mp3") -> str:
    """Return a path for a processed output file (e.g., extracted audio)."""
    return os.path.join(AUDIO_UPLOAD_DIR, f"{session_id}_{suffix}")


async def _write_file(file: UploadFile, dest_path: str) -> None:
    """Write upload bytes to destination path."""
    try:
        total_bytes = 0
        async with aiofiles.open(dest_path, "wb") as f:
            while True:
                chunk = await file.read(1024 * 1024)  # 1MB chunk
                if not chunk:
                    break
                total_bytes += len(chunk)
                if total_bytes > MAX_UPLOAD_BYTES:
                    raise HTTPException(
                        status_code=413,
                        detail={
                            "error_type": "upload_too_large",
                            "message": f"Uploaded file exceeds the {MAX_UPLOAD_BYTES} byte limit."
                        }
                    )
                await f.write(chunk)
    except HTTPException:
        try:
            if os.path.exists(dest_path):
                os.remove(dest_path)
        finally:
            raise
    except OSError as e:
        raise HTTPException(
            status_code=500,
            detail={
                "error_type": "storage_write_failed",
                "message": f"Failed to write file to storage: {e}"
            }
        )
