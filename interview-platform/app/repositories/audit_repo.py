from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.audit_log import AuditLog
from app.models.user import User
from app.schemas.audit import AuditLogCreate
from typing import List

class AuditRepo:
    @staticmethod
    async def create(db: AsyncSession, obj_in: AuditLogCreate) -> AuditLog:
        db_obj = AuditLog(**obj_in.model_dump())
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    @staticmethod
    async def get_logs(db: AsyncSession, user_id: int = None, limit: int = 100, offset: int = 0) -> List[dict]:
        query = select(AuditLog, User.full_name, User.email).outerjoin(User, AuditLog.user_id == User.id)
        query = query.order_by(AuditLog.created_at.desc()).limit(limit).offset(offset)
        if user_id:
            query = query.filter(AuditLog.user_id == user_id)
        result = await db.execute(query)

        logs = []
        for audit, full_name, email in result.all():
            logs.append({
                "id": audit.id,
                "user_id": audit.user_id,
                "user_full_name": full_name,
                "user_email": email,
                "action": audit.action,
                "resource_type": audit.resource_type,
                "resource_id": audit.resource_id,
                "ip_address": audit.ip_address,
                "user_agent": audit.user_agent,
                "details": audit.details,
                "created_at": audit.created_at,
            })
        return logs
