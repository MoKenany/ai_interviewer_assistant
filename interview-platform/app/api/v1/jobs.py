from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from typing import List, Dict, Any
from app.database import get_db
from app.schemas.job import JobCreate, JobUpdate, JobResponse, JobVersionCreate, JobVersionUpdate, JobVersionResponse, EvaluationCriteriaCreate, EvaluationCriteriaResponse
from app.services.job_service import JobService, JobVersionService, CriteriaService
from app.core.security import get_current_user
from app.models.user import User
from app.models.job import Job
from app.models.job_version import JobVersion
from app.models.job_application import JobApplication

router = APIRouter(prefix="/jobs", tags=["jobs"], dependencies=[Depends(get_current_user)])

@router.get("/summary", response_model=List[Dict[str, Any]])
async def get_jobs_summary(db: AsyncSession = Depends(get_db)):
    # 1. Fetch all jobs
    jobs = await JobService.get_jobs(db)
    
    # 2. Query versions counts per job
    versions_query = select(JobVersion.job_id, func.count(JobVersion.id)).group_by(JobVersion.job_id)
    versions_result = await db.execute(versions_query)
    versions_counts = {row[0]: row[1] for row in versions_result.all()}
    
    # 3. Query applications counts per job
    apps_query = select(Job.id, func.count(JobApplication.id))\
        .join(JobVersion, JobVersion.job_id == Job.id)\
        .join(JobApplication, JobApplication.job_version_id == JobVersion.id)\
        .group_by(Job.id)
    apps_result = await db.execute(apps_query)
    apps_counts = {row[0]: row[1] for row in apps_result.all()}

    summary = []
    for job in jobs:
        summary.append({
            "id": job.id,
            "title": job.title,
            "department": job.department,
            "location": job.location,
            "employment_type": job.employment_type,
            "status": job.status.value if hasattr(job.status, "value") else job.status,
            "created_at": job.created_at,
            "version_count": versions_counts.get(job.id, 0),
            "candidate_count": apps_counts.get(job.id, 0)
        })
    return summary

@router.post("", response_model=JobResponse, status_code=201)
async def create_job(job_in: JobCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    return await JobService.create_job(db, user.id, job_in)

@router.get("", response_model=List[JobResponse])
async def list_jobs(db: AsyncSession = Depends(get_db)):
    return await JobService.get_jobs(db)

@router.get("/{job_id}", response_model=JobResponse)
async def get_job(job_id: int, db: AsyncSession = Depends(get_db)):
    return await JobService.get_job(db, job_id)

@router.patch("/{job_id}", response_model=JobResponse)
async def update_job(job_id: int, job_in: JobUpdate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    return await JobService.update_job(db, job_id, job_in, user.id)

@router.delete("/{job_id}")
async def delete_job(job_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    await JobService.delete_job(db, job_id, user.id)
    return {"message": "Job deleted"}

@router.post("/{job_id}/versions", response_model=JobVersionResponse, status_code=201)
async def create_version(job_id: int, version_in: JobVersionCreate, db: AsyncSession = Depends(get_db)):
    return await JobVersionService.create_version(db, job_id, version_in)

@router.get("/{job_id}/versions", response_model=List[JobVersionResponse])
async def list_versions(job_id: int, db: AsyncSession = Depends(get_db)):
    return await JobVersionService.get_versions(db, job_id)

@router.get("/{job_id}/versions/{version_id}", response_model=JobVersionResponse)
async def get_version(job_id: int, version_id: int, db: AsyncSession = Depends(get_db)):
    return await JobVersionService.get_version(db, job_id, version_id)

@router.patch("/{job_id}/versions/{version_id}", response_model=JobVersionResponse)
async def update_version(job_id: int, version_id: int, version_in: JobVersionUpdate, db: AsyncSession = Depends(get_db)):
    return await JobVersionService.update_version(db, job_id, version_id, version_in)

@router.delete("/{job_id}/versions/{version_id}")
async def delete_version(job_id: int, version_id: int, db: AsyncSession = Depends(get_db)):
    await JobVersionService.delete_version(db, job_id, version_id)
    return {"message": "Job version deleted"}

@router.post("/{job_id}/versions/{version_id}/criteria", response_model=EvaluationCriteriaResponse, status_code=201)
async def add_criteria(job_id: int, version_id: int, criteria_in: EvaluationCriteriaCreate, db: AsyncSession = Depends(get_db)):
    return await CriteriaService.add_criteria(db, job_id, version_id, criteria_in)

@router.put("/{job_id}/versions/{version_id}/criteria", response_model=JobVersionResponse)
async def replace_criteria(job_id: int, version_id: int, criteria_list: List[EvaluationCriteriaCreate], db: AsyncSession = Depends(get_db)):
    return await CriteriaService.replace_criteria(db, job_id, version_id, criteria_list)

@router.delete("/{job_id}/versions/{version_id}/criteria/{criteria_id}")
async def delete_criteria(job_id: int, version_id: int, criteria_id: int, db: AsyncSession = Depends(get_db)):
    await CriteriaService.delete_criteria(db, job_id, version_id, criteria_id)
    return {"message": "Criteria deleted"}

@router.post("/{job_id}/versions/{version_id}/generate-criteria", response_model=JobVersionResponse)
async def generate_criteria(job_id: int, version_id: int, db: AsyncSession = Depends(get_db)):
    return await CriteriaService.generate_criteria_from_jd(db, job_id, version_id)
