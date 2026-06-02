import os
from dotenv import load_dotenv

# All paths are resolved relative to the project root (where .env lives)
_PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv(os.path.join(_PROJECT_ROOT, ".env"))

# ── Database ───────────────────────────────────────────────────────
DATABASE_URL: str = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://postgres:admin123@localhost:5432/ai_interview_db"
)

# ── Redis / Celery ─────────────────────────────────────────────────
REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
CELERY_BROKER_URL: str = os.getenv("CELERY_BROKER_URL", REDIS_URL)
CELERY_RESULT_BACKEND: str = os.getenv("CELERY_RESULT_BACKEND", REDIS_URL)

# ── Security ───────────────────────────────────────────────────────
SECRET_KEY: str = os.getenv("SECRET_KEY", "change_me_in_production")
JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRY_MINUTES: int = int(os.getenv("JWT_EXPIRY_MINUTES", "1440"))

# ── CORS Origins ───────────────────────────────────────────────────
ALLOWED_ORIGINS: list = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000,http://localhost:8000,http://127.0.0.1:8000"
).split(",")

# ── AI Keys ────────────────────────────────────────────────────────
GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
if GROQ_API_KEY:
    GROQ_API_KEY = GROQ_API_KEY.strip('"' + "'")

# ── Token Budget & AI Settings ─────────────────────────────────────
MAX_TOKENS_PER_SESSION: int = int(os.getenv("MAX_TOKENS_PER_SESSION", "50000"))
AI_REQUEST_TIMEOUT: int = int(os.getenv("AI_REQUEST_TIMEOUT", "300"))  # 5 minutes
MAX_UPLOAD_BYTES: int = int(os.getenv("MAX_UPLOAD_BYTES", str(500 * 1024 * 1024)))  # 500 MB

# ── Celery Configuration ───────────────────────────────────────────
CELERY_TASK_TIME_LIMIT: int = int(os.getenv("CELERY_TASK_TIME_LIMIT", "1800"))  # 30 min
CELERY_TASK_SOFT_TIME_LIMIT: int = int(os.getenv("CELERY_TASK_SOFT_TIME_LIMIT", "1740"))  # 29 min

# ── Local Storage ──────────────────────────────────────────────────
STORAGE_ROOT: str = os.path.join(
    _PROJECT_ROOT,
    os.getenv("STORAGE_ROOT", "storage")
)

RESUME_UPLOAD_DIR: str  = os.path.join(STORAGE_ROOT, "uploads", "resumes")
VIDEO_UPLOAD_DIR: str   = os.path.join(STORAGE_ROOT, "uploads", "videos")
AUDIO_UPLOAD_DIR: str   = os.path.join(STORAGE_ROOT, "uploads", "audio")
PROCESSED_DIR: str      = os.path.join(STORAGE_ROOT, "processed")

# Create dirs on import so they always exist
for _d in [RESUME_UPLOAD_DIR, VIDEO_UPLOAD_DIR, AUDIO_UPLOAD_DIR, PROCESSED_DIR]:
    os.makedirs(_d, exist_ok=True)
