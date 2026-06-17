"""add all performance indexes

Revision ID: 0007
Revises: 0006
Create Date: 2026-05-31 10:00:00.000000

"""
from typing import Sequence, Union
from alembic import op


revision: str = "0007"
down_revision: Union[str, None] = "0006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Interview sessions indexes
    op.create_index("ix_interview_sessions_application_id", "interview_sessions", ["application_id"])
    op.create_index("ix_interview_sessions_media_file_id", "interview_sessions", ["media_file_id"])
    op.create_index("ix_interview_sessions_pipeline_status", "interview_sessions", ["pipeline_status"])

    # AI pipeline runs indexes
    op.create_index("ix_ai_pipeline_runs_session_id", "ai_pipeline_runs", ["session_id"])
    op.create_index("ix_ai_pipeline_runs_status", "ai_pipeline_runs", ["status"])

    # Session artifacts indexes
    op.create_index("ix_session_artifacts_session_id", "session_artifacts", ["session_id"])
    op.create_index("ix_session_artifacts_pipeline_step_id", "session_artifacts", ["pipeline_step_id"])
    op.create_index("ix_session_artifacts_artifact_type", "session_artifacts", ["artifact_type"])
    op.create_index("idx_session_artifact_type", "session_artifacts", ["session_id", "artifact_type"])
    op.create_index("idx_pipeline_step_artifact_type", "session_artifacts", ["pipeline_step_id", "artifact_type"])

    # Job tables indexes
    op.create_index("ix_job_versions_job_id", "job_versions", ["job_id"])
    op.create_index("ix_job_applications_job_version_id", "job_applications", ["job_version_id"])
    op.create_index("idx_job_status_created", "jobs", ["status", "created_at"])
    op.create_index("ix_job_applications_candidate_id", "job_applications", ["candidate_id"])
    op.create_index("idx_applications_version_status", "job_applications", ["job_version_id"])


def downgrade() -> None:
    # Drop job indexes
    op.drop_index("idx_applications_version_status", table_name="job_applications")
    op.drop_index("ix_job_applications_candidate_id", table_name="job_applications")
    op.drop_index("idx_job_status_created", table_name="jobs")
    op.drop_index("ix_job_applications_job_version_id", table_name="job_applications")
    op.drop_index("ix_job_versions_job_id", table_name="job_versions")

    # Drop session artifacts indexes
    op.drop_index("idx_pipeline_step_artifact_type", table_name="session_artifacts")
    op.drop_index("idx_session_artifact_type", table_name="session_artifacts")
    op.drop_index("ix_session_artifacts_artifact_type", table_name="session_artifacts")
    op.drop_index("ix_session_artifacts_pipeline_step_id", table_name="session_artifacts")
    op.drop_index("ix_session_artifacts_session_id", table_name="session_artifacts")

    # Drop pipeline runs indexes
    op.drop_index("ix_ai_pipeline_runs_status", table_name="ai_pipeline_runs")
    op.drop_index("ix_ai_pipeline_runs_session_id", table_name="ai_pipeline_runs")

    # Drop interview sessions indexes
    op.drop_index("ix_interview_sessions_pipeline_status", table_name="interview_sessions")
    op.drop_index("ix_interview_sessions_media_file_id", table_name="interview_sessions")
    op.drop_index("ix_interview_sessions_application_id", table_name="interview_sessions")
