"""add_auto_delete_media_to_sessions

Revision ID: 37117f6835a4
Revises: 0006
Create Date: 2026-05-22 02:56:28.214016

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '37117f6835a4'
down_revision: Union[str, None] = '0006'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add auto_delete_media with a server-side default so existing rows get FALSE
    op.add_column(
        'interview_sessions',
        sa.Column(
            'auto_delete_media',
            sa.Boolean(),
            nullable=False,
            server_default=sa.false()
        )
    )


def downgrade() -> None:
    op.drop_column('interview_sessions', 'auto_delete_media')
