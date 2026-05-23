from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.interview_session import InterviewSession
from app.models.media_file import MediaFile
from app.models.session_artifact import SessionArtifact
from app.schemas.session import SessionCreate
from typing import List, Optional

class SessionRepo:
    @staticmethod
    async def get_all(db: AsyncSession, application_id: Optional[int] = None) -> List[InterviewSession]:
        query = select(InterviewSession)
        if application_id:
            query = query.filter(InterviewSession.application_id == application_id)
        result = await db.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def get(db: AsyncSession, session_id: int) -> InterviewSession | None:
        result = await db.execute(select(InterviewSession).filter(InterviewSession.id == session_id))
        return result.scalars().first()

    @staticmethod
    async def create(db: AsyncSession, obj_in: SessionCreate) -> InterviewSession:
        db_obj = InterviewSession(**obj_in.model_dump())
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    @staticmethod
    async def delete(db: AsyncSession, session: InterviewSession):
        from app.models.session_artifact import SessionArtifact
        from app.models.ai_pipeline_step import AIPipelineStep
        from app.models.ai_pipeline_run import AIPipelineRun
        from app.models.interview_evaluation import InterviewEvaluation
        from app.models.media_file import MediaFile
        from sqlalchemy import delete

        session_id = session.id
        media_id = session.media_file_id

        # 1. Clear reference to avoid integrity violations during deletion
        session.media_file_id = None
        await db.commit()

        # 2. Delete SessionArtifact
        await db.execute(delete(SessionArtifact).where(SessionArtifact.session_id == session_id))
        
        # 3. Delete AIPipelineStep associated with AIPipelineRun of this session
        run_ids_query = await db.execute(select(AIPipelineRun.id).where(AIPipelineRun.session_id == session_id))
        run_ids = list(run_ids_query.scalars().all())
        if run_ids:
            await db.execute(delete(AIPipelineStep).where(AIPipelineStep.run_id.in_(run_ids)))
            
        # 4. Delete AIPipelineRun
        await db.execute(delete(AIPipelineRun).where(AIPipelineRun.session_id == session_id))
        
        # 5. Delete InterviewEvaluation
        await db.execute(delete(InterviewEvaluation).where(InterviewEvaluation.session_id == session_id))
        
        # 6. Delete MediaFile by id
        if media_id:
            await db.execute(delete(MediaFile).where(MediaFile.id == media_id))

        # 7. Delete InterviewSession
        await db.delete(session)
        await db.commit()

class MediaRepo:
    @staticmethod
    async def create(db: AsyncSession, session_id: int, file_path: str, file_type: str) -> MediaFile:
        db_obj = MediaFile(file_path=file_path, file_type=file_type, upload_status="uploaded")
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    @staticmethod
    async def get_by_session(db: AsyncSession, session_id: int) -> MediaFile | None:
        session = await db.get(InterviewSession, session_id)
        if not session or not session.media_file_id:
            return None
        return await db.get(MediaFile, session.media_file_id)

    @staticmethod
    async def delete(db: AsyncSession, media: MediaFile):
        await db.delete(media)
        await db.commit()

class ArtifactRepo:
    @staticmethod
    async def get_by_session(db: AsyncSession, session_id: int) -> List[SessionArtifact]:
        result = await db.execute(select(SessionArtifact).filter(SessionArtifact.session_id == session_id))
        return list(result.scalars().all())
