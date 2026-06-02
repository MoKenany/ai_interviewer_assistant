from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from typing import Dict, Any
from app.database import get_db
from app.models.job import Job
from app.models.job_version import JobVersion
from app.models.job_application import JobApplication
from app.models.interview_session import InterviewSession, PipelineStatusEnum
from app.models.interview_evaluation import InterviewEvaluation
import json

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/metrics")
async def get_dashboard_metrics(db: AsyncSession = Depends(get_db)) -> Dict[str, Any]:
    # 1. Pipeline Pulse
    active_sessions_query = select(func.count(InterviewSession.id)).where(
        InterviewSession.pipeline_status.in_([PipelineStatusEnum.running, PipelineStatusEnum.pending])
    )
    active_sessions_result = await db.execute(active_sessions_query)
    active_sessions = active_sessions_result.scalar() or 0
    
    total_evaluations_query = select(func.count(InterviewEvaluation.id))
    total_evaluations_result = await db.execute(total_evaluations_query)
    total_evaluations = total_evaluations_result.scalar() or 0
    
    pulse_metrics = {
        "active_sessions": active_sessions,
        "total_evaluations_saved": total_evaluations
    }

    # 2. Candidate Quality Matrix
    evaluations_query = select(
        InterviewEvaluation.id,
        InterviewEvaluation.overall_score,
        InterviewEvaluation.confidence_score,
        InterviewEvaluation.hiring_recommendation
    ).where(
        InterviewEvaluation.overall_score.isnot(None),
        InterviewEvaluation.confidence_score.isnot(None)
    )
    evaluations_result = await db.execute(evaluations_query)
    evaluations_data = evaluations_result.all()
    
    quality_matrix = []
    for eval_row in evaluations_data:
        quality_matrix.append({
            "id": eval_row.id,
            "overall_score": eval_row.overall_score,
            "confidence_score": eval_row.confidence_score,
            "recommendation": eval_row.hiring_recommendation.value if eval_row.hiring_recommendation else None
        })

    # 3. Funnel Bottleneck Analysis
    funnel_query = select(
        JobApplication.status,
        func.count(JobApplication.id)
    ).group_by(JobApplication.status)
    funnel_result = await db.execute(funnel_query)
    funnel_counts = funnel_result.all()
    
    funnel_metrics = {status.value: count for status, count in funnel_counts}

    # 4. Department Workload
    dept_query = select(
        Job.department,
        func.count(JobApplication.id)
    ).join(JobVersion, JobVersion.job_id == Job.id)\
     .join(JobApplication, JobApplication.job_version_id == JobVersion.id)\
     .where(Job.status == 'open')\
     .group_by(Job.department)
    
    dept_result = await db.execute(dept_query)
    department_loads = dept_result.all()
     
    department_workload = [{"department": dept or "General", "load": count} for dept, count in department_loads]

    # 5. Skills Gap Radar
    weaknesses_query = select(InterviewEvaluation.weaknesses)
    weaknesses_result = await db.execute(weaknesses_query)
    weaknesses_data = weaknesses_result.scalars().all()
    
    skill_gaps = {}
    for weaknesses in weaknesses_data:
        if not weaknesses:
            continue
        if isinstance(weaknesses, str):
            try:
                weaknesses = json.loads(weaknesses)
            except json.JSONDecodeError:
                continue
        if isinstance(weaknesses, list):
            for w in weaknesses:
                if isinstance(w, dict):
                    criterion = w.get("criterion")
                    if criterion:
                        criterion = str(criterion).strip()
                        skill_gaps[criterion] = skill_gaps.get(criterion, 0) + 1

    top_skill_gaps = [{"criterion": k, "count": v} for k, v in sorted(skill_gaps.items(), key=lambda item: item[1], reverse=True)[:10]]

    return {
        "pulse": pulse_metrics,
        "quality_matrix": quality_matrix,
        "funnel": funnel_metrics,
        "department_workload": department_workload,
        "skill_gaps": top_skill_gaps
    }
