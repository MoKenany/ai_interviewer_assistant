from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, UploadFile
import os
from app.schemas.candidate import CandidateCreate, CandidateUpdate
from app.repositories.candidate_repo import CandidateRepo
from app.schemas.application import ApplicationCreate, ApplicationUpdateStatus, ApplicationUpdate
from app.repositories.application_repo import ApplicationRepo
from app.core import storage
from typing import List, Optional

class CandidateService:
    @staticmethod
    async def create_candidate(db: AsyncSession, user_id: int, obj_in: CandidateCreate):
        return await CandidateRepo.create(db, obj_in, user_id)

    @staticmethod
    async def get_candidates(db: AsyncSession):
        return await CandidateRepo.get_all(db)

    @staticmethod
    async def get_candidate(db: AsyncSession, candidate_id: int):
        candidate = await CandidateRepo.get(db, candidate_id)
        if not candidate:
            raise HTTPException(status_code=404, detail="Candidate not found")
        return candidate

    @staticmethod
    async def update_candidate(db: AsyncSession, candidate_id: int, obj_in: CandidateUpdate):
        candidate = await CandidateService.get_candidate(db, candidate_id)
        return await CandidateRepo.update(db, candidate, obj_in)

    @staticmethod
    async def delete_candidate(db: AsyncSession, candidate_id: int):
        candidate = await CandidateService.get_candidate(db, candidate_id)
        if candidate.resume_file_path and os.path.exists(candidate.resume_file_path):
            try:
                os.remove(candidate.resume_file_path)
            except Exception:
                pass
        await CandidateRepo.delete(db, candidate)

    @staticmethod
    async def upload_resume(db: AsyncSession, candidate_id: int, file: UploadFile):
        candidate = await CandidateService.get_candidate(db, candidate_id)
        file_path = await storage.save_resume(candidate_id, file)
        return await CandidateRepo.update_resume_path(db, candidate, file_path)

    @staticmethod
    async def delete_resume(db: AsyncSession, candidate_id: int):
        candidate = await CandidateService.get_candidate(db, candidate_id)
        if candidate.resume_file_path and os.path.exists(candidate.resume_file_path):
            try:
                os.remove(candidate.resume_file_path)
            except Exception:
                pass
        return await CandidateRepo.update_resume_path(db, candidate, None)

class ApplicationService:
    @staticmethod
    async def create_application(db: AsyncSession, obj_in: ApplicationCreate):
        return await ApplicationRepo.create(db, obj_in)

    @staticmethod
    async def get_applications(db: AsyncSession, candidate_id: Optional[int] = None, job_version_id: Optional[int] = None):
        return await ApplicationRepo.get_all(db, candidate_id, job_version_id)

    @staticmethod
    async def get_application(db: AsyncSession, app_id: int):
        app = await ApplicationRepo.get(db, app_id)
        if not app:
            raise HTTPException(status_code=404, detail="Application not found")
        return app

    @staticmethod
    async def update_status(db: AsyncSession, app_id: int, obj_in: ApplicationUpdateStatus):
        app = await ApplicationService.get_application(db, app_id)
        return await ApplicationRepo.update_status(db, app, obj_in)

    @staticmethod
    async def update_application(db: AsyncSession, app_id: int, obj_in: ApplicationUpdate):
        app = await ApplicationService.get_application(db, app_id)
        return await ApplicationRepo.update(db, app, obj_in)

    @staticmethod
    async def delete_application(db: AsyncSession, app_id: int):
        app = await ApplicationService.get_application(db, app_id)
        await ApplicationRepo.delete(db, app)
