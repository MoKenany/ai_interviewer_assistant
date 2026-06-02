from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.config import REDIS_URL
from app.database import get_db

router = APIRouter(prefix="/health", tags=["health"])

@router.get("")
async def health_check():
    """Simple liveness probe."""
    return {"status": "ok"}

@router.get("/db")
async def db_health(db: AsyncSession = Depends(get_db)):
    """Database readiness probe."""
    try:
        await db.execute(text("SELECT 1"))
        return {"status": "ok", "database": "connected"}
    except Exception as e:
        return {"status": "error", "database": str(e)}

@router.get("/ready")
async def readiness_probe(db: AsyncSession = Depends(get_db)):
    """Full readiness check — DB must be up."""
    results = {}

    try:
        await db.execute(text("SELECT 1"))
        results["database"] = "ok"
    except Exception as e:
        results["database"] = f"error: {e}"

    all_ok = all(v == "ok" for v in results.values())
    return {"status": "ready" if all_ok else "degraded", **results}

@router.get("/redis")
async def redis_health():
    """Redis/Celery broker probe. Returns 200 even when Redis is unavailable."""
    try:
        from redis.asyncio import Redis

        redis = Redis.from_url(REDIS_URL)
        await redis.ping()
        await redis.aclose()
        return {"status": "ok", "redis": "connected"}
    except Exception as e:
        return {"status": "degraded", "redis": str(e)}
