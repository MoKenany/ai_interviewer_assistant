from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy import JSON, event
from sqlalchemy.dialects.postgresql import JSONB
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://postgres:admin123@localhost:5432/ai_interview_db"
)

# Create engine with optimized connection pooling settings
engine = create_async_engine(
    DATABASE_URL, 
    echo=False,
    pool_size=20,  # Number of connections to keep in the pool
    max_overflow=10,  # Maximum overflow connections beyond pool_size
    pool_pre_ping=True,  # Test connections before using them
    pool_recycle=3600,  # Recycle connections every hour
    connect_args={"timeout": 30}  # Connection timeout
)

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
