from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from app.database import get_db
from app.schemas.pipeline import AIPipelineRunResponse, AIPipelineStepResponse
from app.repositories.pipeline_repo import PipelineRepo
from app.tasks.pipeline_tasks import run_interview_pipeline_task
from app.core.security import get_current_user
from app.models.interview_session import InterviewSession, PipelineStatusEnum

router = APIRouter(prefix="/pipeline", tags=["pipeline"], dependencies=[Depends(get_current_user)])

@router.get("/runs/{run_id}", response_model=AIPipelineRunResponse)
async def get_pipeline_run(run_id: int, db: AsyncSession = Depends(get_db)):
    run = await PipelineRepo.get_run(db, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Pipeline run not found")
    return run

@router.get("/runs/{run_id}/steps", response_model=List[AIPipelineStepResponse])
async def get_pipeline_steps(run_id: int, db: AsyncSession = Depends(get_db)):
    return await PipelineRepo.get_steps(db, run_id)

@router.post("/runs/{run_id}/steps/{step_name}/retry")
async def retry_step(run_id: int, step_name: str, db: AsyncSession = Depends(get_db)):
    run = await PipelineRepo.get_run(db, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Pipeline run not found")
    active_run = await PipelineRepo.get_active_run_by_session(db, run.session_id)
    if active_run:
        raise HTTPException(status_code=409, detail="Pipeline is already running for this session.")
    session = await db.get(InterviewSession, run.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    # Dispatch task FIRST — only update DB state if dispatch succeeds.
    # Updating status before dispatch causes the session to get permanently stuck
    # in "running" if Redis/Celery is unavailable when .delay() throws.
    try:
        task = run_interview_pipeline_task.delay(run.session_id)
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail={
                "error_type": "pipeline_queue_unavailable",
                "message": "Pipeline queue is unavailable. Please ensure Redis/Celery is running.",
                "details": {"error": str(exc)}
            }
        ) from exc
    session.pipeline_status = PipelineStatusEnum.running
    await db.commit()
    return {
        "message": f"Retry queued for session {run.session_id}",
        "task_id": task.id,
        "status": "queued"
    }

