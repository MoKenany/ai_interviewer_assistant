import { t, getLang } from '../core/i18n.js';
import { api } from '../core/api.js';
import { Toast } from '../components/Toast.js';

export class EvaluationDetailSection {
    constructor(params) {
        this.sessionId = params.sessionId;
        this.evaluation = null;
        this.insights = null;
        this.session = null;
        this.isLoading = false;
    }

    // ─── Data Fetching ────────────────────────────────────────────────────────
    async fetchData() {
        this.isLoading = true;
        try {
            this.session = await api.get(`/sessions/${this.sessionId}`);
            try {
                const appData = await api.get(`/applications/${this.session.application_id}`);
                if (appData && appData.candidate_id) {
                    this.candidate = await api.get(`/candidates/${appData.candidate_id}`);
                }
            } catch (e) {
                console.log("Failed to fetch candidate details.", e);
            }

            if (this.session.pipeline_status !== 'completed') {
                this.evaluation = null;
                this.insights = null;
                return;
            }

            try {
                this.evaluation = await api.get(`/evaluations/session/${this.sessionId}`, null, { silent: true });
            } catch {
                this.evaluation = null;
                this.insights = null;
                return;
            }

            if (this.evaluation?.id) {
                try {
                    this.insights = await api.get(`/evaluations/${this.evaluation.id}/insights`, null, { silent: true });
                } catch {
                    this.insights = null;
                }
            }
        } catch (error) {
            console.error('Evaluation fetch error:', error);
            Toast.show(getLang() === 'ar' ? 'حدث خطأ أثناء جلب التقييم.' : 'Error fetching evaluation.', 'error');
            this.evaluation = null;
        } finally {
            this.isLoading = false;
        }
    }

    // ─── Render ───────────────────────────────────────────────────────────────
    render() {
        return `<div id="eval-detail-container" style="width:100%;">${this._renderInner()}</div>`;
    }

    _renderInner() {
        const isAr = getLang() === 'ar';
        const appId = this.session?.application_id || (this.evaluation && this.evaluation.application_id) || sessionStorage.getItem('current_app_id') || '';
        const returnHash = sessionStorage.getItem('candidate_eval_return');
        const backPath = returnHash || `/applications/${appId}/sessions`;
        
        // Note: We don't remove candidate_eval_return here, let the router or unmount handle it, 
        // otherwise it gets lost on partial re-renders.

        // 1. Loading State
        if (this.isLoading) {
            return `
                <style>
                    @keyframes shimmer {
                        0% { background-position: -200% 0; }
                        100% { background-position: 200% 0; }
                    }
                    .shimmer-box {
                        background: linear-gradient(90deg, var(--bg-secondary) 25%, rgba(0,0,0,0.05) 50%, var(--bg-secondary) 75%);
                        background-size: 200% 100%;
                        animation: shimmer 1.5s infinite;
                        border-radius: 8px;
                    }
                </style>
                <div style="padding:2rem;">
                    <div class="shimmer-box" style="height:40px; width:40%; margin-bottom:2rem;"></div>
                    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:1.5rem; margin-bottom:2rem;">
                        <div class="shimmer-box" style="height:250px;"></div>
                        <div class="shimmer-box" style="height:250px;"></div>
                        <div class="shimmer-box" style="height:250px;"></div>
                    </div>
                    <div class="shimmer-box" style="height:300px; width:100%;"></div>
                </div>
            `;
        }
        
        // 2. Processing / Not Ready State
        if (!this.evaluation) {
            return `
                <div style="text-align: center; padding: 4rem 2rem; background: var(--surface-color, #ffffff); border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.03); border: 1px solid var(--border-color); max-width: 600px; margin: 4rem auto; position:relative; overflow:hidden;">
                    <div style="position:absolute; top:0; left:0; width:100%; height:4px; background:linear-gradient(90deg, var(--primary-color), #00d4a0); opacity:0.8;"></div>
                    <div style="width: 80px; height: 80px; background: rgba(var(--primary-color-rgb, 79,70,229), 0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; position:relative;">
                        <div style="position:absolute; width:100%; height:100%; border-radius:50%; border:2px solid var(--primary-color); border-top-color:transparent; animation:fa-spin 1.5s linear infinite;"></div>
                        <i class="fas fa-brain" style="font-size: 2.2rem; color: var(--primary-color);"></i>
                    </div>
                    <h2 style="font-weight: 800; margin-bottom: 0.8rem; color: var(--text-color); font-size:1.6rem;">${isAr ? 'التقييم قيد المعالجة' : 'Evaluation Processing'}</h2>
                    <p style="color: var(--text-muted); margin-bottom: 2rem; line-height: 1.6; font-size:1.05rem;">
                        ${isAr 
                            ? 'يقوم محرك الذكاء الاصطناعي حالياً بتحليل بيانات الجلسة وإعداد التقرير التفصيلي. يمكنك مراقبة التقدم من خلال لوحة التحكم.' 
                            : 'The AI engine is currently analyzing the session data and generating the detailed report. You can track its progress below.'}
                    </p>
                    <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
                        <button class="btn btn-outline" onclick="window.location.hash='${backPath}'" style="padding:0.7rem 1.4rem; border-radius:8px;">
                            <i class="fas fa-arrow-${isAr ? 'right' : 'left'}"></i> ${isAr ? 'العودة للمقسوم' : 'Go Back'}
                        </button>
                        <button class="btn btn-primary" onclick="window.location.hash='/pipeline/runs/${this.sessionId}'" style="padding:0.7rem 1.4rem; border-radius:8px; box-shadow: 0 4px 15px rgba(var(--primary-color-rgb, 79,70,229), 0.3);">
                            <i class="fas fa-project-diagram"></i> ${isAr ? 'تتبع خط الأنابيب (Pipeline)' : 'Track AI Pipeline'}
                        </button>
                    </div>
                </div>
            `;
        }

        // 3. Main Evaluation Dashboard
        const ev = this.evaluation;
        const confidencePercent = (ev.confidence_score !== null && ev.confidence_score !== undefined)
            ? (ev.confidence_score > 1 ? Math.round(ev.confidence_score) : Math.round(ev.confidence_score * 100))
            : null;
        
        const confidenceExplanation = (typeof ev.interviewer_notes === 'object' && ev.interviewer_notes !== null)
            ? (ev.interviewer_notes.confidence_explanation || ev.interviewer_notes.confidenceExplanation || '')
            : '';
            
        const aiModeText = this.session?.ai_mode || ev.ai_mode || 'normal';
        const aiModeLabels = {
            very_strict: isAr ? 'قاسي جداً' : 'Very Strict',
            strict: isAr ? 'صارم' : 'Strict',
            normal: isAr ? 'طبيعي' : 'Normal',
            lenient: isAr ? 'متساهل' : 'Lenient'
        };
        const selectedAIModeLabel = aiModeLabels[aiModeText] || aiModeText;

        const confidenceSectionHtml = (confidencePercent !== null && confidencePercent < 85 && confidenceExplanation)
            ? `
                <div class="card" style="padding:1rem 1.5rem; background:rgba(245, 158, 11, 0.05); border:1px solid rgba(245, 158, 11, 0.3); border-radius:12px; margin-bottom:1.5rem; display:flex; gap:1rem; align-items:flex-start;">
                    <i class="fas fa-exclamation-triangle" style="color:#f59e0b; font-size:1.5rem; margin-top:0.2rem;"></i>
                    <div>
                        <div style="font-weight:700; margin-bottom:0.4rem; color:#b45309;">
                            ${isAr ? 'ملاحظة: نسبة ثقة الذكاء الاصطناعي منخفضة' : 'Notice: Low AI Confidence'}
                        </div>
                        <div style="color:var(--text-muted); line-height:1.6; font-size:0.9rem;">${confidenceExplanation}</div>
                    </div>
                </div>
            ` : '';
        
        // Merge Insights
        const strengths = (this.insights && this.insights.strengths) || ev.strengths || [];
        const weaknesses = (this.insights && this.insights.weaknesses) || ev.weaknesses || [];
        const interviewerNotesObj = (this.insights && this.insights.interviewer_notes) || ev.interviewer_notes || {};
        const notesText = typeof interviewerNotesObj === 'object' && interviewerNotesObj !== null 
            ? (interviewerNotesObj.notes || interviewerNotesObj.text || '') 
            : (interviewerNotesObj || '');

        // Determine recommendation colors
        let recBg = 'rgba(59, 130, 246, 0.1)';
        let recText = '#3b82f6';
        let recommendationLabel = ev.hiring_recommendation || 'N/A';
        
        const rec = String(ev.hiring_recommendation).toLowerCase();
        if (rec.includes('strongly_recommend') || rec.includes('strong_hire')) {
            recBg = 'rgba(16, 185, 129, 0.1)'; recText = '#10b981';
            recommendationLabel = isAr ? 'توظيف مؤكد (Strong Hire)' : 'Strong Hire';
        } else if (rec.includes('do_not_recommend') || rec.includes('no_hire') || rec.includes('strong_no_hire')) {
            recBg = 'rgba(244, 63, 94, 0.1)'; recText = '#f43f5e';
            recommendationLabel = rec.includes('strong_no_hire') || rec.includes('do_not_recommend')
                ? (isAr ? 'رفض قاطع (Strong No Hire)' : 'Strong No Hire')
                : (isAr ? 'استبعاد (No Hire)' : 'No Hire');
        } else if (rec.includes('recommend') || rec.includes('hire')) {
            recBg = 'rgba(20, 184, 166, 0.1)'; recText = '#14b8a6';
            recommendationLabel = isAr ? 'توظيف (Hire)' : 'Hire';
        } else if (rec.includes('neutral') || rec.includes('review')) {
            recBg = 'rgba(245, 158, 11, 0.1)'; recText = '#f59e0b';
            recommendationLabel = isAr ? 'مراجعة (Neutral / Review)' : 'Neutral / Review';
        }

        // Render Lists helper
        const renderBulletList = (items, isStrength = true) => {
            if (!items || !items.length) {
                return `<div style="color:var(--text-muted); text-align:center; padding: 2.5rem 0; font-style:italic;">${isAr ? 'لا توجد نقاط مسجلة.' : 'No items recorded.'}</div>`;
            }
            const iconColor = isStrength ? '#10b981' : '#f43f5e';
            const iconClass = isStrength ? 'fa-check-circle' : 'fa-exclamation-circle';
            
            return items.map(item => {
                let parsedItem = item;
                if (typeof item === 'string') {
                    try { parsedItem = JSON.parse(item); } catch (e) { parsedItem = item; }
                }
                
                if (typeof parsedItem === 'object' && parsedItem !== null) {
                    const criterion = parsedItem.criterion || parsedItem.point || parsedItem.strength || parsedItem.weakness || parsedItem.text || '';
                    const desc = parsedItem.description || parsedItem.reason || '';
                    const extra = isStrength ? (parsedItem.evidence_quote || '') : (parsedItem.gap_analysis || '');
                    
                    return `
                        <div style="margin-bottom: 1.2rem; line-height: 1.6; display:flex; align-items:start; gap:0.75rem; border-bottom: 1px solid var(--border-color); padding-bottom: 1rem; transition: background 0.2s;">
                            <span style="margin-top:3px; flex-shrink:0;"><i class="fas ${iconClass}" style="color:${iconColor}; font-size:1.2rem;"></i></span>
                            <div style="flex-grow:1;">
                                <strong style="color: var(--text-color); font-size:1rem; display:block; margin-bottom:0.3rem;">${criterion}</strong>
                                ${desc ? `<p style="font-size:0.9rem; color:var(--text-muted); margin:0; line-height:1.6; text-align:justify;">${desc}</p>` : ''}
                                ${extra ? `
                                    <div style="font-size:0.85rem; color: var(--text-main); margin-top:0.6rem; background:rgba(0,0,0,0.02); padding:0.75rem; border-radius:8px; border-inline-start:3px solid ${iconColor}; line-height:1.5;">
                                        <strong style="color:${iconColor}; display:block; margin-bottom:0.25rem; font-size:0.75rem; text-transform:uppercase;">
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
                    <div style="margin-bottom: 0.8rem; line-height: 1.6; display:flex; align-items:start; gap:0.6rem; color:var(--text-main);">
                        <span style="margin-top:4px; flex-shrink:0;"><i class="fas ${iconClass}" style="color:${iconColor}; font-size:1.1rem;"></i></span>
                        <span style="font-size:0.95rem;">${parsedItem}</span>
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
            ? competencies.map((c, i) => {
                const name = c.criterion_name || c.competency || c.criteria || c.name || (isAr ? 'معيار تقييم' : 'Criteria');
                const score = c.score !== undefined ? c.score : (c.rating !== undefined ? c.rating : 0);
                const reasoning = c.justification || c.reasoning || c.feedback || '';
                // Staggered animation delay
                const delay = i * 0.1;
                return `
                    <div style="background:var(--bg-primary, #ffffff); border:1px solid var(--border-color); border-radius:10px; padding:1.2rem; margin-bottom:1rem; box-shadow:0 2px 5px rgba(0,0,0,0.02);">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.6rem; font-weight:700; color:var(--text-color);">
                            <span style="font-size:0.95rem;">${name}</span>
                            <span style="color:var(--primary-color); font-size:1.05rem; font-weight:800;">${score}<span style="font-size:0.75rem; color:var(--text-muted);">/100</span></span>
                        </div>
                        <div style="width:100%; height:8px; background:var(--bg-secondary, #e2e8f0); border-radius:4px; overflow:hidden; margin-bottom:0.75rem;">
                            <div style="width:0; height:100%; background:linear-gradient(90deg, var(--primary-color), #00d4a0); border-radius:4px; animation: fillBar 1s ease-out ${delay}s forwards; --target-width: ${score}%;" data-width="${score}%"></div>
                        </div>
                        ${reasoning ? `<p style="font-size:0.85rem; color:var(--text-muted); margin:0; line-height:1.6;">${reasoning}</p>` : ''}
                    </div>
                `;
            }).join('')
            : `<div style="text-align:center; padding:3rem 1rem; color:var(--text-muted); border:1px dashed var(--border-color); border-radius:12px; background:rgba(0,0,0,0.01);">${isAr ? 'لا يوجد تحليل تفصيلي للمعايير متاح.' : 'No detailed competency analysis available.'}</div>`;

        // Render AI Suggested Questions
        const questions = ev.suggested_questions || [];
        const questionsHtml = questions.length > 0
            ? questions.map((q, idx) => {
                if (typeof q === 'object' && q !== null) {
                    const quest = q.question || q.text || JSON.stringify(q);
                    const purpose = q.purpose || q.intent || '';
                    const expected = q.expected_answer || q.criteria || '';
                    return `
                        <div style="margin-bottom:1rem; border-inline-start:4px solid var(--primary-color); padding:1.2rem; background:rgba(var(--primary-color-rgb, 79,70,229), 0.03); border-radius:0 8px 8px 0;">
                            <div style="font-weight:700; color:var(--text-color); margin-bottom:0.5rem; display:flex; gap:0.6rem; align-items:start; font-size:1rem; line-height:1.5;">
                                <span style="background:var(--primary-color); color:white; width:24px; height:24px; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; font-size:0.8rem; flex-shrink:0; margin-top:2px;">${idx + 1}</span>
                                <span>${quest}</span>
                            </div>
                            ${purpose ? `<p style="font-size:0.85rem; color:var(--text-muted); margin:0.4rem 0 0 2rem; line-height:1.5;"><strong style="color:var(--text-color);">${isAr ? 'الهدف:' : 'Purpose:'}</strong> ${purpose}</p>` : ''}
                            ${expected ? `<p style="font-size:0.85rem; color:var(--text-muted); margin:0.4rem 0 0 2rem; line-height:1.5;"><strong style="color:var(--text-color);">${isAr ? 'الإجابة المتوقعة:' : 'Expected Response:'}</strong> ${expected}</p>` : ''}
                        </div>
                    `;
                }
                return `
                    <div style="margin-bottom:0.8rem; border-inline-start:4px solid var(--primary-color); padding:1rem; display:flex; gap:0.6rem; align-items:center; background:rgba(var(--primary-color-rgb, 79,70,229), 0.03); border-radius:0 8px 8px 0;">
                        <span style="background:var(--primary-color); color:white; width:24px; height:24px; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; font-size:0.8rem; flex-shrink:0;">${idx + 1}</span>
                        <span style="font-weight:600; color:var(--text-color); font-size:0.95rem;">${q}</span>
                    </div>
                `;
            }).join('')
            : `<div style="text-align:center; padding:3rem 1rem; color:var(--text-muted); border:1px dashed var(--border-color); border-radius:12px; background:rgba(0,0,0,0.01);">${isAr ? 'لا توجد أسئلة مقترحة للجولات القادمة.' : 'No suggested follow-up questions.'}</div>`;

        return `
            <style>
                @keyframes fillBar {
                    from { width: 0; }
                    to { width: var(--target-width); }
                }
                
                /* Modern Thin Scrollbar for internal elements */
                .eval-scrollable {
                    max-height: 450px;
                    overflow-y: auto;
                    padding-inline-end: 0.75rem;
                }
                .eval-scrollable::-webkit-scrollbar { width: 6px; }
                .eval-scrollable::-webkit-scrollbar-track { background: transparent; }
                .eval-scrollable::-webkit-scrollbar-thumb { background-color: rgba(0,0,0,0.15); border-radius: 20px; }
                .eval-scrollable::-webkit-scrollbar-thumb:hover { background-color: rgba(0,0,0,0.25); }

                .eval-metrics-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                    gap: 1.5rem;
                    margin-bottom: 2rem;
                }
                .eval-two-col-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
                    gap: 1.5rem;
                    margin-bottom: 2rem;
                    align-items: stretch;
                }
                @media (max-width: 768px) {
                    .eval-two-col-grid { grid-template-columns: 1fr; }
                    .eval-scrollable { max-height: none; overflow: visible; padding-inline-end: 0; }
                }
                
                .glowing-circle {
                    box-shadow: 0 0 20px rgba(var(--primary-color-rgb, 79,70,229), 0.15);
                    transition: transform 0.3s ease, box-shadow 0.3s ease;
                }
                .glowing-circle:hover {
                    transform: scale(1.05);
                    box-shadow: 0 0 30px rgba(var(--primary-color-rgb, 79,70,229), 0.3);
                }

                @media print {
                    body * { visibility: hidden !important; }
                    #eval-detail-container, #eval-detail-container * { visibility: visible !important; }
                    #eval-detail-container { position: absolute !important; left: 0; top: 0; width: 100% !important; }
                    .no-print, .btn, button, #download-pdf-btn { display: none !important; }
                    .eval-scrollable { max-height: none !important; overflow: visible !important; }
                    .eval-metrics-grid, .eval-two-col-grid { display: block !important; }
                    .card { page-break-inside: avoid !important; box-shadow: none !important; border:1px solid #ccc !important; margin-bottom:20px !important;}
                }
            </style>

            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:2rem; border-bottom:1px solid var(--border-color); padding-bottom:1.5rem; flex-wrap:wrap; gap:1.5rem;">
                <div>
                    <h1 style="color:var(--primary-color); font-weight:800; font-size:1.8rem; margin:0 0 0.5rem 0; display:flex; align-items:center; gap:0.6rem;">
                        <i class="fas fa-robot"></i> ${isAr ? 'تقرير تقييم المقابلة بالذكاء الاصطناعي' : 'AI Interview Evaluation Report'}
                    </h1>
                    <div style="display:flex; gap:1rem; color:var(--text-muted); font-size:0.9rem; flex-wrap:wrap;">
                        <span style="background:var(--bg-secondary); padding:0.3rem 0.6rem; border-radius:6px; border:1px solid var(--border-color);">
                            ${isAr ? 'رقم الجلسة:' : 'Session ID:'} <strong>${this.sessionId}</strong>
                        </span>
                        <span style="background:var(--bg-secondary); padding:0.3rem 0.6rem; border-radius:6px; border:1px solid var(--border-color);">
                            ${isAr ? 'رقم التقرير:' : 'Evaluation ID:'} <strong>${ev.id}</strong>
                        </span>
                    </div>
                </div>
                <div class="no-print" style="display:flex; gap:0.75rem; flex-wrap:wrap; align-items:center;">
                    <button class="btn btn-outline" onclick="window.location.hash='${backPath}'" style="display:flex; align-items:center; gap:0.5rem; padding:0.6rem 1rem; border-radius:8px;">
                        <i class="fas fa-arrow-${isAr ? 'right' : 'left'}"></i> ${isAr ? 'العودة' : 'Back'}
                    </button>
                    <button id="download-pdf-btn" class="btn btn-primary" style="display:flex; align-items:center; gap:0.5rem; padding:0.6rem 1.2rem; border-radius:8px; box-shadow: 0 4px 12px rgba(var(--primary-color-rgb, 79,70,229), 0.2);">
                        <i class="fas fa-file-pdf"></i> ${isAr ? 'تنزيل التقرير' : 'Download PDF'}
                    </button>
                </div>
            </div>
            
            ${(() => {
                if (!this.candidate) return '';
                const c = this.candidate;
                const phoneHtml = c.phone ? `<span style="background:var(--bg-secondary); padding:0.3rem 0.6rem; border-radius:6px; border:1px solid var(--border-color); display:inline-flex; align-items:center; gap:0.4rem;"><i class="fas fa-phone" style="color:var(--text-muted);"></i> <strong>${c.phone}</strong></span>` : '';
                const linkedInHtml = c.linkedin_url ? `<span style="background:var(--bg-secondary); padding:0.3rem 0.6rem; border-radius:6px; border:1px solid var(--border-color); display:inline-flex; align-items:center; gap:0.4rem;"><i class="fab fa-linkedin" style="color:#0a66c2;"></i> <a href="${c.linkedin_url}" target="_blank" style="color:var(--primary-color); text-decoration:none;"><strong>LinkedIn</strong></a></span>` : '';
                const githubHtml = c.github_url ? `<span style="background:var(--bg-secondary); padding:0.3rem 0.6rem; border-radius:6px; border:1px solid var(--border-color); display:inline-flex; align-items:center; gap:0.4rem;"><i class="fab fa-github" style="color:var(--text-color);"></i> <a href="${c.github_url}" target="_blank" style="color:var(--primary-color); text-decoration:none;"><strong>GitHub</strong></a></span>` : '';
                const sourceHtml = c.source ? `<span style="background:var(--bg-secondary); padding:0.3rem 0.6rem; border-radius:6px; border:1px solid var(--border-color); display:inline-flex; align-items:center; gap:0.4rem;"><i class="fas fa-bullhorn" style="color:var(--text-muted);"></i> <span>${isAr ? 'المصدر:' : 'Source:'} <strong>${c.source}</strong></span></span>` : '';

                return `
                    <div class="card" style="padding:1.5rem; background:var(--bg-card); border-radius:12px; margin-bottom:1.5rem; border:1px solid var(--border-color); box-shadow:var(--shadow-sm);">
                        <div style="display:flex; align-items:center; gap:1rem; margin-bottom:1rem;">
                            <div style="width:50px; height:50px; background:linear-gradient(135deg, var(--primary-color), #00d4a0); color:white; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:1.5rem; font-weight:800; flex-shrink:0;">
                                ${(c.full_name || '?').charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h2 style="margin:0; font-size:1.3rem; color:var(--text-color); font-weight:700;">${c.full_name}</h2>
                                <div style="color:var(--text-muted); font-size:0.95rem; display:flex; align-items:center; gap:0.4rem; margin-top:0.2rem;">
                                    <i class="fas fa-envelope"></i> ${c.email}
                                </div>
                            </div>
                        </div>
                        <div style="display:flex; gap:0.8rem; flex-wrap:wrap; font-size:0.85rem; color:var(--text-main);">
                            ${phoneHtml}
                            ${linkedInHtml}
                            ${githubHtml}
                            ${sourceHtml}
                        </div>
                    </div>
                `;
            })()}

            ${confidenceSectionHtml}

            <div class="eval-metrics-grid">
                
                <div class="card" style="text-align:center; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:2rem 1.5rem; background:var(--bg-card); border-radius:16px; border-top:5px solid var(--primary-color); box-shadow:var(--shadow-sm);">
                    <h3 style="color:var(--text-muted); font-size:0.95rem; font-weight:700; margin:0 0 1.5rem 0; text-transform:uppercase; letter-spacing:0.5px;">
                        ${isAr ? 'النتيجة الإجمالية' : 'Overall Score'}
                    </h3>
                    <div class="glowing-circle" style="position:relative; width:130px; height:130px; display:flex; align-items:center; justify-content:center; background:radial-gradient(circle, var(--bg-card) 68%, transparent 69%), conic-gradient(var(--primary-color) ${ev.overall_score || 0}%, var(--border-color) 0); border-radius:50%; margin-bottom:0.5rem;">
                        <span style="font-size:2.5rem; font-weight:800; color:var(--text-color);">${ev.overall_score || 0}</span>
                        <span style="font-size:0.8rem; color:var(--text-muted); position:absolute; bottom:24px;">/ 100</span>
                    </div>
                </div>

                <div class="card" style="text-align:center; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:2rem 1.5rem; background:var(--bg-card); border-radius:16px; border-top:5px solid ${recText}; box-shadow:var(--shadow-sm);">
                    <h3 style="color:var(--text-muted); font-size:0.95rem; font-weight:700; margin:0 0 1.5rem 0; text-transform:uppercase; letter-spacing:0.5px;">
                        ${isAr ? 'التوصية النهائية' : 'Hiring Recommendation'}
                    </h3>
                    <div style="background: ${recBg}; color: ${recText}; padding: 0.8rem 1.5rem; border-radius: 30px; font-weight: 800; font-size:1.1rem; display:inline-flex; align-items:center; gap:0.6rem; margin-bottom:1rem;">
                        <i class="fas ${rec.includes('no_hire') ? 'fa-user-times' : 'fa-user-check'}"></i>
                        <span>${recommendationLabel}</span>
                    </div>
                    <div style="background:var(--bg-secondary); padding:0.5rem 1rem; border-radius:8px; font-size:0.85rem; color:var(--text-main);">
                        ${isAr ? 'وضع التقييم:' : 'Evaluation Mode:'} <strong>${selectedAIModeLabel}</strong>
                    </div>
                    ${confidencePercent !== null ? `
                        <div style="margin-top:0.6rem; font-size:0.85rem; color:var(--text-muted);">
                            ${isAr ? 'نسبة ثقة الـ AI:' : 'AI Confidence:'} <strong>${confidencePercent}%</strong>
                        </div>
                    ` : ''}
                </div>

                <div class="card" style="padding:1.5rem; background:var(--bg-card); border-radius:16px; display:flex; flex-direction:column; justify-content:space-between; border-top:5px solid var(--primary-color); box-shadow:var(--shadow-sm);">
                    <h3 style="margin:0 0 1rem 0; color:var(--primary-color); font-weight:750; font-size:1.05rem; display:flex; align-items:center; gap:0.5rem;">
                        <i class="fas fa-edit"></i> ${isAr ? 'ملاحظات المقابل البشري' : 'Interviewer Remarks'}
                    </h3>
                    <textarea id="eval-notes" class="form-control" style="flex-grow:1; resize:none; font-size:0.9rem; line-height:1.6; margin-bottom:1rem; padding: 0.75rem; border-radius:8px; background:var(--bg-secondary); border:1px solid var(--border-color);" 
                        placeholder="${isAr ? 'اضف ملاحظاتك وتقييمك الشخصي للمرشح هنا...' : 'Add your custom interview notes and feedback here...'}">${notesText}</textarea>
                    <button id="save-notes-btn" class="btn btn-primary" style="width:100%; display:flex; justify-content:center; align-items:center; gap:0.5rem; padding:0.6rem; font-size:0.9rem; border-radius:8px; font-weight:600;">
                        <i class="fas fa-save"></i> <span>${isAr ? 'حفظ الملاحظات' : 'Save Remarks'}</span>
                    </button>
                </div>
            </div>

            <div class="eval-two-col-grid">
                
                <div class="card" style="padding:0; background:var(--bg-card); border-radius:16px; border:1px solid var(--border-color); overflow:hidden; display:flex; flex-direction:column; box-shadow:var(--shadow-sm);">
                    <div style="padding:1.2rem 1.5rem; background:rgba(var(--primary-color-rgb, 79,70,229), 0.05); border-bottom:1px solid var(--border-color);">
                        <h3 style="margin:0; color:var(--primary-color); font-weight:800; font-size:1.15rem; display:flex; align-items:center; gap:0.5rem;">
                            <i class="fas fa-file-invoice"></i> ${isAr ? 'الملخص التنفيذي' : 'Executive Summary'}
                        </h3>
                    </div>
                    <div class="eval-scrollable" style="padding:1.5rem; flex-grow:1;">
                        <p style="line-height:1.8; color:var(--text-main); font-size:0.95rem; text-align:justify; margin:0;">
                            ${ev.executive_summary || (isAr ? 'لا يوجد ملخص متاح.' : 'No executive summary available.')}
                        </p>
                    </div>
                </div>

                <div class="card" style="padding:0; background:var(--bg-card); border-radius:16px; border:1px solid var(--border-color); overflow:hidden; display:flex; flex-direction:column; box-shadow:var(--shadow-sm);">
                    <div style="padding:1.2rem 1.5rem; background:rgba(var(--primary-color-rgb, 79,70,229), 0.05); border-bottom:1px solid var(--border-color);">
                        <h3 style="margin:0; color:var(--primary-color); font-weight:800; font-size:1.15rem; display:flex; align-items:center; gap:0.5rem;">
                            <i class="fas fa-list-check"></i> ${isAr ? 'التحليل التفصيلي للمعايير' : 'Competency Breakdown'}
                        </h3>
                    </div>
                    <div class="eval-scrollable" style="padding:1.5rem; flex-grow:1;">
                        ${competencyHtml}
                    </div>
                </div>
            </div>

            <div class="eval-two-col-grid">
                
                <div class="card" style="padding:0; background:var(--bg-card); border-radius:16px; border:1px solid var(--border-color); overflow:hidden; display:flex; flex-direction:column; box-shadow:var(--shadow-sm);">
                    <div style="padding:1.2rem 1.5rem; background:rgba(16, 185, 129, 0.05); border-bottom:1px solid var(--border-color);">
                        <h4 style="margin:0; color: #10b981; font-weight:800; font-size:1.15rem; display:flex; align-items:center; gap:0.5rem;">
                            <i class="fas fa-arrow-trend-up"></i> ${isAr ? 'نقاط القوة الرئيسية' : 'Key Strengths'}
                        </h4>
                    </div>
                    <div class="eval-scrollable" style="padding:1.5rem; flex-grow:1;">
                        ${renderBulletList(strengths, true)}
                    </div>
                </div>

                <div class="card" style="padding:0; background:var(--bg-card); border-radius:16px; border:1px solid var(--border-color); overflow:hidden; display:flex; flex-direction:column; box-shadow:var(--shadow-sm);">
                    <div style="padding:1.2rem 1.5rem; background:rgba(244, 63, 94, 0.05); border-bottom:1px solid var(--border-color);">
                        <h4 style="margin:0; color: #f43f5e; font-weight:800; font-size:1.15rem; display:flex; align-items:center; gap:0.5rem;">
                            <i class="fas fa-arrow-trend-down"></i> ${isAr ? 'مجالات التطوير المطلوبة' : 'Areas for Improvement'}
                        </h4>
                    </div>
                    <div class="eval-scrollable" style="padding:1.5rem; flex-grow:1;">
                        ${renderBulletList(weaknesses, false)}
                    </div>
                </div>
            </div>

            <div class="card" style="padding:0; background:var(--bg-card); border-radius:16px; border:1px solid var(--border-color); overflow:hidden; display:flex; flex-direction:column; box-shadow:var(--shadow-sm); margin-bottom:2rem;">
                <div style="padding:1.2rem 1.5rem; background:rgba(var(--primary-color-rgb, 79,70,229), 0.05); border-bottom:1px solid var(--border-color);">
                    <h3 style="margin:0; color:var(--primary-color); font-weight:800; font-size:1.15rem; display:flex; align-items:center; gap:0.5rem;">
                        <i class="fas fa-clipboard-question"></i> ${isAr ? 'أسئلة المتابعة المقترحة' : 'Suggested Follow-up Questions'}
                    </h3>
                </div>
                <div class="eval-scrollable" style="padding:1.5rem; max-height:350px; flex-grow:1;">
                    ${questionsHtml}
                </div>
            </div>

            <script>
                setTimeout(() => {
                    document.querySelectorAll('[data-width]').forEach(el => {
                        el.style.width = el.getAttribute('data-width');
                    });
                }, 100);
            </script>
        `;
    }

    // ─── Actions & Handlers ───────────────────────────────────────────────────
    async openPdfReport(isAr) {
        const reportWindow = window.open('', '_blank');
        if (!reportWindow) {
            Toast.show(isAr ? 'يرجى السماح بالنوافذ المنبثقة (Pop-ups) للوصول إلى التقرير.' : 'Please allow pop-ups to open the report.', 'error');
            return;
        }
        
        // Polished loading screen for PDF window
        reportWindow.document.write(`
            <html>
                <body style="font-family: system-ui, -apple-system, sans-serif; display:flex; align-items:center; justify-content:center; height:100vh; background:#f8fafc; color:#334155; margin:0;">
                    <div style="text-align:center;">
                        <div style="width:50px; height:50px; border:3px solid #cbd5e1; border-top-color:#4f46e5; border-radius:50%; animation:spin 1s linear infinite; margin:0 auto 20px;"></div>
                        <h2 style="margin:0; font-weight:600;">${isAr ? 'جاري تحضير تقرير الـ PDF...' : 'Generating PDF Report...'}</h2>
                        <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
                    </div>
                </body>
            </html>
        `);

        try {
            const htmlReport = await api.fetch(`/evaluations/${this.evaluation.id}/report?lang=${isAr ? 'ar' : 'en'}`);
            reportWindow.document.open();
            reportWindow.document.write(htmlReport);
            reportWindow.document.close();
            reportWindow.focus();
        } catch (error) {
            reportWindow.close();
            console.error('PDF fetch error:', error);
            Toast.show(isAr ? 'حدث خطأ أثناء تحميل التقرير.' : 'Error loading report.', 'error');
        }
    }

    // ─── Mount ────────────────────────────────────────────────────────────────
    mount() {
        if (!this.evaluation && !this.isLoading) return;
        const isAr = getLang() === 'ar';

        const downloadBtn = document.getElementById('download-pdf-btn');
        if (downloadBtn) {
            // Prevent multiple bindings if mounted multiple times
            downloadBtn.replaceWith(downloadBtn.cloneNode(true));
            document.getElementById('download-pdf-btn').addEventListener('click', () => this.openPdfReport(isAr));
        }

        const saveBtn = document.getElementById('save-notes-btn');
        if (saveBtn) {
            saveBtn.replaceWith(saveBtn.cloneNode(true));
            document.getElementById('save-notes-btn').addEventListener('click', async (e) => {
                const btn = e.currentTarget;
                const notesValue = document.getElementById('eval-notes').value.trim();
                const originalHtml = btn.innerHTML;
                
                btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> <span>${isAr ? 'جاري الحفظ...' : 'Saving...'}</span>`;
                btn.disabled = true;

                try {
                    await api.fetch(`/evaluations/${this.evaluation.id}/notes`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ notes: { notes: notesValue } })
                    });
                    Toast.show(isAr ? 'تم حفظ ملاحظاتك بنجاح!' : 'Remarks saved successfully!', 'success');
                    
                    // Update local state so it persists on re-render
                    if (!this.evaluation.interviewer_notes) this.evaluation.interviewer_notes = {};
                    this.evaluation.interviewer_notes.notes = notesValue;
                    
                } catch (err) {
                    console.error('Save notes error:', err);
                    Toast.show(isAr ? 'حدث خطأ أثناء حفظ الملاحظات.' : 'Error saving remarks.', 'error');
                } finally {
                    btn.innerHTML = originalHtml;
                    btn.disabled = false;
                }
            });
        }
    }

    // ─── DOM Partial Re-render ────────────────────────────────────────────────
    async refresh() {
        await this.fetchData();
        const container = document.getElementById('eval-detail-container');
        if (container) {
            container.innerHTML = this._renderInner();
            this.mount();
        }
    }
}
