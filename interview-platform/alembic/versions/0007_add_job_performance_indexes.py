"""add job performance indexes for query optimization

Revision ID: 0007
Revises: 37117f6835a4
Create Date: 2026-05-31 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


revision: str = "0007"
down_revision: Union[str, None] = "37117f6835a4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add indexes for job summary query optimization
    op.create_index("ix_job_versions_job_id", "job_versions", ["job_id"])
    op.create_index("ix_job_applications_job_version_id", "job_applications", ["job_version_id"])
    
    # Composite indexes for common queries
    op.create_index("idx_job_status_created", "jobs", ["status", "created_at"])
    
    # Indexes for candidate and application queries
    op.create_index("ix_job_applications_candidate_id", "job_applications", ["candidate_id"])
    op.create_index("idx_applications_version_status", "job_applications", ["job_version_id"])


def downgrade() -> None:
    op.drop_index("idx_applications_version_status", table_name="job_applications")
    op.drop_index("ix_job_applications_candidate_id", table_name="job_applications")
    op.drop_index("idx_job_version_job_status", table_name="job_versions")
    op.drop_index("idx_job_status_created", table_name="jobs")
    op.drop_index("ix_job_applications_job_version_id", table_name="job_applications")
    op.drop_index("ix_job_versions_job_id", table_name="job_versions")
