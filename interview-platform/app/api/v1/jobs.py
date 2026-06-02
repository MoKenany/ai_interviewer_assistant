from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, outerjoin
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
    # Optimized single query with aggregations to avoid N+1 problem
    query = select(
        Job.id,
        Job.title,
        Job.department,
        Job.location,
        Job.employment_type,
        Job.status,
        Job.created_at,
        func.count(func.distinct(JobVersion.id)).label("version_count"),
        func.count(func.distinct(JobApplication.id)).label("candidate_count")
    ).outerjoin(
        JobVersion, JobVersion.job_id == Job.id
    ).outerjoin(
        JobApplication, JobApplication.job_version_id == JobVersion.id
    ).group_by(Job.id, Job.title, Job.department, Job.location, Job.employment_type, Job.status, Job.created_at)

    result = await db.execute(query)
    jobs_data = result.all()

    summary = []
    for row in jobs_data:
        summary.append({
            "id": row.id,
            "title": row.title,
            "department": row.department,
            "location": row.location,
            "employment_type": row.employment_type,
            "status": row.status.value if hasattr(row.status, "value") else row.status,
            "created_at": row.created_at,
            "version_count": row.version_count or 0,
            "candidate_count": row.candidate_count or 0
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

@router.get("/{job_id}/delete-preview")
async def delete_preview(job_id: int, db: AsyncSession = Depends(get_db)):
    """Returns affected candidates and versions before deletion."""
    return await JobService.get_delete_preview(db, job_id)

@router.delete("/{job_id}")
async def delete_job(job_id: int, force: bool = Query(False), db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    await JobService.delete_job(db, job_id, user.id, force=force)
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
