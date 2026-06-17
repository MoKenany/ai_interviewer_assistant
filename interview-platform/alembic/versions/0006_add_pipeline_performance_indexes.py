"""add schema enhancements and cleanup

Revision ID: 0006
Revises: 0005
Create Date: 2026-05-13 02:16:11.171174

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "0006"
down_revision: Union[str, None] = "0005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add is_mandatory to evaluation_criteria
    op.add_column('evaluation_criteria', sa.Column('is_mandatory', sa.Boolean(), nullable=False, server_default='false'))
    
    # Create sessionaimodeenum type and add ai_mode column
    op.execute("CREATE TYPE sessionaimodeenum AS ENUM ('very_strict', 'strict', 'normal', 'lenient')")
    op.add_column('interview_sessions', 
                  sa.Column('ai_mode', 
                           sa.Enum('very_strict', 'strict', 'normal', 'lenient', name='sessionaimodeenum'), 
                           nullable=False, 
                           server_default='normal'))
    
    # Add auto_delete_media to interview_sessions
    op.add_column('interview_sessions',
                  sa.Column('auto_delete_media',
                           sa.Boolean(),
                           nullable=False,
                           server_default='false'))
    
    # Add enable_transcript_validation to interview_sessions
    op.add_column('interview_sessions',
                  sa.Column('enable_transcript_validation',
                           sa.Boolean(),
                           nullable=False,
                           server_default='false',
                           comment='Optional: validate transcript compatibility with JD'))
    
    # Note: enable_transcript_validation, auto_delete_media, and ai_mode are being added
    # Note: media_files.session_id is being removed (use interview_sessions.media_file_id instead)
    # FK fk_media_session should already exist, but only drop if it exists
    # In this clean schema, we don't have these legacy columns to remove
    pass


def downgrade() -> None:
    # Restore enable_transcript_validation
    op.drop_column('interview_sessions', 'enable_transcript_validation')
    
    # Restore auto_delete_media
    op.drop_column('interview_sessions', 'auto_delete_media')
    
    # Restore ai_mode
    op.drop_column('interview_sessions', 'ai_mode')
    op.execute('DROP TYPE sessionaimodeenum')
    
    # Restore is_mandatory
    op.drop_column('evaluation_criteria', 'is_mandatory')
