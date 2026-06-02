from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, delete
import asyncio
from typing import List, Dict, Any
from app.database import get_db
from app.schemas.candidate import CandidateCreate, CandidateUpdate, CandidateResponse
from app.services.candidate_service import CandidateService
from app.core.security import get_current_user
from app.models.user import User
from app.models.job import Job
from app.models.job_version import JobVersion
from app.models.job_application import JobApplication
from app.models.candidate import Candidate
from app.models.interview_session import InterviewSession
from app.models.interview_evaluation import InterviewEvaluation
from app.services.audit_service import AuditService
from app.schemas.audit import AuditLogCreate
from app.models.audit_log import AuditActionEnum

router = APIRouter(prefix="/candidates", tags=["candidates"], dependencies=[Depends(get_current_user)])

@router.get("/{candidate_id}/transcripts", response_model=List[Dict[str, Any]])
async def get_candidate_transcripts(candidate_id: int, db: AsyncSession = Depends(get_db)):
    # Verify candidate exists
    candidate = await db.get(Candidate, candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
        
    query = select(
        InterviewSession.id.label("session_id"),
        InterviewSession.session_type,
        InterviewSession.pipeline_status,
        InterviewSession.full_transcript,
        InterviewSession.created_at,
        Job.title.label("job_title"),
        JobVersion.version_number,
        InterviewEvaluation.overall_score,
        InterviewEvaluation.confidence_score,
        InterviewEvaluation.hiring_recommendation,
        InterviewEvaluation.executive_summary,
        InterviewEvaluation.strengths,
        InterviewEvaluation.weaknesses
    ).join(JobApplication, InterviewSession.application_id == JobApplication.id)\
     .join(JobVersion, JobApplication.job_version_id == JobVersion.id)\
     .join(Job, JobVersion.job_id == Job.id)\
     .outerjoin(InterviewEvaluation, InterviewEvaluation.session_id == InterviewSession.id)\
     .where(JobApplication.candidate_id == candidate_id)\
     .order_by(InterviewSession.created_at.desc())
     
    result = await db.execute(query)
    rows = result.all()
    
    return [
        {
            "session_id": r.session_id,
            "session_type": r.session_type.value if hasattr(r.session_type, "value") else str(r.session_type),
            "pipeline_status": r.pipeline_status.value if hasattr(r.pipeline_status, "value") else str(r.pipeline_status),
            "full_transcript": r.full_transcript,
            "created_at": r.created_at,
            "job_title": r.job_title,
            "version_number": r.version_number,
            "overall_score": r.overall_score,
            "confidence_score": r.confidence_score,
            "hiring_recommendation": r.hiring_recommendation,
            "executive_summary": r.executive_summary,
            "strengths": r.strengths,
            "weaknesses": r.weaknesses
        }
        for r in rows
    ]

@router.get("/organized", response_model=Dict[str, Any])
async def get_organized_candidates(db: AsyncSession = Depends(get_db)):
    # 1. Fetch all jobs
    jobs_query = select(Job.id, Job.title, Job.department)
    jobs_result = await db.execute(jobs_query)
    jobs_data = jobs_result.all()

    # 2. Fetch all job versions
    versions_query = select(JobVersion.id, JobVersion.job_id, JobVersion.version_number)
    versions_result = await db.execute(versions_query)
    versions_data = versions_result.all()

    # 3. Fetch all applications joined with Candidate and optionally InterviewEvaluation
    apps_query = select(
        JobApplication.id.label("app_id"),
        JobApplication.status.label("app_status"),
        JobApplication.job_version_id,
        Candidate.id.label("candidate_id"),
        Candidate.full_name,
        Candidate.email,
        Candidate.phone,
        Candidate.source,
        Candidate.is_active,
        Candidate.resume_file_path,
        InterviewSession.session_type,
        InterviewEvaluation.overall_score,
        InterviewEvaluation.confidence_score,
        InterviewEvaluation.hiring_recommendation
    ).join(Candidate, JobApplication.candidate_id == Candidate.id)\
     .outerjoin(InterviewSession, InterviewSession.application_id == JobApplication.id)\
     .outerjoin(InterviewEvaluation, InterviewEvaluation.session_id == InterviewSession.id)

    apps_result = await db.execute(apps_query)
    apps_data = apps_result.all()

    SESSION_PRIORITY = {
        "final": 4,
        "cultural_fit": 3,
        "technical": 2,
        "screening": 1
    }

    # Process applications in Python to de-duplicate and select the best evaluation per candidate application
    app_map = {}
    for row in apps_data:
        app_id = row.app_id
        session_type = row.session_type.value if hasattr(row.session_type, "value") else str(row.session_type) if row.session_type else "unknown"
        current_priority = SESSION_PRIORITY.get(session_type, 0)
        score = row.overall_score or 0.0
        has_eval = row.overall_score is not None
        
        row_dict = row._asdict()
        row_dict["session_type_str"] = session_type
        
        if app_id in app_map:
            existing_type = app_map[app_id].get("session_type_str", "unknown")
            existing_priority = SESSION_PRIORITY.get(existing_type, 0)
            existing_has_eval = app_map[app_id].get("overall_score") is not None
            
            # Priority logic: 
            # 1. Always prefer session WITH evaluation over one WITHOUT
            # 2. If both have evaluation (or both don't), pick by session priority
            # 3. If same priority, pick the one with higher score
            should_replace = False
            
            if has_eval and not existing_has_eval:
                # New has eval, existing doesn't -> replace
                should_replace = True
            elif has_eval and existing_has_eval:
                # Both have eval -> compare by priority then score
                if current_priority > existing_priority:
                    should_replace = True
                elif current_priority == existing_priority and score > (app_map[app_id]["overall_score"] or 0.0):
                    should_replace = True
            elif not has_eval and not existing_has_eval:
                # Neither has eval -> compare by priority then score
                if current_priority > existing_priority:
                    should_replace = True
                elif current_priority == existing_priority and score > (app_map[app_id]["overall_score"] or 0.0):
                    should_replace = True
            
            if should_replace:
                app_map[app_id] = row_dict
        else:
            app_map[app_id] = row_dict

    # Group applications by job_version_id
    version_apps = {}
    applied_candidate_ids = set()
    for app in app_map.values():
        v_id = app["job_version_id"]
        applied_candidate_ids.add(app["candidate_id"])
        if v_id not in version_apps:
            version_apps[v_id] = []
        version_apps[v_id].append(app)

    # 4. Build the job-version-candidate tree
    organized_jobs = []
    for job in jobs_data:
        job_versions = []
        # Find versions for this job
        job_v_rows = [v for v in versions_data if v.job_id == job.id]
        
        for v in job_v_rows:
            candidates_list = version_apps.get(v.id, [])
            # Sort candidates by overall_score descending (None/Null scores go to the bottom)
            candidates_sorted = sorted(
                candidates_list,
                key=lambda x: (x["overall_score"] is not None, x["overall_score"] or 0.0),
                reverse=True
            )
            
            job_versions.append({
                "version_id": v.id,
                "version_number": v.version_number,
                "candidate_count": len(candidates_sorted),
                "candidates": candidates_sorted
            })
            
        organized_jobs.append({
            "job_id": job.id,
            "job_title": job.title,
            "department": job.department or "General",
            "versions": job_versions
        })

    # 5. Fetch Unassigned Candidates (candidates who haven't applied to any job version)
    unassigned_query = select(Candidate).where(~Candidate.id.in_(list(applied_candidate_ids) if applied_candidate_ids else [-1]))
    unassigned_result = await db.execute(unassigned_query)
    unassigned_candidates = unassigned_result.scalars().all()

    unassigned_list = []
    for c in unassigned_candidates:
        unassigned_list.append({
            "candidate_id": c.id,
            "full_name": c.full_name,
            "email": c.email,
            "phone": c.phone,
            "source": c.source,
            "is_active": c.is_active,
            "resume_file_path": c.resume_file_path,
            "overall_score": None,
            "confidence_score": None,
            "hiring_recommendation": None,
            "app_status": None,
            "app_id": None
        })

    return {
        "jobs": organized_jobs,
        "unassigned": unassigned_list
    }

@router.delete("/unassigned")
async def delete_unassigned_candidates(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    subquery = select(JobApplication.candidate_id).distinct()
    unassigned_query = select(Candidate.id).where(~Candidate.id.in_(subquery))
    unassigned_result = await db.execute(unassigned_query)
    candidate_ids = [row[0] for row in unassigned_result.all()]

    if candidate_ids:
        await db.execute(delete(Candidate).where(Candidate.id.in_(candidate_ids)))
        await db.commit()
        
        await AuditService.log_action(db, AuditLogCreate(
            user_id=user.id,
            action=AuditActionEnum.delete,
            resource_type="candidates",
            resource_id=None,
            details={"bulk_delete": True, "count": len(candidate_ids), "type": "unassigned", "candidate_ids": candidate_ids}
        ))

    return {"deleted": len(candidate_ids)}

@router.delete("/assigned")
async def delete_assigned_candidates(
    confirm_password: str = Query(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    if confirm_password != "delall000111":
        raise HTTPException(status_code=400, detail="Bulk delete of assigned candidates is not permitted without valid password.")
        
    assigned_subquery = select(JobApplication.candidate_id).distinct()
    assigned_query = select(Candidate.id).where(Candidate.id.in_(assigned_subquery))
    assigned_result = await db.execute(assigned_query)
    candidate_ids = [row[0] for row in assigned_result.all()]

    if candidate_ids:
        await db.execute(delete(Candidate).where(Candidate.id.in_(candidate_ids)))
        await db.commit()
        
        await AuditService.log_action(db, AuditLogCreate(
            user_id=user.id,
            action=AuditActionEnum.delete,
            resource_type="candidates",
            resource_id=None,
            details={"bulk_delete": True, "count": len(candidate_ids), "type": "assigned", "candidate_ids": candidate_ids}
        ))

    return {"deleted": len(candidate_ids)}

@router.post("", response_model=CandidateResponse)
async def create_candidate(candidate_in: CandidateCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    candidate = await CandidateService.create_candidate(db, user.id, candidate_in)
    await AuditService.log_action(db, AuditLogCreate(
        user_id=user.id, action=AuditActionEnum.create, resource_type="candidate",
        resource_id=candidate.id, details={"full_name": candidate.full_name, "email": candidate.email}
    ))
    return candidate

@router.post("/bulk-import", response_model=Dict[str, Any])
async def bulk_import_candidates(
    files: List[UploadFile] = File(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Import multiple candidates from Excel (.xlsx/.xls), CSV, or TSV files (batch upload).

    **Expected columns** (flexible header matching — Arabic & English supported):
    - `full_name` / `name` / الاسم الكامل  *(required)*
    - `email` / البريد الإلكتروني  *(required)*
    - `phone` / رقم الهاتف  *(optional)*
    - `linkedin_url` / linkedin  *(optional)*
    - `github_url` / github  *(optional)*
    - `source` / المصدر  *(optional)*

    **Supports**:
    - Multiple files in a single request
    - Mixed file types (Excel + CSV in same batch)
    - Individual file processing with aggregated results

    Returns aggregated summary: `{ created, skipped, errors, total_rows, files_processed }`.
    """
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")

    try:
        result = await asyncio.wait_for(
            CandidateService.bulk_import_multiple(db, user.id, files),
            timeout=300.0  # Increased timeout for multiple files
        )
    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="Candidate import timed out. Please try fewer/smaller files.")
    await AuditService.log_action(db, AuditLogCreate(
        user_id=user.id, action=AuditActionEnum.create, resource_type="candidate",
        details={"bulk_import": True, "created": len(result.get('created', [])), "skipped": len(result.get('skipped', [])), "files": [f.filename for f in files]}
    ))
    return result

@router.get("", response_model=List[CandidateResponse])
async def list_candidates(search: str = Query(None), db: AsyncSession = Depends(get_db)):
    if search:
        query = select(Candidate).filter(
            (Candidate.full_name.ilike(f"%{search}%")) | 
            (Candidate.email.ilike(f"%{search}%"))
        ).limit(50)
        result = await db.execute(query)
        candidates = list(result.scalars().all())
        return [CandidateResponse.model_validate(c) for c in candidates]
    return await CandidateService.get_candidates(db)

@router.get("/{candidate_id}", response_model=CandidateResponse)
async def get_candidate(candidate_id: int, db: AsyncSession = Depends(get_db)):
    return await CandidateService.get_candidate(db, candidate_id)

@router.patch("/{candidate_id}", response_model=CandidateResponse)
async def update_candidate(candidate_id: int, candidate_in: CandidateUpdate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await CandidateService.update_candidate(db, candidate_id, candidate_in)
    await AuditService.log_action(db, AuditLogCreate(
        user_id=user.id, action=AuditActionEnum.update, resource_type="candidate",
        resource_id=candidate_id, details={"changes": candidate_in.model_dump(exclude_unset=True)}
    ))
    return result

@router.delete("/{candidate_id}")
async def delete_candidate(candidate_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    candidate = await CandidateService.get_candidate(db, candidate_id)
    await AuditService.log_action(db, AuditLogCreate(
        user_id=user.id, action=AuditActionEnum.delete, resource_type="candidate",
        resource_id=candidate_id, details={"full_name": candidate.full_name, "email": candidate.email}
    ))
    await CandidateService.delete_candidate(db, candidate_id)
    return {"message": "Candidate deleted"}

@router.post("/{candidate_id}/resume", response_model=CandidateResponse)
async def upload_resume(candidate_id: int, file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    return await CandidateService.upload_resume(db, candidate_id, file)

@router.delete("/{candidate_id}/resume", response_model=CandidateResponse)
async def delete_resume(candidate_id: int, db: AsyncSession = Depends(get_db)):
    return await CandidateService.delete_resume(db, candidate_id)
