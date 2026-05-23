"""add pipeline performance indexes

Revision ID: 0006
Revises: 89887a30fdc4
Create Date: 2026-05-18 01:55:00.000000

"""
from typing import Sequence, Union

from alembic import op


revision: str = "0006"
down_revision: Union[str, None] = "89887a30fdc4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index("ix_interview_sessions_application_id", "interview_sessions", ["application_id"])
    op.create_index("ix_interview_sessions_media_file_id", "interview_sessions", ["media_file_id"])
    op.create_index("ix_interview_sessions_pipeline_status", "interview_sessions", ["pipeline_status"])

    op.create_index("ix_ai_pipeline_runs_session_id", "ai_pipeline_runs", ["session_id"])
    op.create_index("ix_ai_pipeline_runs_status", "ai_pipeline_runs", ["status"])

    op.create_index("ix_session_artifacts_session_id", "session_artifacts", ["session_id"])
    op.create_index("ix_session_artifacts_pipeline_step_id", "session_artifacts", ["pipeline_step_id"])
    op.create_index("ix_session_artifacts_artifact_type", "session_artifacts", ["artifact_type"])
    op.create_index("idx_session_artifact_type", "session_artifacts", ["session_id", "artifact_type"])
    op.create_index("idx_pipeline_step_artifact_type", "session_artifacts", ["pipeline_step_id", "artifact_type"])


def downgrade() -> None:
    op.drop_index("idx_pipeline_step_artifact_type", table_name="session_artifacts")
    op.drop_index("idx_session_artifact_type", table_name="session_artifacts")
    op.drop_index("ix_session_artifacts_artifact_type", table_name="session_artifacts")
    op.drop_index("ix_session_artifacts_pipeline_step_id", table_name="session_artifacts")
    op.drop_index("ix_session_artifacts_session_id", table_name="session_artifacts")

    op.drop_index("ix_ai_pipeline_runs_status", table_name="ai_pipeline_runs")
    op.drop_index("ix_ai_pipeline_runs_session_id", table_name="ai_pipeline_runs")

    op.drop_index("ix_interview_sessions_pipeline_status", table_name="interview_sessions")
    op.drop_index("ix_interview_sessions_media_file_id", table_name="interview_sessions")
    op.drop_index("ix_interview_sessions_application_id", table_name="interview_sessions")
