import { t, getLang } from '../core/i18n.js';
import { api } from '../core/api.js';
import { Toast } from '../components/Toast.js';

export class EvaluationDetailSection {
    constructor(params) {
        this.sessionId = params.sessionId;
        this.evaluation = null;
        this.insights = null;
        this.session = null;
    }

    async fetchData() {
        try {
            this.session = await api.get(`/sessions/${this.sessionId}`);
            this.evaluation = await api.get(`/evaluations/session/${this.sessionId}`);
            if (this.evaluation && this.evaluation.id) {
                // Fetch optional extra insights/questions if available
                try {
                    this.insights = await api.get(`/evaluations/${this.evaluation.id}/insights`);
                } catch (e) {
                    console.log("No extra insights endpoint match, fallback to evaluation fields.");
                }
            }
        } catch (error) {
            Toast.show(getLang() === 'ar' ? 'التقييم ليس جاهزاً بعد أو غير موجود.' : 'Evaluation not ready or not found.', 'error');
            this.evaluation = null;
        }
    }

    render() {
        const isAr = getLang() === 'ar';
        const appId = this.session?.application_id || (this.evaluation && this.evaluation.application_id) || sessionStorage.getItem('current_app_id') || '';
        const returnHash = sessionStorage.getItem('candidate_eval_return');
        const backPath = returnHash || `/applications/${appId}/sessions`;
        if (returnHash) {
            sessionStorage.removeItem('candidate_eval_return');
        }
        
        if (!this.evaluation) {
            return `
                <div style="text-align: center; padding: 4rem 2rem; background: var(--surface-color); border-radius: var(--radius-lg); box-shadow: var(--shadow-sm); border: 1px solid var(--border-color); max-width: 600px; margin: 3rem auto;">
                    <div style="width: 70px; height: 70px; background: rgba(0, 180, 136, 0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem;">
                        <i class="fas fa-circle-notch fa-spin" style="font-size: 2rem; color: var(--primary-color);"></i>
                    </div>
                    <h2 style="font-weight: 700; margin-bottom: 0.8rem; color: var(--text-main);">${isAr ? 'التقييم قيد المعالجة أو غير جاهز' : 'Evaluation Processing or Not Ready'}</h2>
                    <p style="color: var(--text-muted); margin-bottom: 1.8rem; line-height: 1.6;">
                        ${isAr 
                            ? 'قد يكون خط الأنابيب الذكي (AI Pipeline) لا يزال قيد التشغيل والتحليل حالياً. يمكنك مراقبة التقدم خطوة بخطوة بالضغط على الزر أدناه.' 
                            : 'The AI analysis pipeline is currently running. You can track the progress step-by-step by clicking the button below.'}
                    </p>
                    <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
                        <button class="btn btn-outline" onclick="window.location.hash='${backPath}'" style="padding:0.6rem 1.2rem;">
                            <i class="fas fa-arrow-left"></i> ${isAr ? 'العودة' : 'Back'}
                        </button>
                        <button class="btn btn-primary" onclick="window.location.hash='/pipeline/runs/${this.sessionId}'" style="padding:0.6rem 1.2rem; box-shadow: 0 4px 12px rgba(0, 180, 136, 0.2);">
                            <i class="fas fa-project-diagram"></i> ${isAr ? 'مراقبة تقدم الـ AI' : 'Track AI Progress'}
                        </button>
                    </div>
                </div>
            `;
        }

        const ev = this.evaluation;
        
        // Merge insights if fetched, else fallback to fields on evaluation itself
        const strengths = (this.insights && this.insights.strengths) || ev.strengths || [];
        const weaknesses = (this.insights && this.insights.weaknesses) || ev.weaknesses || [];
        const interviewerNotesObj = (this.insights && this.insights.interviewer_notes) || ev.interviewer_notes || {};
        
        const notesText = typeof interviewerNotesObj === 'object' && interviewerNotesObj !== null 
            ? (interviewerNotesObj.notes || interviewerNotesObj.text || '') 
            : (interviewerNotesObj || '');

        // Determine recommendation color & text with custom glows
        let recBg = 'rgba(59, 130, 246, 0.1)';
        let recText = '#3b82f6';
        let recommendationLabel = ev.hiring_recommendation || 'N/A';
        
        const rec = String(ev.hiring_recommendation).toLowerCase();
        if (rec.includes('strongly_recommend') || rec.includes('strong_hire')) {
            recBg = 'rgba(16, 185, 129, 0.1)';
            recText = '#10b981';
            recommendationLabel = isAr ? 'توظيف قوي (Strong Hire)' : 'Strong Hire';
        } else if (rec.includes('do_not_recommend') || rec.includes('no_hire') || rec.includes('strong_no_hire')) {
            recBg = 'rgba(244, 63, 94, 0.1)';
            recText = '#f43f5e';
            recommendationLabel = rec.includes('strong_no_hire') || rec.includes('do_not_recommend')
                ? (isAr ? 'رفض قاطع (Strong No Hire)' : 'Strong No Hire')
                : (isAr ? 'استبعاد (No Hire)' : 'No Hire');
        } else if (rec.includes('recommend') || rec.includes('hire')) {
            recBg = 'rgba(0, 180, 136, 0.1)';
            recText = '#00b488';
            recommendationLabel = isAr ? 'توظيف (Hire)' : 'Hire';
        } else if (rec.includes('neutral')) {
            recBg = 'rgba(245, 158, 11, 0.1)';
            recText = '#f59e0b';
            recommendationLabel = isAr ? 'مراجعة ومقابلة ثانية (Neutral)' : 'Neutral / Review';
        }

        // Render Lists helper
        const renderBulletList = (items, isStrength = true) => {
            if (!items || !items.length) {
                return `<div style="color:var(--text-muted); text-align:center; padding: 2rem 0;">${isAr ? 'لا توجد نقاط مسجلة.' : 'No items recorded.'}</div>`;
            }
            const icon = isStrength 
                ? `<i class="fas fa-check-circle" style="color:#10b981; margin-inline-end:0.5rem; font-size:1.1rem;"></i>` 
                : `<i class="fas fa-exclamation-circle" style="color:#f43f5e; margin-inline-end:0.5rem; font-size:1.1rem;"></i>`;
            
            return items.map(item => {
                let parsedItem = item;
                if (typeof item === 'string') {
                    try {
                        parsedItem = JSON.parse(item);
                    } catch (e) {
                        parsedItem = item;
                    }
                }
                
                if (typeof parsedItem === 'object' && parsedItem !== null) {
                    const criterion = parsedItem.criterion || parsedItem.point || parsedItem.strength || parsedItem.weakness || parsedItem.text || '';
                    const desc = parsedItem.description || parsedItem.reason || '';
                    const extra = isStrength ? (parsedItem.evidence_quote || '') : (parsedItem.gap_analysis || '');
                    
                    return `
                        <div style="margin-bottom: 1rem; line-height: 1.6; display:flex; align-items:start; gap:0.6rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.8rem;">
                            <span style="margin-top:2px; flex-shrink:0;">${icon}</span>
                            <div style="flex-grow:1;">
                                <strong style="color: var(--text-color); font-size:0.95rem; display:block; margin-bottom:0.25rem;">${criterion}</strong>
                                ${desc ? `<p style="font-size:0.85rem; color:var(--text-muted); margin:0.2rem 0; line-height:1.5; text-align:justify;">${desc}</p>` : ''}
                                ${extra ? `
                                    <div style="font-size:0.8rem; color: var(--text-main); margin-top:0.4rem; background:var(--bg-secondary, #f8fafc); padding:0.6rem 0.8rem; border-radius:6px; border-inline-start:3px solid ${isStrength ? '#10b981' : '#f43f5e'}; line-height:1.5;">
                                        <strong style="color:${isStrength ? '#10b981' : '#f43f5e'}; display:block; margin-bottom:0.15rem; font-size:0.75rem; text-transform:uppercase;">
                                            ${isStrength ? (isAr ? 'اقتباس الأدلة:' : 'Evidence Quote:') : (isAr ? 'تحليل الفجوة:' : 'Gap Analysis:')}
                                        </strong>
                                        <span style="font-style:italic;">"${extra}"</span>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    `;
                }
                return `
                    <div style="margin-bottom: 0.8rem; line-height: 1.6; display:flex; align-items:start; gap:0.5rem; color:var(--text-main);">
                        <span style="margin-top:4px; flex-shrink:0;">${icon}</span>
                        <span>${parsedItem}</span>
                    </div>
                `;
            }).join('');
        };

        // Render Competency Breakdown
        const rawCompetencies = ev.competency_breakdown || [];
        const competencies = Array.isArray(rawCompetencies)
            ? rawCompetencies
            : Object.entries(rawCompetencies).map(([name, value]) => ({ criterion_name: name, ...value }));
            
        const competencyHtml = competencies.length > 0 
            ? competencies.map(c => {
                const name = c.criterion_name || c.competency || c.criteria || c.name || (isAr ? 'معيار تقييم' : 'Criteria');
                const score = c.score !== undefined ? c.score : (c.rating !== undefined ? c.rating : 0);
                const reasoning = c.justification || c.reasoning || c.feedback || '';
                return `
                    <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:8px; padding:1rem; margin-bottom:0.8rem; box-shadow:var(--shadow-sm);">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem; font-weight:700; color:var(--text-main);">
                            <span style="font-size:0.95rem;">${name}</span>
                            <span style="color:var(--primary-color); font-size:1rem;">${score}/100</span>
                        </div>
                        <div style="width:100%; height:6px; background:var(--border-color); border-radius:4px; overflow:hidden; margin-bottom:0.5rem;">
                            <div style="width:${score}%; height:100%; background:linear-gradient(90deg, var(--primary-color), #00d4a0); border-radius:4px;"></div>
                        </div>
                        ${reasoning ? `<p style="font-size:0.82rem; color:var(--text-muted); margin:0; line-height:1.5;">${reasoning}</p>` : ''}
                    </div>
                `;
            }).join('')
            : `<div style="text-align:center; padding:2rem; color:var(--text-muted); border:1px dashed var(--border-color); border-radius:var(--radius-md);">${isAr ? 'لا يوجد تحليل تفصيلي للمعايير.' : 'No detailed competency analysis available.'}</div>`;

        // Render AI Suggested Questions
        const questions = ev.suggested_questions || [];
        const questionsHtml = questions.length > 0
            ? questions.map((q, idx) => {
                if (typeof q === 'object' && q !== null) {
                    const quest = q.question || q.text || JSON.stringify(q);
                    const purpose = q.purpose || q.intent || '';
                    const expected = q.expected_answer || q.criteria || '';
                    return `
                        <div class="card" style="margin-bottom:0.8rem; border-inline-start:4px solid var(--primary-color); padding:1rem; background:var(--bg-secondary, #f8fafc); box-shadow:none;">
                            <div style="font-weight:700; color:var(--text-main); margin-bottom:0.4rem; display:flex; gap:0.5rem; align-items:start; font-size:0.95rem; line-height:1.5;">
                                <span style="background:var(--primary-color); color:white; width:22px; height:22px; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; font-size:0.75rem; flex-shrink:0; margin-top:2px;">${idx + 1}</span>
                                <span>${quest}</span>
                            </div>
                            ${purpose ? `<p style="font-size:0.82rem; color:var(--text-muted); margin:0.2rem 0; line-height:1.4;"><strong style="color:var(--text-main);">${isAr ? 'الهدف:' : 'Purpose:'}</strong> ${purpose}</p>` : ''}
                            ${expected ? `<p style="font-size:0.82rem; color:var(--text-muted); margin:0.2rem 0; line-height:1.4;"><strong style="color:var(--text-main);">${isAr ? 'الإجابة النموذجية المتوقعة:' : 'Expected Response:'}</strong> ${expected}</p>` : ''}
                        </div>
                    `;
                }
                return `
                    <div class="card" style="margin-bottom:0.8rem; border-inline-start:4px solid var(--primary-color); padding:1rem; display:flex; gap:0.5rem; align-items:center; background:var(--bg-secondary, #f8fafc); box-shadow:none;">
                        <span style="background:var(--primary-color); color:white; width:22px; height:22px; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; font-size:0.75rem; flex-shrink:0;">${idx + 1}</span>
                        <span style="font-weight:700; color:var(--text-main); font-size:0.92rem;">${q}</span>
                    </div>
                `;
            }).join('')
            : `<div style="text-align:center; padding:2rem; color:var(--text-muted); border:1px dashed var(--border-color); border-radius:var(--radius-md);">${isAr ? 'لا توجد أسئلة مقترحة.' : 'No suggested follow-up questions.'}</div>`;

        return `
            <style>
                /* Modern Thin Scrollbar for elements */
                .scrollable-card-body {
                    max-height: 400px;
                    overflow-y: auto;
                    padding-inline-end: 0.75rem;
                }
                .scrollable-card-body::-webkit-scrollbar {
                    width: 6px;
                }
                .scrollable-card-body::-webkit-scrollbar-track {
                    background: transparent;
                }
                .scrollable-card-body::-webkit-scrollbar-thumb {
                    background-color: var(--border-color, #cbd5e1);
                    border-radius: 20px;
                }
                .scrollable-card-body::-webkit-scrollbar-thumb:hover {
                    background-color: var(--text-muted, #94a3b8);
                }
                
                .eval-metrics-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                    gap: 1.5rem;
                    margin-bottom: 2rem;
                }
                
                .eval-two-col-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(420px, 1fr));
                    gap: 1.5rem;
                    margin-bottom: 2rem;
                    align-items: stretch;
                }
                @media (max-width: 768px) {
                    .eval-two-col-grid {
                        grid-template-columns: 1fr;
                    }
                }
                
                .glowing-circle {
                    box-shadow: 0 0 15px rgba(var(--primary-color-rgb, 0, 180, 136), 0.15);
                    transition: all 0.3s ease;
                }
                .glowing-circle:hover {
                    transform: scale(1.03);
                    box-shadow: 0 0 25px rgba(var(--primary-color-rgb, 0, 180, 136), 0.25);
                }
            </style>

            <!-- Row 1: Header Section -->
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2rem; border-bottom:1px solid var(--border-color); padding-bottom:1.2rem; flex-wrap:wrap; gap:1rem;">
                <div>
                    <h1 style="color:var(--primary-color); font-weight:800; font-size:1.8rem; margin:0; display:flex; align-items:center; gap:0.6rem;">
                        <i class="fas fa-chart-line"></i> ${isAr ? 'تقرير تقييم المقابلة الذكي' : 'AI Interview Evaluation Report'}
                    </h1>
                    <p style="color:var(--text-muted); margin:0.4rem 0 0 0; font-size:0.9rem;">
                        ${isAr ? 'رقم الجلسة:' : 'Session ID:'} <strong>${this.sessionId}</strong> | 
                        ${isAr ? 'رقم التقرير:' : 'Evaluation ID:'} <strong>${ev.id}</strong>
                    </p>
                </div>
                <button class="btn btn-outline" onclick="window.location.hash='${backPath}'" style="display:flex; align-items:center; gap:0.5rem;">
                    <i class="fas fa-arrow-left"></i> ${isAr ? 'العودة' : 'Back'}
                </button>
            </div>

            <!-- Row 2: Summary Matrix (3-Column Grid) -->
            <div class="eval-metrics-grid">
                
                <!-- Score Circle Card -->
                <div class="card" style="text-align:center; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:1.5rem; background:var(--surface-color); border-radius:12px; border-top:4px solid var(--primary-color); box-shadow:var(--shadow-sm);">
                    <h3 style="color:var(--text-muted); font-size:0.9rem; font-weight:700; margin-bottom:1rem; text-transform:uppercase; letter-spacing:0.5px;">
                        ${isAr ? 'النتيجة الإجمالية للمرشح' : 'Overall Score'}
                    </h3>
                    <div class="glowing-circle" style="position:relative; width:120px; height:120px; display:flex; align-items:center; justify-content:center; background:radial-gradient(circle, var(--surface-color) 70%, transparent 71%), conic-gradient(var(--primary-color) ${ev.overall_score}%, var(--border-color) 0); border-radius:50%; margin-bottom:0.5rem;">
                        <span style="font-size:2.2rem; font-weight:850; color:var(--text-color);">${ev.overall_score || 0}</span>
                        <span style="font-size:0.75rem; color:var(--text-muted); position:absolute; bottom:20px;">/ 100</span>
                    </div>
                </div>

                <!-- Recommendation Card -->
                <div class="card" style="text-align:center; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:1.5rem; background:var(--surface-color); border-radius:12px; border-top:4px solid ${recText}; box-shadow:var(--shadow-sm);">
                    <h3 style="color:var(--text-muted); font-size:0.9rem; font-weight:700; margin-bottom:1.2rem; text-transform:uppercase; letter-spacing:0.5px;">
                        ${isAr ? 'التوصية النهائية للتوظيف' : 'Hiring Recommendation'}
                    </h3>
                    <div style="background: ${recBg}; color: ${recText}; padding: 0.6rem 1.4rem; border-radius: 30px; font-weight: 800; font-size:1.05rem; display:inline-flex; align-items:center; gap:0.5rem; margin-bottom:0.5rem;">
                        <i class="fas ${rec.includes('no_hire') ? 'fa-user-times' : 'fa-user-check'}"></i>
                        <span>${recommendationLabel}</span>
                    </div>
                    ${ev.confidence_score !== undefined ? `
                        <div style="font-size:0.8rem; color:var(--text-muted); margin-top:0.4rem;">
                            ${isAr ? 'معدل ثقة الذكاء الاصطناعي:' : 'AI Confidence Score:'} <strong>${ev.confidence_score > 1 ? ev.confidence_score : Math.round(ev.confidence_score * 100)}%</strong>
                        </div>
                    ` : ''}
                </div>

                <!-- Recruiter Notes / Comments Card -->
                <div class="card" style="padding:1.5rem; background:var(--surface-color); border-radius:12px; display:flex; flex-direction:column; justify-content:space-between; border-top:4px solid var(--primary-color); box-shadow:var(--shadow-sm);">
                    <h3 style="margin-bottom:0.6rem; color:var(--primary-color); font-weight:750; font-size:1rem; display:flex; align-items:center; gap:0.4rem;">
                        <i class="fas fa-comment-dots"></i> ${isAr ? 'ملاحظات المقابل البشري' : 'Interviewer Remarks'}
                    </h3>
                    <textarea id="eval-notes" class="form-control" style="height:70px; resize:none; font-size:0.85rem; line-height:1.5; margin-bottom:0.6rem; padding: 0.5rem;" 
                        placeholder="${isAr ? 'اضف ملاحظاتك وتقييمك الشخصي للمرشح هنا...' : 'Add your custom interview notes and feedback here...'}">${notesText}</textarea>
                    <button id="save-notes-btn" class="btn btn-primary" style="align-self:flex-end; display:flex; align-items:center; gap:0.4rem; padding:0.35rem 0.8rem; font-size:0.8rem; border-radius:6px;">
                        <i class="fas fa-save"></i> ${isAr ? 'حفظ الملاحظات' : 'Save Remarks'}
                    </button>
                </div>
            </div>

            <!-- Row 3: Executive Summary & Detailed Performance (2-Column Grid with Scroll Limits) -->
            <div class="eval-two-col-grid">
                
                <!-- Left Card: AI Executive Summary -->
                <div class="card" style="padding:1.5rem; background:var(--surface-color); border-radius:12px; border-inline-start:4px solid var(--primary-color); box-shadow:var(--shadow-sm); display:flex; flex-direction:column;">
                    <h3 style="margin-bottom:1rem; color:var(--primary-color); font-weight:800; font-size:1.15rem; display:flex; align-items:center; gap:0.4rem; border-bottom:1px solid var(--border-color); padding-bottom:0.6rem; flex-shrink:0;">
                        <i class="fas fa-file-invoice"></i> ${isAr ? 'الملخص التنفيذي للذكاء الاصطناعي' : 'AI Executive Evaluation Summary'}
                    </h3>
                    <div class="scrollable-card-body" style="flex-grow:1;">
                        <p style="line-height:1.7; color:var(--text-main); font-size:0.92rem; text-align:justify; margin:0;">
                            ${ev.executive_summary || (isAr ? 'لا يوجد ملخص متاح.' : 'No executive summary available.')}
                        </p>
                    </div>
                </div>

                <!-- Right Card: Competency Performance Breakdown (Scrollable) -->
                <div class="card" style="padding:1.5rem; border-radius:12px; background:var(--surface-color); border-top: 4px solid var(--primary-color); box-shadow:var(--shadow-sm); display:flex; flex-direction:column;">
                    <h3 style="margin-bottom:1rem; color:var(--primary-color); font-weight:800; font-size:1.15rem; display:flex; align-items:center; gap:0.4rem; border-bottom:1px solid var(--border-color); padding-bottom:0.6rem; flex-shrink:0;">
                        <i class="fas fa-list-check"></i> ${isAr ? 'التحليل التفصيلي لمعايير التقييم' : 'Competency Performance Breakdown'}
                    </h3>
                    <div class="scrollable-card-body" style="flex-grow:1;">
                        ${competencyHtml}
                    </div>
                </div>
            </div>

            <!-- Row 4: Key Strengths & Areas for Improvement (Side-by-Side Scrollable Card Bodies) -->
            <div class="eval-two-col-grid">
                
                <!-- Strengths Card -->
                <div class="card" style="border-top: 4px solid #10b981; padding:1.5rem; background:var(--surface-color); border-radius:12px; box-shadow:var(--shadow-sm); display:flex; flex-direction:column;">
                    <h4 style="color: #10b981; margin-bottom: 1rem; font-weight:750; display:flex; align-items:center; gap:0.4rem; font-size:1.1rem; border-bottom:1px solid var(--border-color); padding-bottom:0.6rem; flex-shrink:0;">
                        <i class="fas fa-thumbs-up"></i> ${isAr ? 'نقاط القوة الرئيسية' : 'Key Strengths'}
                    </h4>
                    <div class="scrollable-card-body" style="flex-grow:1;">
                        ${renderBulletList(strengths, true)}
                    </div>
                </div>

                <!-- Weaknesses Card -->
                <div class="card" style="border-top: 4px solid #f43f5e; padding:1.5rem; background:var(--surface-color); border-radius:12px; box-shadow:var(--shadow-sm); display:flex; flex-direction:column;">
                    <h4 style="color: #f43f5e; margin-bottom: 1rem; font-weight:750; display:flex; align-items:center; gap:0.4rem; font-size:1.1rem; border-bottom:1px solid var(--border-color); padding-bottom:0.6rem; flex-shrink:0;">
                        <i class="fas fa-thumbs-down"></i> ${isAr ? 'نقاط الضعف / مجالات التطوير' : 'Areas for Improvement'}
                    </h4>
                    <div class="scrollable-card-body" style="flex-grow:1;">
                        ${renderBulletList(weaknesses, false)}
                    </div>
                </div>
            </div>

            <!-- Row 5: Suggested Questions (Full-width bottom card - Scrollable) -->
            <div class="card" style="padding:1.5rem; border-radius:12px; background:var(--surface-color); border-top:4px solid var(--primary-color); box-shadow:var(--shadow-sm); margin-bottom:2rem; display:flex; flex-direction:column;">
                <h3 style="margin-bottom:1rem; color:var(--primary-color); font-weight:800; font-size:1.15rem; display:flex; align-items:center; gap:0.4rem; border-bottom:1px solid var(--border-color); padding-bottom:0.6rem; flex-shrink:0;">
                    <i class="fas fa-question-circle"></i> ${isAr ? 'أسئلة المتابعة المقترحة للجولات القادمة' : 'Suggested Questions for Next Round'}
                </h3>
                <div class="scrollable-card-body" style="max-height:300px; flex-grow:1;">
                    ${questionsHtml}
                </div>
            </div>
        `;
    }

    mount() {
        if (!this.evaluation) return;
        const isAr = getLang() === 'ar';
        
        const saveBtn = document.getElementById('save-notes-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', async () => {
                const notesValue = document.getElementById('eval-notes').value.trim();
                const originalHtml = saveBtn.innerHTML;
                
                saveBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${isAr ? 'جاري الحفظ...' : 'Saving...'}`;
                saveBtn.disabled = true;

                try {
                    // Send to backend matching the Pydantic schema keys: { notes: { notes: string } }
                    await api.fetch(`/evaluations/${this.evaluation.id}/notes`, {
                        method: 'PATCH',
                        body: JSON.stringify({ notes: { notes: notesValue } })
                    });
                    Toast.show(isAr ? 'تم حفظ ملاحظات المقابل بنجاح!' : 'Remarks saved successfully!', 'success');
                } catch (e) {
                    Toast.show(isAr ? 'حدث خطأ أثناء الحفظ.' : 'Error saving remarks.', 'error');
                } finally {
                    saveBtn.innerHTML = originalHtml;
                    saveBtn.disabled = false;
                }
            });
        }
    }
}
