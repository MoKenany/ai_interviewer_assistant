from fastapi import HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.requests import Request
from starlette.middleware.base import BaseHTTPMiddleware


# ── Custom Exception Classes ───────────────────────────────────────────────

class NotFoundError(HTTPException):
    def __init__(self, resource: str, resource_id: int = None):
        detail = f"{resource} not found"
        if resource_id:
            detail = f"{resource} with id={resource_id} not found"
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


class UnauthorizedError(HTTPException):
    def __init__(self, detail: str = "Authentication required"):
        super().__init__(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail)


class ForbiddenError(HTTPException):
    def __init__(self, detail: str = "Insufficient permissions"):
        super().__init__(status_code=status.HTTP_403_FORBIDDEN, detail=detail)


class ValidationError(HTTPException):
    def __init__(self, detail: str):
        super().__init__(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=detail)


class ConflictError(HTTPException):
    def __init__(self, detail: str):
        super().__init__(status_code=status.HTTP_409_CONFLICT, detail=detail)


class PipelineError(HTTPException):
    def __init__(self, detail: str = "AI pipeline execution failed"):
        super().__init__(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=detail)


class StorageError(HTTPException):
    def __init__(self, detail: str = "File storage operation failed"):
        super().__init__(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=detail)


# ── Global Exception Handlers ────────────────────────────────────────────

async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": True,
            "status_code": exc.status_code,
            "detail": exc.detail,
            "path": str(request.url)
        }
    )


async def generic_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "error": True,
            "status_code": 500,
            "detail": "An unexpected internal server error occurred.",
            "path": str(request.url)
        }
    )
