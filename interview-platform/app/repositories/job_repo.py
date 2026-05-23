from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.models.job import Job
from app.models.job_version import JobVersion
from app.models.evaluation_criteria import EvaluationCriteria
from app.schemas.job import JobCreate, JobUpdate, JobVersionCreate, JobVersionUpdate, EvaluationCriteriaCreate
from typing import List

class JobRepo:
    @staticmethod
    async def get_all_jobs(db: AsyncSession) -> List[Job]:
        result = await db.execute(select(Job))
        return list(result.scalars().all())

    @staticmethod
    async def get_job(db: AsyncSession, job_id: int) -> Job | None:
        result = await db.execute(select(Job).filter(Job.id == job_id))
        return result.scalars().first()

    @staticmethod
    async def create_job(db: AsyncSession, job_in: JobCreate, user_id: int) -> Job:
        db_job = Job(**job_in.model_dump(), user_id=user_id)
        db.add(db_job)
        await db.commit()
        await db.refresh(db_job)
        return db_job

    @staticmethod
    async def update_job(db: AsyncSession, db_job: Job, job_update: JobUpdate) -> Job:
        update_data = job_update.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_job, key, value)
        await db.commit()
        await db.refresh(db_job)
        return db_job

    @staticmethod
    async def delete_job(db: AsyncSession, db_job: Job):
        await db.delete(db_job)
        await db.commit()

class JobVersionRepo:
    @staticmethod
    async def create_version(db: AsyncSession, job_id: int, version_in: JobVersionCreate, version_number: int) -> JobVersion:
        db_version = JobVersion(
            **version_in.model_dump(exclude={"trigger_jd_agent"}),
            job_id=job_id,
            version_number=version_number
        )
        db.add(db_version)
        await db.commit()
        await db.refresh(db_version)
        return db_version

    @staticmethod
    async def get_versions(db: AsyncSession, job_id: int) -> List[JobVersion]:
        result = await db.execute(
            select(JobVersion)
            .options(selectinload(JobVersion.criteria))
            .filter(JobVersion.job_id == job_id)
            .execution_options(populate_existing=True)
        )
        return list(result.scalars().all())

    @staticmethod
    async def get_version(db: AsyncSession, job_id: int, version_id: int) -> JobVersion | None:
        result = await db.execute(
            select(JobVersion)
            .options(selectinload(JobVersion.criteria))
            .filter(JobVersion.id == version_id, JobVersion.job_id == job_id)
            .execution_options(populate_existing=True)
        )
        return result.scalars().first()

    @staticmethod
    async def update_version(db: AsyncSession, version: JobVersion, version_update: JobVersionUpdate) -> JobVersion:
        update_data = version_update.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(version, key, value)
        await db.commit()
        await db.refresh(version)
        return version

    @staticmethod
    async def delete_version(db: AsyncSession, version: JobVersion):
        await db.delete(version)
        await db.commit()

class CriteriaRepo:
    @staticmethod
    async def create_criteria(db: AsyncSession, version_id: int, criteria_in: EvaluationCriteriaCreate) -> EvaluationCriteria:
        db_criteria = EvaluationCriteria(**criteria_in.model_dump(), job_version_id=version_id)
        db.add(db_criteria)
        await db.commit()
        await db.refresh(db_criteria)
        return db_criteria

    @staticmethod
    async def create_multiple_criteria(db: AsyncSession, version_id: int, criteria_list: List[EvaluationCriteriaCreate]) -> None:
        for c_in in criteria_list:
            db_c = EvaluationCriteria(**c_in.model_dump(), job_version_id=version_id)
            db.add(db_c)
        await db.commit()

    @staticmethod
    async def delete_all_for_version(db: AsyncSession, version_id: int):
        result = await db.execute(select(EvaluationCriteria).filter(EvaluationCriteria.job_version_id == version_id))
        for c in result.scalars().all():
            await db.delete(c)
        await db.commit()

    @staticmethod
    async def replace_all_for_version(db: AsyncSession, version_id: int, criteria_list: List[EvaluationCriteriaCreate]) -> None:
        result = await db.execute(select(EvaluationCriteria).filter(EvaluationCriteria.job_version_id == version_id))
        for c in result.scalars().all():
            await db.delete(c)
        for c_in in criteria_list:
            db_c = EvaluationCriteria(**c_in.model_dump(), job_version_id=version_id)
            db.add(db_c)
        await db.commit()

    @staticmethod
    async def delete_criteria(db: AsyncSession, criteria_id: int):
        result = await db.execute(select(EvaluationCriteria).filter(EvaluationCriteria.id == criteria_id))
        c = result.scalars().first()
        if c:
            await db.delete(c)
            await db.commit()
