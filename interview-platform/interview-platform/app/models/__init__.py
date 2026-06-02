# models package — import all models here so Alembic and SQLAlchemy can discover them
from app.models.user import User
from app.models.job import Job
from app.models.job_version import JobVersion
from app.models.evaluation_criteria import EvaluationCriteria
from app.models.candidate import Candidate
from app.models.job_application import JobApplication
from app.models.interview_session import InterviewSession
from app.models.media_file import MediaFile
from app.models.ai_pipeline_run import AIPipelineRun
from app.models.ai_pipeline_step import AIPipelineStep
from app.models.session_artifact import SessionArtifact
from app.models.interview_evaluation import InterviewEvaluation
from app.models.audit_log import AuditLog

__all__ = [
    "User", "Job", "JobVersion", "EvaluationCriteria",
    "Candidate", "JobApplication",
    "InterviewSession", "MediaFile",
    "AIPipelineRun", "AIPipelineStep", "SessionArtifact",
    "InterviewEvaluation", "AuditLog"
]
