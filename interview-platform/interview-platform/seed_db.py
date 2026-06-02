"""
seed_db.py — Populate the database with initial sample data.
"""
import asyncio
import sys
import os

# Handle Windows console encoding for emojis
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

from app.database import AsyncSessionLocal
from app.models.user import User, RoleEnum
from app.models.job import Job, JobStatusEnum
from app.models.candidate import Candidate
from app.models.job_version import JobVersion, CriteriaModeEnum
from app.models.evaluation_criteria import EvaluationCriteria, PriorityLevelEnum
from app.models.job_application import JobApplication, ApplicationStatusEnum
from app.models.interview_session import InterviewSession, SessionTypeEnum, PipelineStatusEnum
from app.models.ai_pipeline_run import AIPipelineRun
from app.models.ai_pipeline_step import AIPipelineStep
from app.models.interview_evaluation import InterviewEvaluation
from app.models.media_file import MediaFile
from app.models.session_artifact import SessionArtifact
from app.models.audit_log import AuditLog
from app.core.security import hash_password
from sqlalchemy import select, delete

async def seed():
    async with AsyncSessionLocal() as session:
        print("🧹  Clearing existing data...")
        await session.execute(delete(AuditLog))
        await session.execute(delete(InterviewEvaluation))
        await session.execute(delete(SessionArtifact))
        await session.execute(delete(AIPipelineStep))
        await session.execute(delete(AIPipelineRun))
        await session.execute(delete(InterviewSession))
        await session.execute(delete(MediaFile))
        await session.execute(delete(JobApplication))
        await session.execute(delete(EvaluationCriteria))
        await session.execute(delete(JobVersion))
        await session.execute(delete(Job))
        await session.execute(delete(Candidate))
        await session.execute(delete(User))
        await session.commit()
        
        print("🌱  Seeding database...")
        
        # 1. Create Users
        admin = User(
            full_name="Admin User", 
            email="admin@example.com", 
            hashed_password=hash_password("admin123"), 
            role=RoleEnum.admin
        )
        hr = User(
            full_name="HR Manager", 
            email="hr@example.com", 
            hashed_password=hash_password("hr123"), 
            role=RoleEnum.hr
        )
        recruiter = User(
            full_name="Recruiter One", 
            email="recruiter@example.com", 
            hashed_password=hash_password("rec123"), 
            role=RoleEnum.recruiter
        )
        
        session.add_all([admin, hr, recruiter])
        await session.flush() # Flush to get IDs
        
        # 2. Create Jobs (linked to HR)
        jobs = [
            Job(
                user_id=hr.id,
                title="Python Backend Developer", 
                department="Engineering", 
                location="Remote", 
                employment_type="Full-time",
                status=JobStatusEnum.open
            ),
            Job(
                user_id=hr.id,
                title="AI Research Scientist", 
                department="R&D", 
                location="London", 
                employment_type="Full-time",
                status=JobStatusEnum.open
            ),
            Job(
                user_id=hr.id,
                title="Product Designer", 
                department="Design", 
                location="Berlin", 
                employment_type="Contract",
                status=JobStatusEnum.draft
            ),
        ]
        session.add_all(jobs)
        
        # 3. Create Candidates (linked to Recruiter)
        candidates = [
            Candidate(
                user_id=recruiter.id,
                full_name="Alice Johnson", 
                email="alice@example.com", 
                phone="+1234567890", 
                source="LinkedIn"
            ),
            Candidate(
                user_id=recruiter.id,
                full_name="Bob Smith", 
                email="bob@example.com", 
                phone="+0987654321", 
                source="Referral"
            ),
        ]
        session.add_all(candidates)
        
        await session.flush()
        
        job_versions = [
            JobVersion(
                job_id=jobs[0].id,
                version_number=1,
                raw_jd_text="Looking for a Python backend developer with FastAPI and PostgreSQL experience.",
                criteria_mode=CriteriaModeEnum.manual
            )
        ]
        session.add_all(job_versions)
        await session.flush()
        
        # 4.5 Create Criteria for Job Version
        criteria = [
            EvaluationCriteria(
                job_version_id=job_versions[0].id,
                name="Python Knowledge",
                description="Understanding of Python concepts, async programming, and basic data structures.",
                weight=40.0,
                is_mandatory=True,
                priority_level=PriorityLevelEnum.high
            ),
            EvaluationCriteria(
                job_version_id=job_versions[0].id,
                name="FastAPI Experience",
                description="Experience building REST APIs with FastAPI.",
                weight=30.0,
                is_mandatory=True,
                priority_level=PriorityLevelEnum.high
            ),
            EvaluationCriteria(
                job_version_id=job_versions[0].id,
                name="PostgreSQL",
                description="Database modeling and asyncpg experience.",
                weight=30.0,
                is_mandatory=False,
                priority_level=PriorityLevelEnum.medium
            )
        ]
        session.add_all(criteria)
        await session.flush()

        # 5. Create Applications
        applications = [
            JobApplication(
                candidate_id=candidates[0].id,
                job_version_id=job_versions[0].id,
                status=ApplicationStatusEnum.interview
            )
        ]
        session.add_all(applications)
        await session.flush()

        # 6. Create Sessions
        sessions = [
            InterviewSession(
                application_id=applications[0].id,
                session_type=SessionTypeEnum.technical,
                pipeline_status=PipelineStatusEnum.pending
            )
        ]
        session.add_all(sessions)
        
        await session.commit()
        print("✅  Seeding complete successfully!")
        print("\n🔑  Sample Credentials:")
        print("    - Admin: admin@example.com / admin123")
        print("    - HR:    hr@example.com    / hr123")
        print("    - Rec:   recruiter@example.com / rec123")

if __name__ == "__main__":
    try:
        asyncio.run(seed())
    except Exception as e:
        print(f"❌  Seeding failed: {e}")
        sys.exit(1)
