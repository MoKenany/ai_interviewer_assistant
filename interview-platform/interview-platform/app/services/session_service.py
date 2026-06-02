from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, UploadFile
from app.schemas.session import SessionCreate
from app.repositories.session_repo import SessionRepo, MediaRepo, ArtifactRepo
from app.repositories.pipeline_repo import PipelineRepo
from app.models.interview_session import PipelineStatusEnum
from app.core import storage

class SessionService:
    @staticmethod
    async def create_session(db: AsyncSession, obj_in: SessionCreate):
        return await SessionRepo.create(db, obj_in)

    @staticmethod
    async def get_sessions(db: AsyncSession, application_id: int = None):
        return await SessionRepo.get_all(db, application_id)

    @staticmethod
    async def get_session(db: AsyncSession, session_id: int):
        session = await SessionRepo.get(db, session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        return session

    @staticmethod
    async def delete_session(db: AsyncSession, session_id: int):
        session = await SessionService.get_session(db, session_id)
        try:
            await SessionService.delete_session_media(db, session_id)
        except Exception:
            pass
        await SessionRepo.delete(db, session)

    @staticmethod
    async def upload_media(db: AsyncSession, session_id: int, file: UploadFile):
        session = await SessionService.get_session(db, session_id)
        active_run = await PipelineRepo.get_active_run_by_session(db, session_id)
        if active_run or session.pipeline_status == PipelineStatusEnum.running:
            raise HTTPException(
                status_code=409,
                detail={
                    "error_type": "pipeline_already_running",
                    "message": "Pipeline is already running for this session."
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
        file_path, ext = await storage.save_media(session_id, file)
        media = await MediaRepo.create(db, session_id, file_path, ext)
        session.media_file_id = media.id
        session.pipeline_status = PipelineStatusEnum.running
        await db.commit()
        await db.refresh(session)
        return session

    @staticmethod
    async def get_status(db: AsyncSession, session_id: int):
        run = await PipelineRepo.get_run_by_session(db, session_id)
        if not run:
            session = await SessionRepo.get(db, session_id)
            if not session:
                raise HTTPException(status_code=404, detail="Session not found")
            return {
                "id": 0,
                "session_id": session_id,
                "status": "pending",
                "started_at": session.created_at,
                "steps": []
            }
        return run

    @staticmethod
    async def get_artifacts(db: AsyncSession, session_id: int):
        return await ArtifactRepo.get_by_session(db, session_id)

    @staticmethod
    async def stop_pipeline(db: AsyncSession, session_id: int):
        from app.models.ai_pipeline_run import AIPipelineRun, PipelineRunStatusEnum
        from app.models.ai_pipeline_step import AIPipelineStep, StepStatusEnum
        from app.models.interview_session import InterviewSession, PipelineStatusEnum
        from sqlalchemy import select

        session = await db.get(InterviewSession, session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        session.pipeline_status = PipelineStatusEnum.failed
        
        run_query = await db.execute(
            select(AIPipelineRun)
            .filter(AIPipelineRun.session_id == session_id)
            .filter(AIPipelineRun.status == PipelineRunStatusEnum.running)
        )
        run = run_query.scalars().first()
        if run:
            run.status = PipelineRunStatusEnum.failed
            run.error_message = "Cancelled by user"
            
            steps_query = await db.execute(
                select(AIPipelineStep).filter(AIPipelineStep.run_id == run.id)
            )
            steps = steps_query.scalars().all()
            for step in steps:
                if step.status in [StepStatusEnum.running, StepStatusEnum.pending]:
                    step.status = StepStatusEnum.failed
                    step.error_message = "Cancelled by user"

        await db.commit()
        return {"message": "Pipeline execution stopped successfully"}

    @staticmethod
    async def delete_session_media(db: AsyncSession, session_id: int):
        import os
        session = await SessionService.get_session(db, session_id)
        media = await MediaRepo.get_by_session(db, session_id)
        if not media:
            raise HTTPException(status_code=404, detail="Media not found for this session")
            
        if media.file_path and os.path.exists(media.file_path):
            try:
                os.remove(media.file_path)
            except Exception:
                pass
                
        session.media_file_id = None
        await db.commit()
        
        await MediaRepo.delete(db, media)
        return {"message": "Media file deleted successfully from storage and database"}
