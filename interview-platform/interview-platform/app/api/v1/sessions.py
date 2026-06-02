from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from app.database import get_db
from app.schemas.session import SessionCreate, SessionResponse, SessionArtifactResponse
from app.schemas.responses import SessionUploadResponse, CeleryTaskStatusResponse
from app.schemas.pipeline import AIPipelineRunResponse
from app.services.session_service import SessionService
from app.core.security import get_current_user
from app.models.user import User
from app.models.interview_session import InterviewSession, PipelineStatusEnum
from app.tasks.pipeline_tasks import run_interview_pipeline_task
from app.celery_app import celery_app
from celery.result import AsyncResult
from sqlalchemy.future import select

router = APIRouter(prefix="/sessions", tags=["sessions"], dependencies=[Depends(get_current_user)])

@router.post("", response_model=SessionResponse)
async def create_session(session_in: SessionCreate, db: AsyncSession = Depends(get_db)):
    return await SessionService.create_session(db, session_in)

@router.get("", response_model=List[SessionResponse])
async def list_sessions(application_id: Optional[int] = None, db: AsyncSession = Depends(get_db)):
    return await SessionService.get_sessions(db, application_id)

@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(session_id: int, db: AsyncSession = Depends(get_db)):
    return await SessionService.get_session(db, session_id)

@router.delete("/{session_id}")
async def delete_session(session_id: int, db: AsyncSession = Depends(get_db)):
    await SessionService.delete_session(db, session_id)
    return {"message": "Session and associated media deleted"}

@router.post("/{session_id}/upload", response_model=SessionUploadResponse)
async def upload_media(
    session_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Upload interview media and queue for processing via Celery
    
    Returns:
        SessionUploadResponse with task_id for polling progress
    """
    # Check if session exists and pipeline not already running
    session = await db.get(InterviewSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if session.pipeline_status == PipelineStatusEnum.running:
        raise HTTPException(
            status_code=409,
            detail={
                "error_type": "pipeline_already_running",
                "message": "A pipeline is already running for this session"
            }
        )
    if session.pipeline_status == PipelineStatusEnum.completed:
        raise HTTPException(
            status_code=409,
            detail={
                "error_type": "pipeline_already_completed",
                "message": "This session already has completed pipeline results. Use retry or create a new session."
            }
        )
    
    # Upload media using existing service
    session_response = await SessionService.upload_media(db, session_id, file)
    
    # Queue pipeline task in Celery. If the broker is unavailable, do not leave
    # the session stuck in "running" without a durable task.
    try:
        task = run_interview_pipeline_task.delay(session_id)
    except Exception as exc:
        session.pipeline_status = PipelineStatusEnum.failed
        await db.commit()
        raise HTTPException(
            status_code=503,
            detail={
                "error_type": "pipeline_queue_unavailable",
                "message": "Pipeline queue is unavailable. Please ensure Redis/Celery is running.",
                "details": {"error": str(exc)}
            }
        ) from exc
    
    return SessionUploadResponse(
        session_id=session_id,
        task_id=task.id,
        status="queued",
        message="Pipeline task queued successfully"
    )

@router.get("/{session_id}/status", response_model=AIPipelineRunResponse)
async def get_session_status(session_id: int, db: AsyncSession = Depends(get_db)):
    """Get current status of pipeline for session"""
    return await SessionService.get_status(db, session_id)

@router.get("/tasks/{task_id}", response_model=CeleryTaskStatusResponse)
async def get_task_status(task_id: str):
    """
    Get status of a Celery task
    
    Returns:
        Task status including progress information
    """
    task = AsyncResult(task_id, app=celery_app)
    
    return CeleryTaskStatusResponse(
        task_id=task_id,
        status=task.status,  # PENDING, STARTED, SUCCESS, FAILURE, RETRY
        result=task.result if task.successful() else None,
        error=str(task.info) if task.failed() else None
    )

@router.post("/{session_id}/retry")
async def retry_pipeline(session_id: int, db: AsyncSession = Depends(get_db)):
    """
    Retry pipeline for a session (using Celery)
    """
    session = await db.get(InterviewSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if session.pipeline_status == PipelineStatusEnum.running:
        raise HTTPException(
            status_code=409,
            detail="Pipeline already running"
        )
    if not session.media_file_id:
        raise HTTPException(status_code=400, detail="Upload media before starting the pipeline.")
    
    # Queue retry task
    try:
        task = run_interview_pipeline_task.delay(session_id)
    except Exception as exc:
        session.pipeline_status = PipelineStatusEnum.failed
        await db.commit()
        raise HTTPException(
            status_code=503,
            detail={
                "error_type": "pipeline_queue_unavailable",
                "message": "Pipeline queue is unavailable. Please ensure Redis/Celery is running.",
                "details": {"error": str(exc)}
            }
        ) from exc
    
    return {
        "task_id": task.id,
        "status": "queued",
        "message": "Retry task queued successfully"
    }

@router.get("/{session_id}/transcript")
async def get_transcript(session_id: int, db: AsyncSession = Depends(get_db)):
    session = await SessionService.get_session(db, session_id)
    return {"transcript": session.full_transcript}

@router.get("/{session_id}/artifacts", response_model=List[SessionArtifactResponse])
async def get_artifacts(session_id: int, db: AsyncSession = Depends(get_db)):
    return await SessionService.get_artifacts(db, session_id)

@router.delete("/{session_id}/media")
async def delete_session_media(session_id: int, db: AsyncSession = Depends(get_db)):
    """
    Deletes the media file (audio/video) associated with this session from the storage
    and removes the database record to free up space.
    """
    return await SessionService.delete_session_media(db, session_id)

@router.post("/{session_id}/stop")
async def stop_pipeline(session_id: int, db: AsyncSession = Depends(get_db)):
    """
    Stops a running pipeline execution for this session immediately.
    """
    return await SessionService.stop_pipeline(db, session_id)
