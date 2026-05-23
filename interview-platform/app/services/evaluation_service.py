from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from app.repositories.evaluation_repo import EvaluationRepo
from app.schemas.evaluation import EvaluationNotesUpdate

class EvaluationService:
    @staticmethod
    async def get_evaluation(db: AsyncSession, eval_id: int):
        evaluation = await EvaluationRepo.get(db, eval_id)
        if not evaluation:
            raise HTTPException(status_code=404, detail="Evaluation not found")
        return evaluation

    @staticmethod
    async def get_evaluation_by_session(db: AsyncSession, session_id: int):
        evaluation = await EvaluationRepo.get_by_session(db, session_id)
        if not evaluation:
            raise HTTPException(status_code=404, detail="Evaluation not found for this session")
        return evaluation

    @staticmethod
    async def get_insights(db: AsyncSession, eval_id: int):
        evaluation = await EvaluationService.get_evaluation(db, eval_id)
        return {
            "strengths": evaluation.strengths,
            "weaknesses": evaluation.weaknesses,
            "interviewer_notes": evaluation.interviewer_notes
        }

    @staticmethod
    async def get_suggested_questions(db: AsyncSession, eval_id: int):
        evaluation = await EvaluationService.get_evaluation(db, eval_id)
        return {"suggested_questions": evaluation.suggested_questions}

    @staticmethod
    async def update_notes(db: AsyncSession, eval_id: int, notes_in: EvaluationNotesUpdate):
        evaluation = await EvaluationRepo.update_notes(db, eval_id, notes_in.notes)
        if not evaluation:
            raise HTTPException(status_code=404, detail="Evaluation not found")
        return evaluation

    @staticmethod
    async def delete_evaluation(db: AsyncSession, eval_id: int):
        evaluation = await EvaluationService.get_evaluation(db, eval_id)
        await EvaluationRepo.delete(db, evaluation)
