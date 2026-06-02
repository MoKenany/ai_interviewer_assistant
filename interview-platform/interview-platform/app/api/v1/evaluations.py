from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.evaluation import EvaluationResponse, EvaluationNotesUpdate, InsightsResponse, SuggestedQuestionsResponse
from app.services.evaluation_service import EvaluationService
from app.core.security import get_current_user

router = APIRouter(prefix="/evaluations", tags=["evaluations"], dependencies=[Depends(get_current_user)])

# --- Specific routes FIRST (before /{evaluation_id} wildcard) ---

@router.get("/session/{session_id}", response_model=EvaluationResponse)
async def get_evaluation_by_session(session_id: int, db: AsyncSession = Depends(get_db)):
    return await EvaluationService.get_evaluation_by_session(db, session_id)

# --- Wildcard routes ---

@router.get("/{evaluation_id}", response_model=EvaluationResponse)
async def get_evaluation(evaluation_id: int, db: AsyncSession = Depends(get_db)):
    return await EvaluationService.get_evaluation(db, evaluation_id)

@router.get("/{evaluation_id}/insights", response_model=InsightsResponse)
async def get_insights(evaluation_id: int, db: AsyncSession = Depends(get_db)):
    return await EvaluationService.get_insights(db, evaluation_id)

@router.get("/{evaluation_id}/suggested-questions", response_model=SuggestedQuestionsResponse)
async def get_suggested_questions(evaluation_id: int, db: AsyncSession = Depends(get_db)):
    return await EvaluationService.get_suggested_questions(db, evaluation_id)

@router.patch("/{evaluation_id}/notes", response_model=EvaluationResponse)
async def update_notes(evaluation_id: int, notes_in: EvaluationNotesUpdate, db: AsyncSession = Depends(get_db)):
    return await EvaluationService.update_notes(db, evaluation_id, notes_in)

@router.delete("/{evaluation_id}")
async def delete_evaluation(evaluation_id: int, db: AsyncSession = Depends(get_db)):
    await EvaluationService.delete_evaluation(db, evaluation_id)
    return {"message": "Evaluation deleted"}
