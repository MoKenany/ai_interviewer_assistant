"""
Interview Pipeline Task - Main processing pipeline
Handles interview session processing with Celery task queue
"""

import asyncio
import os
from datetime import datetime
from typing import Optional

from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.celery_app import celery_app
from app.core.config import AUDIO_UPLOAD_DIR, AI_REQUEST_TIMEOUT, MAX_TOKENS_PER_SESSION
from app.core.ffmpeg import FFmpegClient
from app.core.ai.groq_client import GroqClient
from app.core.ai.gemini_client import GeminiClient, unwrap_ai_error, tokens_tracker
from app.core.token_budget import (
    TokenBudget,
    TokenBudgetExceeded as CoreTokenBudgetExceeded,
    TokenEstimator,
)
from app.database import AsyncSessionLocal
from app.models.interview_session import InterviewSession, PipelineStatusEnum
from app.models.job_application import JobApplication
from app.models.job_version import JobVersion
from app.models.media_file import MediaFile
from app.models.ai_pipeline_run import AIPipelineRun, PipelineRunStatusEnum
from app.models.ai_pipeline_step import AIPipelineStep, StepNameEnum, StepStatusEnum
from app.models.session_artifact import SessionArtifact, ArtifactTypeEnum
from app.models.interview_evaluation import InterviewEvaluation
from app.tasks.celery_exceptions import (
    RetriableError, FatalError, TranscriptionError,
    TokenBudgetExceeded as PipelineTokenBudgetExceeded,
    PipelineAlreadyRunning, MediaFileNotFound, JobVersionNotFound, CriteriaNotFound
)

import logging
logger = logging.getLogger(__name__)


def format_pipeline_error(exc: Exception) -> str:
    """Format error message for logging"""
    root_error = unwrap_ai_error(exc) if hasattr(exc, '__traceback__') else exc
    message = str(root_error)
    if not message:
        message = root_error.__class__.__name__
    return message


def validate_qa_pairs(qa_pairs: list, transcript: str, criteria_list: list) -> list:
    """
    Validate and clean QA pairs to prevent AI hallucination.
    Ensure competency_tag belongs to criteria names. If not, map to nearest or default.
    Ensure evidence quotes (if present) exist in the transcript, otherwise log a warning.
    """
    criteria_names = {c['name'].strip().lower(): c['name'] for c in criteria_list}
    valid_qa_pairs = []
    
    for qa in qa_pairs:
        tag = qa.competency_tag.strip().lower() if qa.competency_tag else ""
        if tag in criteria_names:
            # Map back to exactly matching case-sensitive criterion name
            qa.competency_tag = criteria_names[tag]
        else:
            # Fallback to the first criterion or default
            if criteria_list:
                qa.competency_tag = criteria_list[0]['name']
            else:
                qa.competency_tag = "General Skills"
        
        # Verify evidence quote exists in transcript (soft verification, case-insensitive)
        if qa.answer and qa.answer.lower() not in transcript.lower():
            logger.warning("QA extraction warning: AI-generated answer/evidence is not fully present in the transcript.")
            
        valid_qa_pairs.append(qa)
        
    return valid_qa_pairs


def artifact_content(data, metadata: Optional[dict] = None, **legacy_keys) -> dict:
    """Store artifacts in a unified shape while preserving legacy keys."""
    return {
        "data": data,
        "metadata": metadata or {},
        "version": "1.0",
        **legacy_keys,
    }


@celery_app.task(bind=True, max_retries=3)
def run_interview_pipeline_task(self, session_id: int):
    """
    Celery task for running interview pipeline
    
    Args:
        session_id: ID of the interview session to process
    
    Returns:
        Dictionary with pipeline results
    
    Raises:
        Will retry on RetriableError (up to max_retries)
        Will fail permanently on FatalError
    """
    try:
        # Run the async pipeline
        result = asyncio.run(_run_interview_pipeline_async(session_id))
        return result
    
    except RetriableError as exc:
        # Retry with exponential backoff
        retry_count = self.request.retries
        countdown = 2 ** retry_count  # 2, 4, 8, 16, 32 seconds
        
        logger.warning(
            f"Pipeline {session_id} failed (retriable), "
            f"retrying in {countdown}s (attempt {retry_count}): {exc}"
        )
        
        raise self.retry(exc=exc, countdown=countdown)
    
    except FatalError as exc:
        # Don't retry, fail immediately
        logger.error(f"Pipeline {session_id} failed (fatal): {exc}")
        raise
    
    except Exception as exc:
        # Unexpected error - treat as retriable
        logger.error(f"Pipeline {session_id} unexpected error: {exc}", exc_info=True)
        
        if self.request.retries < self.max_retries:
            countdown = 2 ** self.request.retries
            raise self.retry(exc=exc, countdown=countdown)
        else:
            raise FatalError(f"Pipeline failed after max retries: {exc}")


async def _run_interview_pipeline_async(session_id: int) -> dict:
    """
    Main async pipeline function
    
    Args:
        session_id: ID of the interview session
    
    Returns:
        Dictionary with results
    """
    from app.database import engine
    try:
        async with AsyncSessionLocal() as db:
            # Load session
            session = await db.get(InterviewSession, session_id)
            if not session:
                raise FatalError(f"Session {session_id} not found")
            
            # Check if pipeline already running
            existing_run_query = await db.execute(
                select(AIPipelineRun).filter(
                    AIPipelineRun.session_id == session_id,
                    AIPipelineRun.status.in_([PipelineRunStatusEnum.pending, PipelineRunStatusEnum.running])
                )
            )
            if existing_run_query.scalars().first():
                raise PipelineAlreadyRunning(f"Pipeline already running for session {session_id}")
            
            # Create pipeline run
            run = AIPipelineRun(
                session_id=session_id,
                status=PipelineRunStatusEnum.running,
                started_at=datetime.utcnow()
            )
            db.add(run)
            await db.commit()
            await db.refresh(run)
            
            # Initialize token budget
            budget = TokenBudget(max_tokens_per_session=MAX_TOKENS_PER_SESSION)
            
            # Create all steps upfront
            steps_dict = {}
            for step_name in [
                StepNameEnum.audio_extract,
                StepNameEnum.stt,
                StepNameEnum.qa_extraction,
                StepNameEnum.scoring,
                StepNameEnum.insight_generation
            ]:
                step = AIPipelineStep(
                    run_id=run.id,
                    step_name=step_name,
                    status=StepStatusEnum.pending,
                    started_at=datetime.utcnow()
                )
                db.add(step)
                steps_dict[step_name] = step
            
            await db.commit()
            
            current_step = None
            
            try:
                # Load job application and version
                app = await db.get(JobApplication, session.application_id)
                if not app:
                    raise JobVersionNotFound(f"Application {session.application_id} not found")
                
                job_version_query = await db.execute(
                    select(JobVersion)
                    .options(selectinload(JobVersion.criteria))
                    .filter(JobVersion.id == app.job_version_id)
                )
                job_version = job_version_query.scalars().first()
                if not job_version:
                    raise JobVersionNotFound(f"JobVersion {app.job_version_id} not found")
                
                criteria_list = [
                    {"name": c.name, "description": c.description}
                    for c in job_version.criteria
                ]
                if not criteria_list:
                    raise CriteriaNotFound(
                        "JobVersion has no evaluation criteria. "
                        "Please add criteria before running the pipeline."
                    )
                
                # Load media file
                media = await db.get(MediaFile, session.media_file_id)
                if not media:
                    raise MediaFileNotFound(f"Media file {session.media_file_id} not found")
                
                # ========== STEP 1: Audio Extract ==========
                current_step = steps_dict[StepNameEnum.audio_extract]
                transcript = await _step_audio_extract(
                    db, session, media, steps_dict, session_id
                )
                
                # ========== STEP 2: STT ==========
                current_step = steps_dict[StepNameEnum.stt]
                transcript = await _step_stt(
                    db, session, media, transcript, steps_dict, session_id
                )
                
                # ========== STEP 3: QA Extraction ==========
                current_step = steps_dict[StepNameEnum.qa_extraction]
                qa_pairs = await _step_qa_extraction(
                    db, session, transcript, criteria_list, steps_dict,
                    session_id, budget
                )
                
                # ========== STEP 4: Scoring ==========
                current_step = steps_dict[StepNameEnum.scoring]
                scoring_res = await _step_scoring(
                    db, session, qa_pairs, criteria_list, job_version,
                    steps_dict, session_id, budget
                )
                
                # ========== STEP 5: Insight Generation ==========
                current_step = steps_dict[StepNameEnum.insight_generation]
                insight_res = await _step_insight_generation(
                    db, session, scoring_res, qa_pairs, criteria_list,
                    steps_dict, session_id, budget
                )
                
                # ========== Save Evaluation ==========
                await _save_evaluation(db, session, scoring_res, insight_res)
                
                # Mark pipeline as completed
                run.status = PipelineRunStatusEnum.completed
                run.completed_at = datetime.utcnow()
                session.pipeline_status = PipelineStatusEnum.completed
                await db.commit()
                
                logger.info(f"Pipeline {session_id} completed successfully. Budget: {budget}")
                
                return {
                    "session_id": session_id,
                    "status": "completed",
                    "total_tokens": budget.total_used,
                    "budget": budget.to_dict()
                }
            
            except Exception as exc:
                # Handle error
                error_msg = format_pipeline_error(exc)
                
                if current_step:
                    current_step.status = StepStatusEnum.failed
                    current_step.completed_at = datetime.utcnow()
                    current_step.error_message = error_msg
                
                run.status = PipelineRunStatusEnum.failed
                run.completed_at = datetime.utcnow()
                run.error_message = error_msg
                session.pipeline_status = PipelineStatusEnum.failed
                
                await db.commit()
                
                logger.error(f"Pipeline {session_id} failed: {error_msg}", exc_info=True)
                
                # Re-raise to trigger Celery retry logic
                raise
    finally:
        await engine.dispose()


async def _step_audio_extract(db, session, media, steps_dict, session_id) -> str:
    """Step 1: Extract audio from video if needed"""
    step = steps_dict[StepNameEnum.audio_extract]
    current_step = step
    
    try:
        start = datetime.utcnow()
        step.status = StepStatusEnum.running
        await db.commit()
        
        is_text = media.file_type == "txt"
        
        if is_text:
            # Skip extraction for text files
            end = datetime.utcnow()
            step.status = StepStatusEnum.success
            step.completed_at = end
            step.latency_ms = int((end - start).total_seconds() * 1000)
            step.tokens_used = 0
            await db.commit()
            return ""  # Will read in STT step
        else:
            # Extract audio from video
            audio_path = os.path.join(AUDIO_UPLOAD_DIR, f"{session_id}_extracted.mp3")
            FFmpegClient.extract_audio(media.file_path, audio_path)
            
            end = datetime.utcnow()
            step.status = StepStatusEnum.success
            step.completed_at = end
            step.latency_ms = int((end - start).total_seconds() * 1000)
            step.tokens_used = 0
            await db.commit()
            
            return audio_path
    
    except Exception as exc:
        step.status = StepStatusEnum.failed
        step.error_message = str(exc)
        await db.commit()
        raise


async def _step_stt(db, session, media, audio_path, steps_dict, session_id) -> str:
    """Step 2: Speech-to-Text transcription"""
    step = steps_dict[StepNameEnum.stt]
    
    try:
        start = datetime.utcnow()
        step.status = StepStatusEnum.running
        await db.commit()
        
        if media.file_type == "txt":
            # Read text file directly
            with open(media.file_path, "r", encoding="utf-8") as f:
                transcript = f.read()
            tokens_used = 0
        else:
            # Transcribe audio with timeout
            transcript = await asyncio.wait_for(
                GroqClient.transcribe(audio_path),
                timeout=AI_REQUEST_TIMEOUT
            )
            
            if not transcript or transcript.strip() == "":
                raise TranscriptionError(
                    "Transcription failed or returned empty text. "
                    "Please check the audio file quality."
                )
            
            tokens_used = TokenEstimator.estimate_stt_tokens(transcript)
        
        # Store transcript
        session.full_transcript = transcript
        db.add(SessionArtifact(
            session_id=session_id,
            pipeline_step_id=step.id,
            artifact_type=ArtifactTypeEnum.transcript,
            content=artifact_content(
                transcript,
                metadata={"source": "text" if media.file_type == "txt" else "stt"},
                transcript=transcript,
            )
        ))
        
        end = datetime.utcnow()
        step.status = StepStatusEnum.success
        step.completed_at = end
        step.latency_ms = int((end - start).total_seconds() * 1000)
        step.tokens_used = tokens_used
        await db.commit()
        
        return transcript
    
    except asyncio.TimeoutError:
        raise RetriableError(
            f"STT request timed out after {AI_REQUEST_TIMEOUT} seconds"
        )
    except Exception as exc:
        step.status = StepStatusEnum.failed
        step.error_message = str(exc)
        await db.commit()
        raise


async def _step_qa_extraction(
    db, session, transcript, criteria_list, steps_dict,
    session_id, budget
) -> list:
    """Step 3: Extract QA pairs from transcript"""
    step = steps_dict[StepNameEnum.qa_extraction]
    
    try:
        start = datetime.utcnow()
        step.status = StepStatusEnum.running
        
        # Check token budget
        estimated = TokenEstimator.estimate_tokens(
            f"{transcript}|{str(criteria_list)}"
        )
        if not budget.can_proceed(estimated):
            raise PipelineTokenBudgetExceeded(
                f"Cannot proceed with QA extraction: "
                f"estimated {estimated} tokens, only {budget.remaining} remaining"
            )
        
        await db.commit()
        
        # Extract QA pairs with timeout
        qa_pairs = await asyncio.wait_for(
            GeminiClient.run_qa_extraction(transcript, criteria_list),
            timeout=AI_REQUEST_TIMEOUT
        )
        actual_tokens = tokens_tracker.get() or estimated
        
        # Validate extracted QA pairs to prevent hallucinations
        qa_pairs = validate_qa_pairs(qa_pairs, transcript, criteria_list)
        
        # Store artifacts
        qa_pairs_data = [q.model_dump(mode='json') for q in qa_pairs]
        db.add(SessionArtifact(
            session_id=session_id,
            pipeline_step_id=step.id,
            artifact_type=ArtifactTypeEnum.qa_pairs,
            content=artifact_content(
                qa_pairs_data,
                metadata={"count": len(qa_pairs_data)},
                qa_pairs=qa_pairs_data,
            )
        ))
        
        end = datetime.utcnow()
        step.status = StepStatusEnum.success
        step.completed_at = end
        step.latency_ms = int((end - start).total_seconds() * 1000)
        
        # Track actual tokens from Gemini
        step.tokens_used = actual_tokens
        budget.add_usage("qa_extraction", actual_tokens)
        
        await db.commit()
        
        return qa_pairs
    
    except asyncio.TimeoutError:
        raise RetriableError(
            f"QA extraction timed out after {AI_REQUEST_TIMEOUT} seconds"
        )
    except (PipelineTokenBudgetExceeded, CoreTokenBudgetExceeded) as exc:
        step.status = StepStatusEnum.failed
        step.error_message = str(exc)
        await db.commit()
        raise PipelineTokenBudgetExceeded(str(exc))
    except Exception as exc:
        step.status = StepStatusEnum.failed
        step.error_message = str(exc)
        await db.commit()
        raise


async def _step_scoring(
    db, session, qa_pairs, criteria_list, job_version,
    steps_dict, session_id, budget
) -> object:
    """Step 4: Score answers against criteria"""
    step = steps_dict[StepNameEnum.scoring]
    
    try:
        start = datetime.utcnow()
        step.status = StepStatusEnum.running
        
        # Check token budget
        estimated = TokenEstimator.estimate_tokens(
            f"{str(qa_pairs)}|{job_version.raw_jd_text}"
        )
        if not budget.can_proceed(estimated):
            raise PipelineTokenBudgetExceeded(
                f"Cannot proceed with scoring: "
                f"estimated {estimated} tokens, only {budget.remaining} remaining"
            )
        
        await db.commit()
        
        # Run scoring with timeout
        scoring_res = await asyncio.wait_for(
            GeminiClient.run_scoring(qa_pairs, criteria_list, job_version.raw_jd_text),
            timeout=AI_REQUEST_TIMEOUT
        )
        actual_tokens = tokens_tracker.get() or estimated
        
        # Store artifacts
        scoring_data = scoring_res.model_dump(mode='json')
        db.add(SessionArtifact(
            session_id=session_id,
            pipeline_step_id=step.id,
            artifact_type=ArtifactTypeEnum.evidence_quotes,
            content=artifact_content(
                scoring_data,
                metadata={"criteria_count": len(criteria_list)},
                scoring=scoring_data,
            )
        ))
        
        end = datetime.utcnow()
        step.status = StepStatusEnum.success
        step.completed_at = end
        step.latency_ms = int((end - start).total_seconds() * 1000)
        
        # Track actual tokens from Gemini
        step.tokens_used = actual_tokens
        budget.add_usage("scoring", actual_tokens)
        
        await db.commit()
        
        return scoring_res
    
    except asyncio.TimeoutError:
        raise RetriableError(
            f"Scoring timed out after {AI_REQUEST_TIMEOUT} seconds"
        )
    except (PipelineTokenBudgetExceeded, CoreTokenBudgetExceeded) as exc:
        step.status = StepStatusEnum.failed
        step.error_message = str(exc)
        await db.commit()
        raise PipelineTokenBudgetExceeded(str(exc))
    except Exception as exc:
        step.status = StepStatusEnum.failed
        step.error_message = str(exc)
        await db.commit()
        raise


async def _step_insight_generation(
    db, session, scoring_res, qa_pairs, criteria_list,
    steps_dict, session_id, budget
) -> object:
    """Step 5: Generate insights and hiring recommendation"""
    step = steps_dict[StepNameEnum.insight_generation]
    
    try:
        start = datetime.utcnow()
        step.status = StepStatusEnum.running
        
        # Check token budget
        estimated = TokenEstimator.estimate_tokens(
            f"{str(scoring_res)}|{str(qa_pairs)}"
        )
        if not budget.can_proceed(estimated):
            raise PipelineTokenBudgetExceeded(
                f"Cannot proceed with insight generation: "
                f"estimated {estimated} tokens, only {budget.remaining} remaining"
            )
        
        await db.commit()
        
        # Generate insights with timeout
        insight_res = await asyncio.wait_for(
            GeminiClient.run_insight_generation(scoring_res, qa_pairs, criteria_list),
            timeout=AI_REQUEST_TIMEOUT
        )
        actual_tokens = tokens_tracker.get() or estimated
        
        # Store artifacts
        insight_data = insight_res.model_dump(mode='json')
        db.add(SessionArtifact(
            session_id=session_id,
            pipeline_step_id=step.id,
            artifact_type=ArtifactTypeEnum.competency_map,
            content=artifact_content(
                insight_data,
                metadata={"criteria_count": len(criteria_list)},
                insights=insight_data,
            )
        ))
        
        end = datetime.utcnow()
        step.status = StepStatusEnum.success
        step.completed_at = end
        step.latency_ms = int((end - start).total_seconds() * 1000)
        
        # Track actual tokens from Gemini
        step.tokens_used = actual_tokens
        budget.add_usage("insight_generation", actual_tokens)
        
        await db.commit()
        
        return insight_res
    
    except asyncio.TimeoutError:
        raise RetriableError(
            f"Insight generation timed out after {AI_REQUEST_TIMEOUT} seconds"
        )
    except (PipelineTokenBudgetExceeded, CoreTokenBudgetExceeded) as exc:
        step.status = StepStatusEnum.failed
        step.error_message = str(exc)
        await db.commit()
        raise PipelineTokenBudgetExceeded(str(exc))
    except Exception as exc:
        step.status = StepStatusEnum.failed
        step.error_message = str(exc)
        await db.commit()
        raise


async def _save_evaluation(db, session, scoring_res, insight_res):
    """Save evaluation results to database"""
    eval_query = await db.execute(
        select(InterviewEvaluation).filter(
            InterviewEvaluation.session_id == session.id
        )
    )
    existing = eval_query.scalars().first()
    
    if existing:
        # Update existing evaluation
        existing.overall_score = scoring_res.overall_weighted_score
        existing.competency_breakdown = [
            s.model_dump(mode='json')
            for s in scoring_res.per_criterion_scores
        ]
        existing.executive_summary = insight_res.executive_summary
        existing.hiring_recommendation = insight_res.hiring_recommendation
        existing.confidence_score = insight_res.confidence_score
        existing.strengths = [s.model_dump(mode='json') for s in insight_res.strengths]
        existing.weaknesses = [w.model_dump(mode='json') for w in insight_res.weaknesses]
        existing.interviewer_notes = insight_res.interviewer_notes.model_dump(mode='json')
        existing.suggested_questions = [q.model_dump(mode='json') for q in insight_res.suggested_questions]
    else:
        # Create new evaluation
        evaluation = InterviewEvaluation(
            session_id=session.id,
            application_id=session.application_id,
            overall_score=scoring_res.overall_weighted_score,
            competency_breakdown=[
                s.model_dump(mode='json')
                for s in scoring_res.per_criterion_scores
            ],
            executive_summary=insight_res.executive_summary,
            hiring_recommendation=insight_res.hiring_recommendation,
            confidence_score=insight_res.confidence_score,
            strengths=[s.model_dump(mode='json') for s in insight_res.strengths],
            weaknesses=[w.model_dump(mode='json') for w in insight_res.weaknesses],
            interviewer_notes=insight_res.interviewer_notes.model_dump(mode='json'),
            suggested_questions=[q.model_dump(mode='json') for q in insight_res.suggested_questions]
        )
        db.add(evaluation)
    
    await db.commit()
