from datetime import date
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from typing import Dict, Any, Optional
from app.database import get_db
from app.models.job import Job
from app.models.job_version import JobVersion
from app.models.job_application import JobApplication
from app.models.interview_session import InterviewSession, PipelineStatusEnum
from app.models.interview_evaluation import InterviewEvaluation
import json

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/metrics")
async def get_dashboard_metrics(
    db: AsyncSession = Depends(get_db),
    job_title: Optional[str] = None,
    department: Optional[str] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None
) -> Dict[str, Any]:
    # 1. Pipeline Pulse
    filters = []
    session_join = InterviewSession.application_id == JobApplication.id
    evaluation_join = InterviewEvaluation.application_id == JobApplication.id
    application_job_version_join = JobApplication.job_version_id == JobVersion.id
    job_version_job_join = JobVersion.job_id == Job.id

    if job_title:
        filters.append(Job.title == job_title)
    if department:
        filters.append(Job.department == department)
    if from_date:
        filters.append(JobApplication.created_at >= from_date)
    if to_date:
        filters.append(JobApplication.created_at <= to_date)

    active_sessions_query = select(func.count(InterviewSession.id))
    active_sessions_query = active_sessions_query.join(JobApplication, session_join)
    active_sessions_query = active_sessions_query.join(JobVersion, application_job_version_join)
    active_sessions_query = active_sessions_query.join(Job, job_version_job_join)
    active_sessions_query = active_sessions_query.where(
        InterviewSession.pipeline_status.in_([PipelineStatusEnum.running, PipelineStatusEnum.pending]),
        *filters
    )
    active_sessions_result = await db.execute(active_sessions_query)
    active_sessions = active_sessions_result.scalar() or 0
    
    total_evaluations_query = select(func.count(InterviewEvaluation.id))
    total_evaluations_query = total_evaluations_query.join(JobApplication, evaluation_join)
    total_evaluations_query = total_evaluations_query.join(JobVersion, application_job_version_join)
    total_evaluations_query = total_evaluations_query.join(Job, job_version_job_join)
    total_evaluations_query = total_evaluations_query.where(*filters)
    total_evaluations_result = await db.execute(total_evaluations_query)
    total_evaluations = total_evaluations_result.scalar() or 0

    avg_scores_query = select(
        func.avg(InterviewEvaluation.overall_score),
        func.avg(InterviewEvaluation.confidence_score)
    ).join(JobApplication, evaluation_join)
    avg_scores_query = avg_scores_query.join(JobVersion, application_job_version_join)
    avg_scores_query = avg_scores_query.join(Job, job_version_job_join)
    avg_scores_query = avg_scores_query.where(
        InterviewEvaluation.overall_score.isnot(None),
        InterviewEvaluation.confidence_score.isnot(None),
        *filters
    )
    avg_scores_result = await db.execute(avg_scores_query)
    avg_overall_score, avg_confidence_score = avg_scores_result.one_or_none() or (0.0, 0.0)
    avg_overall_score = round(avg_overall_score or 0.0, 1)
    avg_confidence_score = round((avg_confidence_score or 0.0) * 100, 0)
    
    pulse_metrics = {
        "active_sessions": active_sessions,
        "total_evaluations_saved": total_evaluations,
        "average_overall_score": avg_overall_score,
        "average_confidence_score": avg_confidence_score
    }

    # 2. Candidate Quality Matrix
    evaluations_query = select(
        InterviewEvaluation.id,
        InterviewEvaluation.overall_score,
        InterviewEvaluation.confidence_score,
        InterviewEvaluation.hiring_recommendation
    ).join(JobApplication, evaluation_join)
    evaluations_query = evaluations_query.join(JobVersion, application_job_version_join)
    evaluations_query = evaluations_query.join(Job, job_version_job_join)
    evaluations_query = evaluations_query.where(
        InterviewEvaluation.overall_score.isnot(None),
        InterviewEvaluation.confidence_score.isnot(None),
        *filters
    )
    evaluations_result = await db.execute(evaluations_query)
    evaluations_data = evaluations_result.all()
    
    quality_matrix = []
    recommendation_counts = {
        "strong_hire": 0,
        "hire": 0,
        "neutral": 0,
        "no_hire": 0,
        "strong_no_hire": 0
    }
    review_risk_count = 0
    for eval_row in evaluations_data:
        recommendation = eval_row.hiring_recommendation.value if eval_row.hiring_recommendation else None
        if recommendation:
            recommendation_counts[recommendation] = recommendation_counts.get(recommendation, 0) + 1

        if eval_row.overall_score is not None and eval_row.confidence_score is not None:
            if eval_row.overall_score >= 75 and eval_row.confidence_score < 0.5:
                review_risk_count += 1

        quality_matrix.append({
            "id": eval_row.id,
            "overall_score": eval_row.overall_score,
            "confidence_score": eval_row.confidence_score,
            "recommendation": recommendation
        })

    quality_summary = {
        "recommendation_counts": recommendation_counts,
        "review_risk_count": review_risk_count
    }

    # 3. Funnel Bottleneck Analysis
    funnel_query = select(
        JobApplication.status,
        func.count(JobApplication.id)
    ).join(JobVersion, application_job_version_join)
    funnel_query = funnel_query.join(Job, job_version_job_join)
    funnel_query = funnel_query.where(*filters)
    funnel_query = funnel_query.group_by(JobApplication.status)
    funnel_result = await db.execute(funnel_query)
    funnel_counts = funnel_result.all()
    
    funnel_metrics = {status.value: count for status, count in funnel_counts}

    # 4. Department Workload
    dept_query = select(
        Job.department,
        func.count(JobApplication.id)
    ).join(JobVersion, application_job_version_join)
    dept_query = dept_query.join(Job, job_version_job_join)
    dept_query = dept_query.where(Job.status == 'open', *filters)
    dept_query = dept_query.group_by(Job.department)
    dept_result = await db.execute(dept_query)
    department_loads = dept_result.all()
     
    department_workload = [{"department": dept or "General", "load": count} for dept, count in department_loads]

    # 5. Skills Gap Radar
    weaknesses_query = select(InterviewEvaluation.weaknesses).join(JobApplication, evaluation_join)
    weaknesses_query = weaknesses_query.join(JobVersion, application_job_version_join)
    weaknesses_query = weaknesses_query.join(Job, job_version_job_join)
    weaknesses_query = weaknesses_query.where(*filters)
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

    job_titles_result = await db.execute(select(Job.title).distinct().where(Job.title.isnot(None)).order_by(Job.title))
    job_titles = [row[0] for row in job_titles_result.fetchall()]

    departments_result = await db.execute(select(Job.department).distinct().order_by(Job.department))
    departments = []
    seen_departments = set()
    for row in departments_result.fetchall():
        department_name = row[0] or 'General'
        if department_name not in seen_departments:
            seen_departments.add(department_name)
            departments.append(department_name)

    return {
        "pulse": pulse_metrics,
        "quality_matrix": quality_matrix,
        "quality_summary": quality_summary,
        "funnel": funnel_metrics,
        "department_workload": department_workload,
        "skill_gaps": top_skill_gaps,
        "options": {
            "job_titles": job_titles,
            "departments": departments
        }
    }
