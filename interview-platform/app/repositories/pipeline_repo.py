from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.models.ai_pipeline_run import AIPipelineRun, PipelineRunStatusEnum
from app.models.ai_pipeline_step import AIPipelineStep

class PipelineRepo:
    @staticmethod
    async def get_run(db: AsyncSession, run_id: int) -> AIPipelineRun | None:
        result = await db.execute(select(AIPipelineRun).options(selectinload(AIPipelineRun.steps)).filter(AIPipelineRun.id == run_id))
        return result.scalars().first()

    @staticmethod
    async def get_run_by_session(db: AsyncSession, session_id: int) -> AIPipelineRun | None:
        result = await db.execute(select(AIPipelineRun).options(selectinload(AIPipelineRun.steps)).filter(AIPipelineRun.session_id == session_id).order_by(AIPipelineRun.started_at.desc()))
        return result.scalars().first()

    @staticmethod
    async def get_active_run_by_session(db: AsyncSession, session_id: int) -> AIPipelineRun | None:
        result = await db.execute(
            select(AIPipelineRun)
            .filter(AIPipelineRun.session_id == session_id)
            .filter(AIPipelineRun.status.in_([PipelineRunStatusEnum.pending, PipelineRunStatusEnum.running]))
            .order_by(AIPipelineRun.started_at.desc())
        )
        return result.scalars().first()

    @staticmethod
    async def get_steps(db: AsyncSession, run_id: int):
        result = await db.execute(select(AIPipelineStep).filter(AIPipelineStep.run_id == run_id).order_by(AIPipelineStep.started_at))
        return list(result.scalars().all())
