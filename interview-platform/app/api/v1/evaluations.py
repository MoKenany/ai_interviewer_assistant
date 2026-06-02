import html

from fastapi import APIRouter, Depends
from fastapi.responses import HTMLResponse
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.evaluation import EvaluationResponse, EvaluationNotesUpdate, InsightsResponse, SuggestedQuestionsResponse
from app.services.evaluation_service import EvaluationService
from app.core.security import get_current_user

router = APIRouter(prefix="/evaluations", tags=["evaluations"], dependencies=[Depends(get_current_user)])

# --- Specific routes FIRST (before /{evaluation_id} wildcard) ---

def _escape_text(value: any) -> str:
    if value is None:
        return ''
    return html.escape(str(value), quote=False)


def _format_paragraph(text: str) -> str:
    return _escape_text(text).replace('\n', '<br>')


def _render_list(items: list[dict], title_key: str, description_key: str, fallback: str, evidence_label: str = '') -> str:
    if not items:
        return f'<div class="item"><div class="item-text">{fallback}</div></div>'
    blocks = []
    for item in items:
        title = _escape_text(item.get(title_key) or item.get('criterion') or item.get('question') or '')
        description = _format_paragraph(item.get(description_key) or '')
        evidence = _format_paragraph(item.get('evidence_quote') or item.get('evidence') or item.get('evidence_quote_text') or '')
        details = description
        if evidence:
            details = f'{details}<br><br><strong>{_escape_text(evidence_label)}:</strong> {evidence}' if evidence_label else f'{details}<br><br>{evidence}'
        if not details.strip():
            details = _escape_text('لا يوجد وصف.' if evidence_label == 'الدليل' else 'No description provided.')
        blocks.append(
            f'<div class="item"><div class="item-title">{title}</div><div class="item-text">{details}</div></div>'
        )
    return ''.join(blocks)


def _render_competencies(competencies: any, lang: str) -> str:
    if not competencies:
        return f'<div class="item"><div class="item-text">{_escape_text("لا يوجد تحليل تفصيلي للمعايير." if lang == "ar" else "No detailed competency analysis available.")}</div></div>'
    blocks = []
    if isinstance(competencies, dict):
        items = competencies.items()
    elif isinstance(competencies, list):
        items = enumerate(competencies)
    else:
        return f'<div class="item"><div class="item-text">{_escape_text("لا يوجد تحليل تفصيلي للمعايير." if lang == "ar" else "No detailed competency analysis available.")}</div></div>'

    for key, value in items:
        if not isinstance(value, dict):
            value = {'name': str(value)}
        name = _escape_text(value.get('criterion_name') or value.get('competency') or value.get('name') or str(key))
        score = value.get('score', value.get('rating', value.get('value', 'N/A')))
        score_text = f'{score}/100' if score != 'N/A' else 'N/A'
        description = _format_paragraph(value.get('justification') or value.get('reasoning') or value.get('feedback') or value.get('description') or '')
        evidence = _format_paragraph(value.get('evidence_quote') or value.get('evidence') or value.get('supporting_text') or '')
        details = description
        if evidence:
            if details:
                details = f'{details}<br><br><strong>{_escape_text("الدليل" if lang == "ar" else "Evidence")}:</strong> {evidence}'
            else:
                details = evidence
        if not details.strip():
            details = _escape_text('لا يوجد وصف.' if lang == 'ar' else 'No description provided.')
        blocks.append(
            f'<div class="item"><div class="item-title">{name} — {score_text}</div><div class="item-text">{details}</div></div>'
        )
    return ''.join(blocks)


def _render_evaluation_report_html(evaluation, candidate=None, current_user=None, lang: str = 'en') -> str:
    is_ar = lang == 'ar'
    recommendation = _escape_text(evaluation.hiring_recommendation.value if hasattr(evaluation.hiring_recommendation, 'value') else evaluation.hiring_recommendation)
    recommendation_map = {
        'strong_hire': 'توظيف قوي' if is_ar else 'Strong Hire',
        'hire': 'توظيف' if is_ar else 'Hire',
        'no_hire': 'رفض' if is_ar else 'No Hire',
        'strong_no_hire': 'رفض قاطع' if is_ar else 'Strong No Hire'
    }
    recommendation_label = recommendation_map.get(recommendation, recommendation)
    recommendation_class = 'badge-success' if recommendation in ('strong_hire', 'hire') else 'badge-danger' if recommendation in ('no_hire', 'strong_no_hire') else 'badge-warning'
    confidence_text = f"{int(evaluation.confidence_score * 100)}%" if evaluation.confidence_score is not None and evaluation.confidence_score <= 1 else f"{evaluation.confidence_score}%" if evaluation.confidence_score is not None else (_escape_text('غير متوفر' if is_ar else 'Not Available'))
    confidence_percent = None
    if evaluation.confidence_score is not None:
        confidence_percent = int(evaluation.confidence_score * 100) if evaluation.confidence_score <= 1 else int(evaluation.confidence_score)
    confidence_explanation = ''
    if isinstance(evaluation.interviewer_notes, dict):
        confidence_explanation = evaluation.interviewer_notes.get('confidence_explanation', '') or ''
    if confidence_percent is not None and confidence_percent < 90 and confidence_explanation:
        confidence_section = f"<div class='section'><h2>{'تفسير ضعف الثقة' if is_ar else 'Confidence Explanation'}</h2><div class='item'><div class='item-text'>{_format_paragraph(confidence_explanation)}</div></div></div>"
    else:
        confidence_section = ''
    updated_at = evaluation.updated_at or evaluation.created_at
    date_label = updated_at.strftime('%Y-%m-%d %H:%M') if updated_at else ''

    direction = 'rtl' if is_ar else 'ltr'
    align = 'right' if is_ar else 'left'

    # Inject candidate and HR sections
    candidate_html = ""
    if candidate:
        c_name = _escape_text(candidate.full_name)
        c_email = _escape_text(candidate.email)
        c_phone = f'<div class="field"><div class="field-label">{"رقم الهاتف" if is_ar else "Phone"}</div><div class="field-value">{_escape_text(candidate.phone)}</div></div>' if candidate.phone else ""
        c_linkedin = f'<div class="field"><div class="field-label">{"لينكدإن" if is_ar else "LinkedIn"}</div><div class="field-value"><a href="{_escape_text(candidate.linkedin_url)}">{_escape_text(candidate.linkedin_url)}</a></div></div>' if candidate.linkedin_url else ""
        c_github = f'<div class="field"><div class="field-label">{"جيت هب" if is_ar else "GitHub"}</div><div class="field-value"><a href="{_escape_text(candidate.github_url)}">{_escape_text(candidate.github_url)}</a></div></div>' if candidate.github_url else ""
        c_source = f'<div class="field"><div class="field-label">{"المصدر" if is_ar else "Source"}</div><div class="field-value">{_escape_text(candidate.source)}</div></div>' if candidate.source else ""
        candidate_html = f'<div class="section"><h2>{"بيانات المرشح" if is_ar else "Candidate Details"}</h2><div class="field"><div class="field-label">{"الاسم" if is_ar else "Name"}</div><div class="field-value">{c_name}</div></div><div class="field"><div class="field-label">{"البريد الإلكتروني" if is_ar else "Email"}</div><div class="field-value">{c_email}</div></div>{c_phone}{c_linkedin}{c_github}{c_source}</div>'

    hr_html = ""
    if current_user:
        hr_name = _escape_text(current_user.full_name)
        hr_email = _escape_text(current_user.email)
        hr_role = _escape_text(current_user.role.value if hasattr(current_user.role, 'value') else current_user.role)
        hr_html = f'<div class="section"><h2>{"معلومات مُصدر التقرير (HR)" if is_ar else "Report Generated By (HR)"}</h2><div class="field"><div class="field-label">{"الاسم" if is_ar else "Name"}</div><div class="field-value">{hr_name}</div></div><div class="field"><div class="field-label">{"البريد الإلكتروني" if is_ar else "Email"}</div><div class="field-value">{hr_email}</div></div><div class="field"><div class="field-label">{"الصلاحية" if is_ar else "Role"}</div><div class="field-value">{hr_role}</div></div></div>'

    return f'''<!DOCTYPE html>
<html lang="{lang}">
<head>
<meta charset="UTF-8">
<title>{'تقرير التقييم' if is_ar else 'Evaluation Report'}</title>
<style>
body {{ margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #f3f4f6; color: #102a43; direction: {direction}; text-align: {align}; }}
.page {{ max-width: 900px; margin: 0 auto; background: #ffffff; border-radius: 20px; padding: 32px; box-shadow: 0 24px 80px rgba(15, 23, 42, 0.12); }}
.header {{ display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; }}
.title {{ margin: 0 0 8px 0; font-size: 32px; line-height: 1.05; }}
.meta {{ color: #64748b; font-size: 0.95rem; line-height: 1.7; }}
.badge {{ display: inline-flex; align-items: center; padding: 10px 16px; border-radius: 999px; font-weight: 700; font-size: 0.92rem; }}
.badge-success {{ background: #ecfdf5; color: #166534; }}
.badge-warning {{ background: #fef3c7; color: #713f12; }}
.badge-danger {{ background: #fee2e2; color: #991b1b; }}
.section {{ margin-top: 32px; }}
.section h2 {{ margin: 0 0 16px 0; font-size: 20px; color: #0f172a; }}
.field {{ display: grid; grid-template-columns: minmax(160px, 220px) 1fr; gap: 12px 24px; padding: 14px 0; border-bottom: 1px solid #e2e8f0; }}
.field:last-child {{ border-bottom: none; }}
.field-label {{ color: #475569; font-weight: 700; }}
.field-value {{ color: #0f172a; line-height: 1.8; }}
.item {{ background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px; margin-bottom: 14px; text-align: {align}; }}
.item-title {{ margin: 0 0 8px 0; font-weight: 700; color: #0f172a; }}
.item-text {{ margin: 0; color: #475569; line-height: 1.8; white-space: pre-wrap; }}
.btn-note {{ display: inline-flex; align-items: center; gap: 0.5rem; padding: 10px 14px; margin-top: 12px; border-radius: 10px; background: #2563eb; color: #fff; text-decoration: none; }}
@media print {{ body {{ background: #fff; }} .page {{ box-shadow: none; border-radius: 0; margin: 0; }} }}
</style>
</head>
<body>
<div class="page">
    <div class="header">
        <div>
            <h1 class="title">{'تقرير تقييم نهائي' if is_ar else 'Final Evaluation Report'}</h1>
            <div class="meta">{'رقم الجلسة' if is_ar else 'Session ID'}: {_escape_text(evaluation.session_id)}</div>
            <div class="meta">{'رقم التقرير' if is_ar else 'Evaluation ID'}: {_escape_text(evaluation.id)}</div>
            <div class="meta">{'التاريخ' if is_ar else 'Date'}: {date_label}</div>
        </div>
        <div style="text-align: {align};">
            <span class="badge {recommendation_class}">{recommendation_label}</span>
        </div>
    </div>
    
    {candidate_html}
    {hr_html}

    <div class="section">
        <h2>{'النتائج الرئيسية' if is_ar else 'Key Results'}</h2>
        <div class="field"><div class="field-label">{'الدرجة الإجمالية' if is_ar else 'Overall Score'}</div><div class="field-value">{_escape_text(evaluation.overall_score)} / 100</div></div>
        <div class="field"><div class="field-label">{'ثقة الذكاء الاصطناعي' if is_ar else 'AI Confidence'}</div><div class="field-value">{confidence_text}</div></div>
        <div class="field"><div class="field-label">{'توصية التوظيف' if is_ar else 'Hiring Recommendation'}</div><div class="field-value">{recommendation_label}</div></div>
    </div>

    <div class="section">
        <h2>{'الملخص التنفيذي' if is_ar else 'Executive Summary'}</h2>
        <div class="item"><div class="item-text">{_format_paragraph(evaluation.executive_summary or ('لا يوجد ملخص متاح.' if is_ar else 'No executive summary available.'))}</div></div>
    </div>

    <div class="section">
        <h2>{'ملاحظات المقابل' if is_ar else 'Interviewer Notes'}</h2>
        <div class="item"><div class="item-text">{_format_paragraph((evaluation.interviewer_notes or {}).get('notes') or (evaluation.interviewer_notes or {}).get('text') or ('لا توجد ملاحظات.' if is_ar else 'No notes recorded.'))}</div></div>
    </div>

    {confidence_section}

    <div class="section">
        <h2>{'نقاط القوة' if is_ar else 'Strengths'}</h2>
        {_render_list(evaluation.strengths or [], 'criterion', 'description', 'لا توجد نقاط قوة مسجلة.' if is_ar else 'No strengths recorded.', 'الدليل' if is_ar else 'Evidence')}
    </div>

    <div class="section">
        <h2>{'مجالات التحسين' if is_ar else 'Areas for Improvement'}</h2>
        {_render_list(evaluation.weaknesses or [], 'criterion', 'gap_analysis', 'لا توجد مجالات تحسين مسجلة.' if is_ar else 'No improvement areas recorded.', 'الدليل' if is_ar else 'Evidence')}
    </div>

    <div class="section">
        <h2>{'التحليل التفصيلي للمعايير' if is_ar else 'Competency Breakdown'}</h2>
        {_render_competencies(evaluation.competency_breakdown or {}, lang)}
    </div>

    <div class="section">
        <h2>{'أسئلة متابعة مقترحة' if is_ar else 'Suggested Questions'}</h2>
        {_render_list(evaluation.suggested_questions or [], 'question', 'question', 'لا توجد أسئلة مقترحة.' if is_ar else 'No suggested questions.')}
    </div>

    <div class="section">
        <a class="btn-note" href="javascript:window.print();">{'طباعة أو حفظ PDF' if is_ar else 'Print or Save as PDF'}</a>
    </div>
</div>
</body>
</html>'''


@router.get("/session/{session_id}", response_model=EvaluationResponse)
async def get_evaluation_by_session(session_id: int, db: AsyncSession = Depends(get_db)):
    return await EvaluationService.get_evaluation_by_session(db, session_id)

@router.get("/{evaluation_id}/report", response_class=HTMLResponse)
async def get_evaluation_report(evaluation_id: int, lang: str = 'en', db: AsyncSession = Depends(get_db), current_user = Depends(get_current_user)):
    evaluation = await EvaluationService.get_evaluation(db, evaluation_id)
    
    candidate = None
    if evaluation and getattr(evaluation, 'application_id', None):
        from app.models.job_application import JobApplication
        from app.models.candidate import Candidate
        app_obj = await db.get(JobApplication, evaluation.application_id)
        if app_obj and app_obj.candidate_id:
            candidate = await db.get(Candidate, app_obj.candidate_id)

    return HTMLResponse(content=_render_evaluation_report_html(evaluation, candidate, current_user, lang))

# --- Wildcard routes ---

@router.get("/{evaluation_id}", response_model=EvaluationResponse)
async def get_evaluation(evaluation_id: int, db: AsyncSession = Depends(get_db)):
    return await EvaluationService.get_evaluation(db, evaluation_id)

@router.get("/{evaluation_id}/insights", response_model=InsightsResponse)
async def get_insights(evaluation_id: int, db: AsyncSession = Depends(get_db)):
    return await EvaluationService.get_insights(db, evaluation_id)

@router.get("/{evaluation_id}/suggested-questions", response_model=SuggestedQuestionsResponse)
async def get_suggested_questions(evaluation_id: int, db: AsyncSession = Depends(get_db)):
    return await EvaluationService.get_suggested_questions(db, evaluation_id)

@router.patch("/{evaluation_id}/notes", response_model=EvaluationResponse)
async def update_notes(evaluation_id: int, notes_in: EvaluationNotesUpdate, db: AsyncSession = Depends(get_db)):
    return await EvaluationService.update_notes(db, evaluation_id, notes_in)

@router.delete("/{evaluation_id}")
async def delete_evaluation(evaluation_id: int, db: AsyncSession = Depends(get_db)):
    await EvaluationService.delete_evaluation(db, evaluation_id)
    return {"message": "Evaluation deleted"}
