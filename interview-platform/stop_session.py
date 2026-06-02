import asyncio
import sys

from app.database import AsyncSessionLocal
from app.services.session_service import SessionService
from app.models.interview_session import InterviewSession, PipelineStatusEnum
from app.models.ai_pipeline_run import AIPipelineRun, PipelineRunStatusEnum
from sqlalchemy import select

async def stop_stuck_session(session_id: int):
    print(f"Attempting to stop session {session_id}...")
    async with AsyncSessionLocal() as db:
        # Check if session exists
        session = await db.get(InterviewSession, session_id)
        if not session:
            print(f"Error: Session {session_id} not found.")
            return

        # Use the service method to stop it properly
        try:
            await SessionService.stop_pipeline(db, session_id)
            print(f"Successfully stopped pipeline for session {session_id} using SessionService.")
        except Exception as e:
            print(f"SessionService.stop_pipeline failed: {e}")
            print("Falling back to manual database update...")
            
            # Manual fallback
            session.pipeline_status = PipelineStatusEnum.failed
            
            # Find run
            run_query = await db.execute(
                select(AIPipelineRun).filter(AIPipelineRun.session_id == session_id)
            )
            runs = run_query.scalars().all()
            for run in runs:
                if run.status in [PipelineRunStatusEnum.running, PipelineRunStatusEnum.pending]:
                    run.status = PipelineRunStatusEnum.failed
                    run.error_message = "Cancelled manually via script"
                    
            await db.commit()
            print(f"Successfully force-stopped session {session_id} manually.")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        session_id = int(sys.argv[1])
        asyncio.run(stop_stuck_session(session_id))
    else:
        print("Please provide a session ID.")
