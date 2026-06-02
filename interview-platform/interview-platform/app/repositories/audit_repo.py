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
    async def get_logs(db: AsyncSession, user_email: str = None, limit: int = 100, offset: int = 0, action: str = None, resource_type: str = None, search: str = None, start_date=None, end_date=None) -> dict:
        from sqlalchemy import or_, func, cast, String
        query = select(AuditLog, User.full_name, User.email).outerjoin(User, AuditLog.user_id == User.id)
        
        if user_email:
            query = query.filter(User.email.ilike(f"%{user_email}%"))
        if action and action != 'all':
            query = query.filter(cast(AuditLog.action, String) == action)
        if resource_type and resource_type != 'all':
            query = query.filter(AuditLog.resource_type == resource_type)
        if start_date:
            query = query.filter(AuditLog.created_at >= start_date)
        if end_date:
            query = query.filter(AuditLog.created_at <= end_date)
        if search:
            query = query.filter(
                or_(
                    cast(AuditLog.action, String).ilike(f"%{search}%"),
                    AuditLog.resource_type.ilike(f"%{search}%"),
                    User.full_name.ilike(f"%{search}%"),
                    User.email.ilike(f"%{search}%")
                )
            )

        count_query = select(func.count()).select_from(query.subquery())
        total = await db.execute(count_query)
        total_count = total.scalar() or 0

        query = query.order_by(AuditLog.created_at.desc()).limit(limit).offset(offset)
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
        return {"items": logs, "total_count": total_count}
