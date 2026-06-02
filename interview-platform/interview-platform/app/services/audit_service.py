from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.audit_repo import AuditRepo
from app.schemas.audit import AuditLogCreate

class AuditService:
    @staticmethod
    async def log_action(db: AsyncSession, obj_in: AuditLogCreate):
        return await AuditRepo.create(db, obj_in)

    @staticmethod
    async def get_audit_logs(db: AsyncSession, user_email: str = None, limit: int = 500, skip: int = 0, action: str = None, resource_type: str = None, search: str = None, start_date=None, end_date=None) -> dict:
        return await AuditRepo.get_logs(db, user_email=user_email, limit=limit, offset=skip, action=action, resource_type=resource_type, search=search, start_date=start_date, end_date=end_date)
