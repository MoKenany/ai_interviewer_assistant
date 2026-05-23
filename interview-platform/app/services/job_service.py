import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from app.schemas.job import JobCreate, JobUpdate, JobVersionCreate, JobVersionUpdate, EvaluationCriteriaCreate
from app.schemas.audit import AuditLogCreate
from app.models.audit_log import AuditActionEnum
from app.services.audit_service import AuditService
from app.repositories.job_repo import JobRepo, JobVersionRepo, CriteriaRepo
from app.core.ai.llama_client import LlamaClient, unwrap_ai_error
from typing import List


def _proposal_to_criteria_create(p) -> EvaluationCriteriaCreate:
    if hasattr(p, "model_dump"):
        data = p.model_dump()
    elif isinstance(p, dict):
        data = p
    else:
        data = {}
        for attr in dir(p):
            if not attr.startswith("_"):
                data[attr] = getattr(p, attr)
    return EvaluationCriteriaCreate(**data)


_criteria_generation_locks: dict[tuple[int, int], asyncio.Lock] = {}

class JobService:
    @staticmethod
    async def create_job(db: AsyncSession, user_id: int, job_in: JobCreate):
        job = await JobRepo.create_job(db, job_in, user_id)
        await AuditService.log_action(db, AuditLogCreate(
            user_id=user_id,
            action=AuditActionEnum.create,
            resource_type="job",
            resource_id=job.id,
            details={
                "title": job.title,
                "department": job.department,
                "status": str(job.status)
            }
        ))
        return job

    @staticmethod
    async def get_jobs(db: AsyncSession):
        return await JobRepo.get_all_jobs(db)

    @staticmethod
    async def get_job(db: AsyncSession, job_id: int):
        job = await JobRepo.get_job(db, job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        return job

    @staticmethod
    async def update_job(db: AsyncSession, job_id: int, job_update: JobUpdate, user_id: int):
        job = await JobService.get_job(db, job_id)
        updated_job = await JobRepo.update_job(db, job, job_update)
        await AuditService.log_action(db, AuditLogCreate(
            user_id=user_id,
            action=AuditActionEnum.update,
            resource_type="job",
            resource_id=updated_job.id,
            details={
                "changes": job_update.model_dump(exclude_unset=True)
            }
        ))
        return updated_job

    @staticmethod
    async def delete_job(db: AsyncSession, job_id: int, user_id: int):
        job = await JobService.get_job(db, job_id)
        
        # Check if any version of this job has associated job applications
        from app.repositories.job_repo import JobVersionRepo
        from app.repositories.application_repo import ApplicationRepo
        versions = await JobVersionRepo.get_versions(db, job_id)
        for version in versions:
            apps = await ApplicationRepo.get_all(db, job_version_id=version.id)
            if apps:
                raise HTTPException(
                    status_code=400,
                    detail="Cannot delete job because one or more of its versions are referenced by active job applications."
                )
                
        await AuditService.log_action(db, AuditLogCreate(
            user_id=user_id,
            action=AuditActionEnum.delete,
            resource_type="job",
            resource_id=job.id,
            details={
                "title": job.title,
                "department": job.department,
                "status": str(job.status)
            }
        ))
        await JobRepo.delete_job(db, job)

class JobVersionService:
    @staticmethod
    async def create_version(db: AsyncSession, job_id: int, version_in: JobVersionCreate):
        job = await JobService.get_job(db, job_id)
        versions = await JobVersionRepo.get_versions(db, job_id)
        version_number = len(versions) + 1
        
        # If trigger_jd_agent is False, force manual criteria mode to bypass AI JD agent
        if version_in.trigger_jd_agent is False:
            version_in.criteria_mode = "manual"
            
        version = await JobVersionRepo.create_version(db, job_id, version_in, version_number)
        
        ai_proposals = []
        if version_in.criteria_mode in ["ai", "hybrid"] and version_in.raw_jd_text:
            try:
                print(f"DEBUG: Triggering AI extraction for job {job_id}")
                ai_proposals = await LlamaClient.run_jd_agent(version_in.raw_jd_text)
                print(f"DEBUG: AI returned {len(ai_proposals)} proposals")
            except Exception as e:
                root_error = unwrap_ai_error(e)
                print(f"ERROR in AI extraction: {root_error}")
                raise HTTPException(status_code=502, detail=f"AI criteria extraction failed: {root_error}")

            criteria_to_create = [_proposal_to_criteria_create(p) for p in ai_proposals]
            await CriteriaRepo.create_multiple_criteria(db, version.id, criteria_to_create)
        
        return await JobVersionRepo.get_version(db, job_id, version.id)

    @staticmethod
    async def get_versions(db: AsyncSession, job_id: int):
        return await JobVersionRepo.get_versions(db, job_id)

    @staticmethod
    async def get_version(db: AsyncSession, job_id: int, version_id: int):
        version = await JobVersionRepo.get_version(db, job_id, version_id)
        if not version:
            raise HTTPException(status_code=404, detail="Job Version not found")
        return version

    @staticmethod
    async def update_version(db: AsyncSession, job_id: int, version_id: int, version_update: JobVersionUpdate):
        version = await JobVersionService.get_version(db, job_id, version_id)
        updated = await JobVersionRepo.update_version(db, version, version_update)
        return await JobVersionRepo.get_version(db, job_id, updated.id)

    @staticmethod
    async def delete_version(db: AsyncSession, job_id: int, version_id: int):
        version = await JobVersionService.get_version(db, job_id, version_id)
        
        # Check if there are associated job applications
        from app.repositories.application_repo import ApplicationRepo
        apps = await ApplicationRepo.get_all(db, job_version_id=version_id)
        if apps:
            raise HTTPException(
                status_code=400,
                detail="Cannot delete job version because it is referenced by active job applications."
            )
            
        await JobVersionRepo.delete_version(db, version)

class CriteriaService:
    @staticmethod
    async def add_criteria(db: AsyncSession, job_id: int, version_id: int, criteria_in: EvaluationCriteriaCreate):
        version = await JobVersionService.get_version(db, job_id, version_id)
        return await CriteriaRepo.create_criteria(db, version.id, criteria_in)

    @staticmethod
    async def replace_criteria(db: AsyncSession, job_id: int, version_id: int, criteria_list: List[EvaluationCriteriaCreate]):
        version = await JobVersionService.get_version(db, job_id, version_id)
        await CriteriaRepo.replace_all_for_version(db, version.id, criteria_list)
        return await JobVersionService.get_version(db, job_id, version_id)

    @staticmethod
    async def delete_criteria(db: AsyncSession, job_id: int, version_id: int, criteria_id: int):
        await CriteriaRepo.delete_criteria(db, criteria_id)

    @staticmethod
    async def generate_criteria_from_jd(db: AsyncSession, job_id: int, version_id: int):
        version = await JobVersionService.get_version(db, job_id, version_id)
        if not version.raw_jd_text or not version.raw_jd_text.strip():
            raise HTTPException(status_code=400, detail="Job description text is empty. Please add a JD first.")

        lock_key = (job_id, version_id)
        lock = _criteria_generation_locks.setdefault(lock_key, asyncio.Lock())
        if lock.locked():
            raise HTTPException(
                status_code=409,
                detail="Criteria generation is already running for this job version. Please wait for it to finish."
            )
        
        async with lock:
            try:
                print(f"DEBUG: Triggering AI criteria extraction for version {version_id}")
                ai_proposals = await LlamaClient.run_jd_agent(version.raw_jd_text)
                print(f"DEBUG: AI returned {len(ai_proposals)} proposals")
            except Exception as e:
                root_error = unwrap_ai_error(e)
                print(f"ERROR in AI criteria extraction: {root_error}")
                raise HTTPException(status_code=502, detail=f"AI criteria extraction failed: {root_error}")

            # Clear existing criteria and replace with AI-suggested ones
            await CriteriaRepo.delete_all_for_version(db, version.id)
            if ai_proposals:
                criteria_to_create = [_proposal_to_criteria_create(p) for p in ai_proposals]
                await CriteriaRepo.create_multiple_criteria(db, version.id, criteria_to_create)
            
            return await JobVersionService.get_version(db, job_id, version_id)
