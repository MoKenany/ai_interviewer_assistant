from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.job_application import JobApplication
from app.schemas.application import ApplicationCreate, ApplicationUpdateStatus, ApplicationUpdate
from typing import List, Optional

class ApplicationRepo:
    @staticmethod
    async def get_all(db: AsyncSession, candidate_id: Optional[int] = None, job_version_id: Optional[int] = None) -> List[JobApplication]:
        query = select(JobApplication)
        if candidate_id:
            query = query.filter(JobApplication.candidate_id == candidate_id)
        if job_version_id:
            query = query.filter(JobApplication.job_version_id == job_version_id)
        result = await db.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def get(db: AsyncSession, app_id: int) -> JobApplication | None:
        result = await db.execute(select(JobApplication).filter(JobApplication.id == app_id))
        return result.scalars().first()

    @staticmethod
    async def create(db: AsyncSession, obj_in: ApplicationCreate) -> JobApplication:
        db_obj = JobApplication(**obj_in.model_dump())
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    @staticmethod
    async def update_status(db: AsyncSession, db_obj: JobApplication, obj_in: ApplicationUpdateStatus) -> JobApplication:
        db_obj.status = obj_in.status
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    @staticmethod
    async def update(db: AsyncSession, db_obj: JobApplication, obj_in: ApplicationUpdate) -> JobApplication:
        update_data = obj_in.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_obj, key, value)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    @staticmethod
    async def delete(db: AsyncSession, db_obj: JobApplication):
        await db.delete(db_obj)
        await db.commit()
