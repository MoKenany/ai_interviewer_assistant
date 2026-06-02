"""create sessions pipeline evaluations

Revision ID: 0004
Revises: 0003
Create Date: 2026-05-12 20:20:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '0004'
down_revision: Union[str, None] = '0003'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.create_table('interview_sessions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('application_id', sa.Integer(), nullable=False),
        sa.Column('session_type', sa.Enum('screening', 'technical', 'cultural_fit', 'final', name='sessiontypeenum'), nullable=False),
        sa.Column('media_file_id', sa.Integer(), nullable=True),
        sa.Column('pipeline_status', sa.Enum('pending', 'running', 'completed', 'failed', name='pipelinestatusenum'), nullable=True),
        sa.Column('full_transcript', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['application_id'], ['job_applications.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_interview_sessions_id'), 'interview_sessions', ['id'], unique=False)

    op.create_table('media_files',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('session_id', sa.Integer(), nullable=True),
        sa.Column('file_path', sa.String(), nullable=False),
        sa.Column('file_type', sa.String(), nullable=False),
        sa.Column('duration_seconds', sa.Integer(), nullable=True),
        sa.Column('upload_status', sa.Enum('pending', 'uploaded', 'failed', name='uploadstatusenum'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['session_id'], ['interview_sessions.id'], name='fk_media_session', use_alter=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_media_files_id'), 'media_files', ['id'], unique=False)
    
    op.create_foreign_key('fk_session_media', 'interview_sessions', 'media_files', ['media_file_id'], ['id'], use_alter=True)

    op.create_table('ai_pipeline_runs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('session_id', sa.Integer(), nullable=False),
        sa.Column('status', sa.Enum('pending', 'running', 'completed', 'failed', name='pipelinerunstatusenum'), nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('error_message', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['session_id'], ['interview_sessions.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_ai_pipeline_runs_id'), 'ai_pipeline_runs', ['id'], unique=False)

    op.create_table('ai_pipeline_steps',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('run_id', sa.Integer(), nullable=False),
        sa.Column('step_name', sa.Enum('audio_extract', 'stt', 'qa_extraction', 'scoring', 'insight_generation', name='stepnameenum'), nullable=False),
        sa.Column('status', sa.Enum('pending', 'running', 'success', 'failed', name='stepstatusenum'), nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('error_message', sa.String(), nullable=True),
        sa.Column('tokens_used', sa.Integer(), nullable=True),
        sa.Column('latency_ms', sa.Integer(), nullable=True),
        sa.Column('prompt_version', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['run_id'], ['ai_pipeline_runs.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_ai_pipeline_steps_id'), 'ai_pipeline_steps', ['id'], unique=False)

    op.create_table('session_artifacts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('session_id', sa.Integer(), nullable=False),
        sa.Column('pipeline_step_id', sa.Integer(), nullable=True),
        sa.Column('artifact_type', sa.Enum('transcript', 'qa_pairs', 'evidence_quotes', 'competency_map', name='artifacttypeenum'), nullable=False),
        sa.Column('content', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['pipeline_step_id'], ['ai_pipeline_steps.id'], ),
        sa.ForeignKeyConstraint(['session_id'], ['interview_sessions.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_session_artifacts_id'), 'session_artifacts', ['id'], unique=False)

    op.create_table('interview_evaluations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('session_id', sa.Integer(), nullable=False),
        sa.Column('application_id', sa.Integer(), nullable=False),
        sa.Column('overall_score', sa.Float(), nullable=False),
        sa.Column('competency_breakdown', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('executive_summary', sa.Text(), nullable=True),
        sa.Column('hiring_recommendation', sa.Enum('strong_hire', 'hire', 'no_hire', 'strong_no_hire', name='hiringrecommendationenum'), nullable=False),
        sa.Column('confidence_score', sa.Float(), nullable=True),
        sa.Column('strengths', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('weaknesses', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('interviewer_notes', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('suggested_questions', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['application_id'], ['job_applications.id'], ),
        sa.ForeignKeyConstraint(['session_id'], ['interview_sessions.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('session_id')
    )
    op.create_index(op.f('ix_interview_evaluations_id'), 'interview_evaluations', ['id'], unique=False)

def downgrade() -> None:
    op.drop_index(op.f('ix_interview_evaluations_id'), table_name='interview_evaluations')
    op.drop_table('interview_evaluations')
    op.drop_index(op.f('ix_session_artifacts_id'), table_name='session_artifacts')
    op.drop_table('session_artifacts')
    op.drop_index(op.f('ix_ai_pipeline_steps_id'), table_name='ai_pipeline_steps')
    op.drop_table('ai_pipeline_steps')
    op.drop_index(op.f('ix_ai_pipeline_runs_id'), table_name='ai_pipeline_runs')
    op.drop_table('ai_pipeline_runs')
    op.drop_constraint('fk_session_media', 'interview_sessions', type_='foreignkey')
    op.drop_index(op.f('ix_media_files_id'), table_name='media_files')
    op.drop_table('media_files')
    op.drop_index(op.f('ix_interview_sessions_id'), table_name='interview_sessions')
    op.drop_table('interview_sessions')
    op.execute('DROP TYPE hiringrecommendationenum;')
    op.execute('DROP TYPE artifacttypeenum;')
    op.execute('DROP TYPE stepstatusenum;')
    op.execute('DROP TYPE stepnameenum;')
    op.execute('DROP TYPE pipelinerunstatusenum;')
    op.execute('DROP TYPE uploadstatusenum;')
    op.execute('DROP TYPE pipelinestatusenum;')
    op.execute('DROP TYPE sessiontypeenum;')
