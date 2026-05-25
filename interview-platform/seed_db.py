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
from app.models.interview_session import InterviewSession, SessionTypeEnum, SessionAIModeEnum, PipelineStatusEnum
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
        
        print("🌱  Seeding realistic and meaningful database...")
        
        # 1. Create Users
        admin = User(full_name="المدير العام (Admin)", email="admin@example.com", hashed_password=hash_password("admin123"), role=RoleEnum.admin)
        hr_manager = User(full_name="فاطمة أحمد (HR Manager)", email="hr@example.com", hashed_password=hash_password("hr123"), role=RoleEnum.hr)
        recruiter_1 = User(full_name="Sarah Williams (Recruiter)", email="sarah@example.com", hashed_password=hash_password("rec123"), role=RoleEnum.recruiter)
        recruiter_2 = User(full_name="عمر خالد (Recruiter)", email="omar@example.com", hashed_password=hash_password("rec123"), role=RoleEnum.recruiter)
        
        session.add_all([admin, hr_manager, recruiter_1, recruiter_2])
        await session.flush()
        
        # 2. Create Jobs (linked to HR)
        jobs = [
            Job(user_id=hr_manager.id, title="Senior Backend Engineer - مهندس خلفيات أول", department="Engineering", location="Riyadh (Hybrid)", employment_type="Full-time", status=JobStatusEnum.open),
            Job(user_id=hr_manager.id, title="Product Marketing Manager", department="Marketing", location="Dubai (Remote)", employment_type="Full-time", status=JobStatusEnum.open),
            Job(user_id=hr_manager.id, title="AI/Machine Learning Scientist - عالم ذكاء اصطناعي", department="R&D", location="Cairo", employment_type="Full-time", status=JobStatusEnum.open),
            Job(user_id=hr_manager.id, title="Customer Success Specialist", department="Support", location="Remote", employment_type="Contract", status=JobStatusEnum.draft),
            Job(user_id=hr_manager.id, title="Lead Mobile App Developer", department="Engineering", location="London", employment_type="Full-time", status=JobStatusEnum.closed),
        ]
        session.add_all(jobs)
        await session.flush()
        
        # 3. Create Candidates (linked to Recruiters)
        candidates = [
            Candidate(user_id=recruiter_1.id, full_name="محمد عبد الرحمن", email="mohamed.ar@example.com", phone="+201001234567", source="LinkedIn"),
            Candidate(user_id=recruiter_1.id, full_name="Emily Davis", email="emily.davis@example.com", phone="+15551029384", source="Referral"),
            Candidate(user_id=recruiter_2.id, full_name="نورة السالم", email="noura.salem@example.com", phone="+966500000000", source="Company Website"),
            Candidate(user_id=recruiter_2.id, full_name="Michael Chang", email="m.chang@example.com", phone="+447911123456", source="Agency"),
            Candidate(user_id=recruiter_1.id, full_name="ليلى محمود", email="layla.m@example.com", phone="+971501234567", source="LinkedIn"),
            Candidate(user_id=recruiter_2.id, full_name="David Smith", email="david.smith88@example.com", phone="+18005559999", source="Indeed"),
            Candidate(user_id=recruiter_1.id, full_name="أحمد يوسف", email="ahmed.y@example.com", phone="+201112223334", source="Referral"),
            Candidate(user_id=recruiter_2.id, full_name="Jessica Taylor", email="jtaylor@example.com", phone="+61491570156", source="Company Website"),
        ]
        session.add_all(candidates)
        await session.flush()
        
        # 4. Create Job Versions
        job_versions = [
            JobVersion(
                job_id=jobs[0].id, # Senior Backend Engineer
                version_number=1,
                raw_jd_text="نبحث عن مهندس خلفيات بخبرة لا تقل عن 5 سنوات في بايثون (FastAPI/Django) وقواعد البيانات (PostgreSQL). يجب أن يكون قادراً على تصميم الأنظمة الموزعة وحل المشكلات المعقدة.",
                criteria_mode=CriteriaModeEnum.hybrid
            ),
            JobVersion(
                job_id=jobs[1].id, # Product Marketing Manager
                version_number=1,
                raw_jd_text="We are looking for a Product Marketing Manager to lead our GTM strategies. Must have 3+ years in B2B SaaS marketing, strong analytical skills, and excellent communication abilities.",
                criteria_mode=CriteriaModeEnum.manual
            ),
            JobVersion(
                job_id=jobs[2].id, # AI/ML Scientist
                version_number=1,
                raw_jd_text="مطلوب عالم ذكاء اصطناعي بخبرة في نماذج اللغة الكبيرة (LLMs)، ومعالجة اللغات الطبيعية (NLP)، وإطار عمل PyTorch.",
                criteria_mode=CriteriaModeEnum.ai
            )
        ]
        session.add_all(job_versions)
        await session.flush()
        
        # 4.5 Create Criteria for Job Versions
        criteria = [
            # Backend Engineer Criteria
            EvaluationCriteria(job_version_id=job_versions[0].id, name="Python & Frameworks", description="خبرة ممتازة في Python و FastAPI/Django.", weight=30.0, is_mandatory=True, priority_level=PriorityLevelEnum.high),
            EvaluationCriteria(job_version_id=job_versions[0].id, name="System Design", description="القدرة على تصميم أنظمة موزعة وقابلة للتوسع (Scalability).", weight=30.0, is_mandatory=True, priority_level=PriorityLevelEnum.high),
            EvaluationCriteria(job_version_id=job_versions[0].id, name="Database Management", description="كتابة استعلامات معقدة في PostgreSQL وتحسين الأداء.", weight=20.0, is_mandatory=True, priority_level=PriorityLevelEnum.medium),
            EvaluationCriteria(job_version_id=job_versions[0].id, name="Problem Solving", description="مهارات متقدمة في حل المشكلات البرمجية.", weight=20.0, is_mandatory=False, priority_level=PriorityLevelEnum.low),
            
            # Product Marketing Manager Criteria
            EvaluationCriteria(job_version_id=job_versions[1].id, name="GTM Strategy", description="Experience in developing and executing Go-To-Market strategies.", weight=40.0, is_mandatory=True, priority_level=PriorityLevelEnum.high),
            EvaluationCriteria(job_version_id=job_versions[1].id, name="B2B SaaS Experience", description="At least 3 years of marketing experience in the B2B SaaS sector.", weight=30.0, is_mandatory=True, priority_level=PriorityLevelEnum.high),
            EvaluationCriteria(job_version_id=job_versions[1].id, name="Communication Skills", description="Excellent written and verbal communication.", weight=30.0, is_mandatory=False, priority_level=PriorityLevelEnum.medium),
            
            # AI/ML Scientist Criteria
            EvaluationCriteria(job_version_id=job_versions[2].id, name="LLMs & NLP", description="خبرة عملية في تطوير وتدريب نماذج اللغة الكبيرة ومعالجة اللغات الطبيعية.", weight=50.0, is_mandatory=True, priority_level=PriorityLevelEnum.high),
            EvaluationCriteria(job_version_id=job_versions[2].id, name="PyTorch / TensorFlow", description="إتقان أدوات الذكاء الاصطناعي وخاصة PyTorch.", weight=30.0, is_mandatory=True, priority_level=PriorityLevelEnum.high),
            EvaluationCriteria(job_version_id=job_versions[2].id, name="Research Publications", description="وجود أبحاث منشورة في مؤتمرات الذكاء الاصطناعي هو ميزة إضافية.", weight=20.0, is_mandatory=False, priority_level=PriorityLevelEnum.low),
        ]
        session.add_all(criteria)
        await session.flush()

        # 5. Create Applications
        applications = [
            # Backend
            JobApplication(candidate_id=candidates[0].id, job_version_id=job_versions[0].id, status=ApplicationStatusEnum.interview),
            JobApplication(candidate_id=candidates[1].id, job_version_id=job_versions[0].id, status=ApplicationStatusEnum.applied),
            JobApplication(candidate_id=candidates[6].id, job_version_id=job_versions[0].id, status=ApplicationStatusEnum.screening),
            
            # Marketing
            JobApplication(candidate_id=candidates[2].id, job_version_id=job_versions[1].id, status=ApplicationStatusEnum.interview),
            JobApplication(candidate_id=candidates[5].id, job_version_id=job_versions[1].id, status=ApplicationStatusEnum.offer),
            
            # AI
            JobApplication(candidate_id=candidates[3].id, job_version_id=job_versions[2].id, status=ApplicationStatusEnum.interview),
            JobApplication(candidate_id=candidates[4].id, job_version_id=job_versions[2].id, status=ApplicationStatusEnum.rejected),
        ]
        session.add_all(applications)
        await session.flush()

        # 6. Create Sessions
        sessions = [
            InterviewSession(application_id=applications[0].id, session_type=SessionTypeEnum.technical, ai_mode=SessionAIModeEnum.strict, pipeline_status=PipelineStatusEnum.pending),
            InterviewSession(application_id=applications[3].id, session_type=SessionTypeEnum.cultural_fit, ai_mode=SessionAIModeEnum.normal, pipeline_status=PipelineStatusEnum.pending),
            InterviewSession(application_id=applications[5].id, session_type=SessionTypeEnum.technical, ai_mode=SessionAIModeEnum.lenient, pipeline_status=PipelineStatusEnum.pending),
        ]
        session.add_all(sessions)
        
        await session.commit()
        print("✅  Realistic seeding complete successfully!")
        print("\n🔑  Sample Credentials:")
        print("    - Admin: admin@example.com / admin123")
        print("    - HR:    hr@example.com / hr123")
        print("    - Rec 1: sarah@example.com / rec123")
        print("    - Rec 2: omar@example.com / rec123")

if __name__ == "__main__":
    try:
        asyncio.run(seed())
    except Exception as e:
        print(f"❌  Seeding failed: {e}")
        sys.exit(1)
