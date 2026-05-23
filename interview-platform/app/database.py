from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy import JSON
from sqlalchemy.dialects.postgresql import JSONB
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://postgres:admin123@localhost:5432/ai_interview_db"
)

engine = create_async_engine(DATABASE_URL, echo=False)

AsyncSessionLocal = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

# Alias used by Celery tasks
async_sessionmaker = AsyncSessionLocal

Base = declarative_base()

# Use JSONB for Postgres, JSON for others (like SQLite in tests)
JSON_TYPE = JSON().with_variant(JSONB, "postgresql")

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
