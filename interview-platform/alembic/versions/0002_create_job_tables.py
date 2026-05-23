"""create job tables

Revision ID: 0002
Revises: 0001
Create Date: 2026-05-12 20:05:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '0002'
down_revision: Union[str, None] = '0001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.create_table('jobs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('department', sa.String(), nullable=True),
        sa.Column('location', sa.String(), nullable=True),
        sa.Column('employment_type', sa.String(), nullable=True),
        sa.Column('status', sa.Enum('open', 'closed', 'draft', name='jobstatusenum'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_jobs_id'), 'jobs', ['id'], unique=False)

    op.create_table('job_versions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('job_id', sa.Integer(), nullable=False),
        sa.Column('version_number', sa.Integer(), nullable=False),
        sa.Column('raw_jd_text', sa.Text(), nullable=True),
        sa.Column('structured_jd', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('criteria_mode', sa.Enum('manual', 'ai', 'hybrid', name='criteriamodeenum'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['job_id'], ['jobs.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_job_versions_id'), 'job_versions', ['id'], unique=False)

    op.create_table('evaluation_criteria',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('job_version_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('weight', sa.Float(), nullable=False),
        sa.Column('priority_level', sa.Enum('low', 'medium', 'high', name='prioritylevelenum'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['job_version_id'], ['job_versions.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_evaluation_criteria_id'), 'evaluation_criteria', ['id'], unique=False)

def downgrade() -> None:
    op.drop_index(op.f('ix_evaluation_criteria_id'), table_name='evaluation_criteria')
    op.drop_table('evaluation_criteria')
    op.drop_index(op.f('ix_job_versions_id'), table_name='job_versions')
    op.drop_table('job_versions')
    op.drop_index(op.f('ix_jobs_id'), table_name='jobs')
    op.drop_table('jobs')
    op.execute('DROP TYPE prioritylevelenum;')
    op.execute('DROP TYPE criteriamodeenum;')
    op.execute('DROP TYPE jobstatusenum;')
