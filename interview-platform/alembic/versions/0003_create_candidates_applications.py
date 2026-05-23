"""create candidates and applications tables

Revision ID: 0003
Revises: 0002
Create Date: 2026-05-12 20:10:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '0003'
down_revision: Union[str, None] = '0002'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.create_table('candidates',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('full_name', sa.String(), nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('phone', sa.String(), nullable=True),
        sa.Column('linkedin_url', sa.String(), nullable=True),
        sa.Column('github_url', sa.String(), nullable=True),
        sa.Column('resume_file_path', sa.String(), nullable=True),
        sa.Column('source', sa.String(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_candidates_email'), 'candidates', ['email'], unique=True)
    op.create_index(op.f('ix_candidates_id'), 'candidates', ['id'], unique=False)

    op.create_table('job_applications',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('candidate_id', sa.Integer(), nullable=False),
        sa.Column('job_version_id', sa.Integer(), nullable=False),
        sa.Column('status', sa.Enum('applied', 'screening', 'interview', 'offer', 'hired', 'rejected', name='applicationstatusenum'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['candidate_id'], ['candidates.id'], ),
        sa.ForeignKeyConstraint(['job_version_id'], ['job_versions.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_job_applications_id'), 'job_applications', ['id'], unique=False)

def downgrade() -> None:
    op.drop_index(op.f('ix_job_applications_id'), table_name='job_applications')
    op.drop_table('job_applications')
    op.drop_index(op.f('ix_candidates_id'), table_name='candidates')
    op.drop_index(op.f('ix_candidates_email'), table_name='candidates')
    op.drop_table('candidates')
    op.execute('DROP TYPE applicationstatusenum;')
