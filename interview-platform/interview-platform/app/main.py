import uuid
import os
import sys
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from loguru import logger

# Configure loguru
logger.remove()
logger.add(sys.stdout, format="{time} {level} {message}", level="INFO")

app = FastAPI(
    title="AI Interview Platform MVP",
    version="1.0.0",
    description="AI-powered interview evaluation platform with LangChain + Gemini + Groq"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:8000", "http://127.0.0.1:8000"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)

# ── Global Exception Handlers ──────────────────────────────────────────────
from app.core.exceptions import http_exception_handler, generic_exception_handler
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

# ── Request ID Middleware ──────────────────────────────────────────────────
@app.middleware("http")
async def add_request_id(request: Request, call_next):
    request_id = str(uuid.uuid4())[:8]
    logger.info(f"[{request_id}] {request.method} {request.url.path}")
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    logger.info(f"[{request_id}] → {response.status_code}")
    return response

# ── Chrome DevTools silent handler ──────────────────────────────────────────
@app.get("/.well-known/appspecific/com.chrome.devtools.json", include_in_schema=False)
async def chrome_devtools_silent():
    return {"status": "ok"}

# ── Routers ────────────────────────────────────────────────────────────────
from app.api.v1 import auth, jobs, candidates, applications, sessions, evaluations, pipeline, audit, health, dashboard
app.include_router(auth.router,         prefix="/api/v1")
app.include_router(jobs.router,         prefix="/api/v1")
app.include_router(candidates.router,   prefix="/api/v1")
app.include_router(applications.router, prefix="/api/v1")
app.include_router(sessions.router,     prefix="/api/v1")
app.include_router(evaluations.router,  prefix="/api/v1")
app.include_router(pipeline.router,     prefix="/api/v1")
app.include_router(audit.router,        prefix="/api/v1")
app.include_router(health.router,        prefix="/api/v1")
app.include_router(dashboard.router,     prefix="/api/v1")

# ── Serve Frontend Static Files ─────────────────────────────────────────────
# Resolve absolute path to the frontend directory adjacent to interview-platform
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND_DIR = os.path.join(os.path.dirname(BASE_DIR), "frontend-v2")
#FRONTEND_DIR = os.path.join(os.path.dirname(BASE_DIR), "frontend")
if os.path.exists(FRONTEND_DIR):
    logger.info(f"Serving frontend static files from: {FRONTEND_DIR}")
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
else:
    logger.warning(f"Frontend directory not found at: {FRONTEND_DIR}")
    @app.get("/")
    async def root():
        return {"message": "AI Interview Platform API — Frontend directory not found"}
