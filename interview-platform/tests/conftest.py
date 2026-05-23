import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import NullPool

from app.main import app
from app.database import Base, get_db
from app.core.security import hash_password, create_access_token
from app.models.user import User

# ── File-based SQLite for tests (more stable for async than in-memory) ──
TEST_DATABASE_URL = "sqlite+aiosqlite:///./test_db.sqlite"

test_engine = create_async_engine(TEST_DATABASE_URL, poolclass=NullPool, echo=False)
TestSessionLocal = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)

# ── Create / drop tables per test session ───────────────────────────────────
@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_db():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

# ── Provide a shared DB session per test ─────────────────────────────────────
_shared_session = None

@pytest_asyncio.fixture
async def db():
    global _shared_session
    async with test_engine.connect() as connection:
        await connection.begin()
        async_session = async_sessionmaker(
            connection, class_=AsyncSession, expire_on_commit=False
        )
        async with async_session() as session:
            _shared_session = session
            yield session
            _shared_session = None
        await connection.rollback()

async def override_get_db():
    if _shared_session:
        yield _shared_session
    else:
        async with TestSessionLocal() as session:
            yield session

app.dependency_overrides[get_db] = override_get_db

# ── Shared HTTP client ───────────────────────────────────────────────────────
@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

# ── Create a test user & return auth headers ─────────────────────────────────
@pytest_asyncio.fixture
async def auth_headers(db: AsyncSession):
    user = User(
        email="testuser@example.com",
        hashed_password=hash_password("TestPass123!"),
        full_name="Test User",
        is_active=True,
        role="admin"
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_access_token({"sub": str(user.id)})
    return {"Authorization": f"Bearer {token}"}

# ── Return just the test user object ────────────────────────────────────────
@pytest_asyncio.fixture
async def test_user(db: AsyncSession):
    user = User(
        email="user2@example.com",
        hashed_password=hash_password("TestPass123!"),
        full_name="User Two",
        is_active=True,
        role="hr"
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user

@pytest_asyncio.fixture
async def setup_session(client: AsyncClient, auth_headers: dict):
    job = await client.post("/api/v1/jobs", headers=auth_headers, json={
        "title": "Pipeline Test Job", "department": "Tech", "location": "Remote"
    })
    jid = job.json()["id"]
    ver = await client.post(f"/api/v1/jobs/{jid}/versions", headers=auth_headers, json={
        "raw_jd_text": "Python senior engineer", "criteria_mode": "manual"
    })
    vid = ver.json()["id"]
    cand = await client.post("/api/v1/candidates", headers=auth_headers, json={
        "full_name": "Pipeline User", "email": "pipeline@example.com"
    })
    cid = cand.json()["id"]
    app = await client.post("/api/v1/applications", headers=auth_headers, json={
        "candidate_id": cid, "job_version_id": vid
    })
    app_id = app.json()["id"]
    session = await client.post("/api/v1/sessions", headers=auth_headers, json={
        "application_id": app_id, "session_type": "technical"
    })
    return session.json()["id"]
