from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.interview_evaluation import InterviewEvaluation

class EvaluationRepo:
    @staticmethod
    async def get(db: AsyncSession, eval_id: int) -> InterviewEvaluation | None:
        result = await db.execute(select(InterviewEvaluation).filter(InterviewEvaluation.id == eval_id))
        return result.scalars().first()

    @staticmethod
    async def get_by_session(db: AsyncSession, session_id: int) -> InterviewEvaluation | None:
        result = await db.execute(select(InterviewEvaluation).filter(InterviewEvaluation.session_id == session_id))
        return result.scalars().first()

    @staticmethod
    async def update_notes(db: AsyncSession, eval_id: int, notes: dict) -> InterviewEvaluation | None:
        evaluation = await EvaluationRepo.get(db, eval_id)
        if evaluation:
            evaluation.interviewer_notes = notes
            await db.commit()
            await db.refresh(evaluation)
        return evaluation

    @staticmethod
    async def delete(db: AsyncSession, evaluation: InterviewEvaluation):
        await db.delete(evaluation)
        await db.commit()
