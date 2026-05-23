from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.audit_repo import AuditRepo
from app.schemas.audit import AuditLogCreate

class AuditService:
    @staticmethod
    async def log_action(db: AsyncSession, obj_in: AuditLogCreate):
        return await AuditRepo.create(db, obj_in)

    @staticmethod
    async def get_audit_logs(db: AsyncSession, user_id: int = None, limit: int = 100, offset: int = 0):
        return await AuditRepo.get_logs(db, user_id, limit, offset)
