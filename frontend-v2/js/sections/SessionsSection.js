import { t, getLang } from '../core/i18n.js';
import { api } from '../core/api.js';
import { PipelinePoller } from '../core/poller.js';
import { Modal } from '../components/Modal.js';
import { Toast } from '../components/Toast.js';

export class SessionsSection {
    constructor(params) {
        this.appId = params.appId;
        this.sessions = [];
        this.application = null;
        this.pollers = new Map();
        this.disposed = false;
        this.isLoading = false;
    }

    // ─── Data Fetching ────────────────────────────────────────────────────────
    async fetchData() {
        this.isLoading = true;
        try {
            if (this.appId) {
                sessionStorage.setItem('current_app_id', this.appId);
            }
            const [data, application] = await Promise.all([
                api.get(`/sessions?application_id=${this.appId}`),
                api.get(`/applications/${this.appId}`)
            ]);
            this.sessions = Array.isArray(data) ? data : (data.items || []);
            this.application = application;
            if (application?.job_version_id) {
                sessionStorage.setItem('current_version_id', application.job_version_id);
            }
            
            // Sort by latest first
            this.sessions.sort((a, b) => b.id - a.id);
        } catch (error) {
            console.error('Sessions fetch error:', error);
            Toast.show(getLang() === 'ar' ? 'فشل في تحميل الجلسات' : 'Failed to load sessions', 'error');
            this.sessions = [];
            this.application = null;
        } finally {
            this.isLoading = false;
        }
    }

    // ─── UI Helpers ───────────────────────────────────────────────────────────
    _statusBadge(status, sessionId) {
        const isAr = getLang() === 'ar';
        const s = (status || 'unknown').toLowerCase();
        
        let bg = 'rgba(100,116,139,0.1)', color = '#64748b', icon = 'fa-circle', text = status;

        if (s.includes('pending')) {
            bg = 'rgba(245,158,11,0.1)'; color = '#f59e0b'; icon = 'fa-clock';
            text = isAr ? 'قيد الانتظار' : 'Pending';
        } else if (s.includes('running') || s.includes('progress')) {
            bg = 'rgba(59,130,246,0.1)'; color = '#3b82f6'; icon = 'fa-spinner fa-spin';
            text = isAr ? 'جاري المعالجة' : 'Running';
        } else if (s.includes('completed') || s.includes('done')) {
            bg = 'rgba(16,185,129,0.1)'; color = '#10b981'; icon = 'fa-check-circle';
            text = isAr ? 'مكتمل' : 'Completed';
        } else if (s.includes('fail') || s.includes('error')) {
            bg = 'rgba(239,68,68,0.1)'; color = '#ef4444'; icon = 'fa-exclamation-triangle';
            text = isAr ? 'فشل' : 'Failed';
        }

        if (!isAr && text === status) {
            text = text.charAt(0).toUpperCase() + text.slice(1);
        }

        let stopButton = '';
        if (s === 'running') {
            stopButton = `
                <button class="btn btn-outline stop-pipeline-btn" data-id="${sessionId}"
                     style="padding: 0.2rem 0.5rem; font-size: 0.75rem; color: #ef4444; border-color: rgba(239,68,68,0.3); border-radius: 6px; margin-inline-start: 0.5rem; display: inline-flex; align-items: center; gap: 0.25rem; background: #fff;"
                     title="${isAr ? 'إيقاف الـ AI' : 'Stop AI Processing'}">
                     <i class="fas fa-stop-circle"></i> <span style="font-weight:600;">${isAr ? 'إيقاف' : 'Stop'}</span>
                </button>
            `;
        }
        
        return `
            <div style="display: inline-flex; align-items: center;">
                <span style="background:${bg}; color:${color}; padding:0.3rem 0.6rem; border-radius:6px; font-size:0.82rem; font-weight:700; display:inline-flex; align-items:center; gap:0.35rem; white-space:nowrap;">
                    <i class="fas ${icon}"></i> ${text}
                </span>
                ${stopButton}
            </div>
        `;
    }

    _aiModeBadge(mode) {
        const isAr = getLang() === 'ar';
        const m = (mode || 'normal').toLowerCase();
        const labels = {
            very_strict: isAr ? 'قاسي جداً' : 'Very Strict',
            strict: isAr ? 'صارم' : 'Strict',
            normal: isAr ? 'طبيعي' : 'Normal',
            lenient: isAr ? 'متساهل' : 'Lenient'
        };
        const text = labels[m] || m;
        return `<span style="background:var(--bg-secondary); color:var(--text-main); padding:0.25rem 0.5rem; border-radius:4px; font-size:0.8rem; border:1px solid var(--border-color);">${text}</span>`;
    }

    _getTypeIcon(type) {
        const t = (type || '').toLowerCase();
        if (t.includes('screening')) return `<i class="fas fa-filter" style="color:#8b5cf6;"></i>`;
        if (t.includes('technical')) return `<i class="fas fa-laptop-code" style="color:#06b6d4;"></i>`;
        if (t.includes('cultural')) return `<i class="fas fa-users" style="color:#f59e0b;"></i>`;
        if (t.includes('final')) return `<i class="fas fa-flag-checkered" style="color:#10b981;"></i>`;
        return `<i class="fas fa-comments" style="color:var(--text-muted);"></i>`;
    }

    // ─── Render ───────────────────────────────────────────────────────────────
    render() {
        return `<div id="sessions-section-container" style="width:100%;">${this._renderInner()}</div>`;
    }

    _renderInner() {
        const isAr = getLang() === 'ar';
        const backVersionId = this.application?.job_version_id || sessionStorage.getItem('current_version_id') || '';
        const backPath = backVersionId ? `/job-versions/${backVersionId}/applications` : '/jobs';
        
        const labels = {
            title: isAr ? "جلسات المقابلة" : "Interview Sessions",
            subtitle: isAr ? `طلب تقديم #${this.appId}` : `Application #${this.appId}`,
            back: isAr ? "العودة للطلبات" : "Back to Applications",
            newSession: isAr ? "جلسة جديدة" : "New Session",
            session: isAr ? "الجلسة" : "Session",
            type: isAr ? "النوع" : "Type",
            aiMode: isAr ? "وضع التقييم" : "AI Mode",
            status: isAr ? "حالة خط المعالجة" : "Pipeline Status",
            media: isAr ? "الوسائط" : "Media",
            actions: isAr ? "الإجراءات" : "Actions",
            noData: isAr ? "لا توجد جلسات مسجلة بعد. أنشئ الجلسة الأولى للبدء!" : "No sessions yet. Create the first interview session!",
            upload: isAr ? "رفع ملف" : "Upload Media",
            viewTranscript: isAr ? "النص المفرغ" : "Transcript",
            viewPipeline: isAr ? "مراقبة المعالجة" : "Pipeline",
            viewEval: isAr ? "التقييم" : "Evaluation"
        };

        let tableRows = '';

        if (this.isLoading) {
            tableRows = Array(4).fill(0).map(() => `
                <tr>
                    ${Array(6).fill(0).map(() => `
                        <td style="padding:1rem;">
                            <div style="height:14px; background:linear-gradient(90deg,var(--bg-secondary) 25%,rgba(0,0,0,0.04) 50%,var(--bg-secondary) 75%); background-size:200% 100%; animation:shimmer 1.5s infinite; border-radius:4px;"></div>
                        </td>
                    `).join('')}
                </tr>
            `).join('');
        } else if (this.sessions.length === 0) {
            tableRows = `
                <tr>
                    <td colspan="6" style="text-align:center; padding:4rem 2rem; color:var(--text-muted);">
                        <div style="width:70px; height:70px; background:rgba(var(--primary-color-rgb,79,70,229),0.1); border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 1rem;">
                            <i class="fas fa-video-slash" style="font-size:2rem; color:var(--primary-color);"></i>
                        </div>
                        <div style="font-size:1.1rem; font-weight:600; color:var(--text-color);">${labels.noData}</div>
                    </td>
                </tr>
            `;
        } else {
            tableRows = this.sessions.map((s, idx) => {
                const rowBg = idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.012)';
                return `
                    <tr style="background:${rowBg}; border-bottom:1px solid var(--border-color); transition: background 0.2s;">
                        <td style="padding:1rem;">
                            <strong style="color:var(--text-main); font-family:monospace; font-size:0.95rem;">Session #${s.id}</strong>
                        </td>
                        <td style="padding:1rem; font-weight:600; color:var(--text-main); display:flex; align-items:center; gap:0.5rem; height: 100%; border-bottom: none;">
                            ${this._getTypeIcon(s.session_type)} 
                            ${isAr ? (s.session_type === 'screening' ? 'فرز' : s.session_type === 'technical' ? 'تقني' : s.session_type === 'final' ? 'نهائي' : s.session_type) : (s.session_type.charAt(0).toUpperCase() + s.session_type.slice(1))}
                        </td>
                        <td style="padding:1rem;">${this._aiModeBadge(s.ai_mode)}</td>
                        <td style="padding:1rem;" data-session-status="${s.id}">
                            ${this._statusBadge(s.pipeline_status, s.id)}
                        </td>
                        <td style="padding:1rem;">
                            <button class="btn btn-outline upload-media-btn" data-id="${s.id}" style="padding:0.35rem 0.6rem; font-size:0.8rem; display:inline-flex; align-items:center; gap:0.4rem; border-radius:6px;" title="${labels.upload}">
                                <i class="fas fa-cloud-upload-alt" style="color:var(--primary-color);"></i> ${labels.upload}
                            </button>
                        </td>
                        <td style="padding:1rem;">
                            <div style="display:flex; gap:0.4rem;">
                                <button class="btn btn-outline view-transcript-btn" data-id="${s.id}" style="padding:0.35rem 0.6rem; border-radius:6px;" title="${labels.viewTranscript}">
                                    <i class="fas fa-file-alt" style="color:#06b6d4;"></i>
                                </button>
                                <button class="btn btn-outline" onclick="window.location.hash='/pipeline/runs/${s.id}'" style="padding:0.35rem 0.6rem; border-radius:6px;" title="${labels.viewPipeline}">
                                    <i class="fas fa-project-diagram" style="color:#8b5cf6;"></i>
                                </button>
                                <button class="btn btn-outline" onclick="window.location.hash='/sessions/${s.id}/evaluation'" style="padding:0.35rem 0.6rem; border-radius:6px;" title="${labels.viewEval}">
                                    <i class="fas fa-star" style="color:#f59e0b;"></i>
                                </button>
                                <button class="btn btn-outline delete-session-btn" data-id="${s.id}" style="padding:0.35rem 0.6rem; color:#ef4444; border-color:rgba(239,68,68,0.3); border-radius:6px;" title="${isAr ? 'حذف' : 'Delete'}">
                                    <i class="fas fa-trash-alt"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        }

        return `
            <style>
                @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
                .sess-table th { background: var(--bg-secondary); color: var(--text-muted); font-size: 0.8rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; padding: 1rem; border-bottom: 2px solid var(--border-color); text-align: ${isAr ? 'right' : 'left'}; white-space: nowrap; }
                .sess-table td { vertical-align: middle; }
                .sess-table tr:hover { background: rgba(var(--primary-color-rgb,79,70,229), 0.02) !important; }
            </style>

            <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:1rem; margin-bottom:2rem;">
                <div>
                    <button class="btn btn-outline" onclick="window.location.hash='${backPath}'" style="margin-bottom:0.75rem; padding:0.4rem 0.8rem; font-size:0.85rem; border-radius:6px; display:inline-flex; align-items:center; gap:0.4rem;">
                        <i class="fas fa-arrow-${isAr ? 'right' : 'left'}"></i> ${labels.back}
                    </button>
                    <h1 style="color:var(--primary-color); font-size:1.8rem; font-weight:800; margin:0; display:flex; align-items:center; gap:0.6rem;">
                        <i class="fas fa-comments" style="opacity:0.8;"></i>${labels.title}
                    </h1>
                    <p style="color:var(--text-muted); margin:0.3rem 0 0; font-size:0.95rem;">${labels.subtitle}</p>
                </div>
                <button id="add-session-btn" class="btn btn-primary" style="display:inline-flex; align-items:center; gap:0.5rem; padding:0.6rem 1.2rem; border-radius:8px; font-weight:600; box-shadow:0 4px 12px rgba(var(--primary-color-rgb,79,70,229), 0.2);">
                    <i class="fas fa-plus"></i> ${labels.newSession}
                </button>
            </div>

            <div class="card" style="border-radius:12px; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,0.04); background:var(--bg-card); border:1px solid var(--border-color); padding:0;">
                <div class="table-responsive" style="overflow-x:auto; width:100%;">
                    <table class="table sess-table" style="width:100%; border-collapse:collapse; margin:0;">
                        <thead>
                            <tr>
                                <th style="width:110px;">${labels.session}</th>
                                <th style="width:140px;">${labels.type}</th>
                                <th style="width:120px;">${labels.aiMode}</th>
                                <th style="width:200px;">${labels.status}</th>
                                <th style="width:130px;">${labels.media}</th>
                                <th style="min-width:180px;">${labels.actions}</th>
                            </tr>
                        </thead>
                        <tbody id="session-tbody">
                            ${tableRows}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    // ─── Mount & Actions ──────────────────────────────────────────────────────
    mount() {
        if (this.disposed) return;
        
        const addBtn = document.getElementById('add-session-btn');
        if (addBtn) {
            // إزالة المستمع القديم قبل إضافة جديد
            if (addBtn._clickHandler) {
                addBtn.removeEventListener('click', addBtn._clickHandler);
            }
            addBtn._clickHandler = () => this._openForm();
            addBtn.addEventListener('click', addBtn._clickHandler);
        }

        const tbody = document.getElementById('session-tbody');
        if (tbody) {
            // إزالة المستمع القديم قبل إضافة جديد
            if (tbody._clickHandler) {
                tbody.removeEventListener('click', tbody._clickHandler);
            }
            tbody._clickHandler = (e) => {
                const del = e.target.closest('.delete-session-btn');
                const upload = e.target.closest('.upload-media-btn');
                const stop = e.target.closest('.stop-pipeline-btn');
                const viewTranscript = e.target.closest('.view-transcript-btn');
                
                if (del) this._deleteSession(del.dataset.id);
                if (upload) this._openUploadModal(upload.dataset.id);
                if (stop) this._stopPipeline(stop.dataset.id);
                if (viewTranscript) this._viewTranscript(viewTranscript.dataset.id);
            };
            tbody.addEventListener('click', tbody._clickHandler);
        }

        // Only start polling if not already started
        this.sessions
            .filter((s) => s.pipeline_status === 'running' || s.pipeline_status === 'progress' || s.pipeline_status === 'pending')
            .forEach((s) => {
                if (!this.pollers.has(String(s.id))) {
                    this._startPipelinePolling(s.id);
                }
            });
    }

    async _stopPipeline(id) {
        const isAr = getLang() === 'ar';
        if (!confirm(isAr ? 'هل أنت متأكد من إيقاف معالجة الـ AI لهذه الجلسة؟' : 'Are you sure you want to stop AI processing for this session?')) return;
        try {
            await api.post(`/sessions/${id}/stop`, {});
            Toast.show(isAr ? 'تم إيقاف معالجة الـ AI بنجاح' : 'AI processing stopped successfully', 'success');
            await this.refresh();
        } catch (e) {
            Toast.show(isAr ? 'خطأ في إيقاف المعالجة' : 'Error stopping AI processing', 'error');
        }
    }

    _formatTranscript(text) {
        const isAr = getLang() === 'ar';
        if (!text || !text.trim()) return `<p style="color:var(--text-muted); font-style:italic; text-align:center; padding:2rem 0;">${isAr ? 'لا يوجد نص مفرغ متاح.' : 'No transcript text available.'}</p>`;
        
        const lines = text.split('\n');
        return lines.map(line => {
            if (!line.trim()) return '';
            const match = line.match(/^([^:]+):(.*)$/);
            if (match) {
                const speaker = match[1].trim();
                const content = match[2].trim();
                const isInterviewer = speaker.toLowerCase().includes('interviewer') || speaker.toLowerCase().includes('ai') || speaker.toLowerCase().includes('speaker 0') || speaker.toLowerCase().includes('system');
                
                const bg = isInterviewer ? 'rgba(79, 70, 229, 0.05)' : 'rgba(16, 185, 129, 0.05)';
                const border = isInterviewer ? 'var(--primary-color)' : '#10b981';
                const icon = isInterviewer ? 'fa-robot' : 'fa-user';
                
                return `
                    <div style="background:${bg}; border-inline-start: 4px solid ${border}; padding: 1rem; margin-bottom: 1rem; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.02);">
                        <strong style="color:${border}; display:flex; align-items:center; gap:0.4rem; margin-bottom:0.4rem; font-size:0.9rem;">
                            <i class="fas ${icon}"></i> ${speaker}
                        </strong>
                        <div style="white-space: pre-wrap; font-size: 0.95rem; color: var(--text-color); line-height:1.6;">${content}</div>
                    </div>
                `;
            }
            return `<p style="white-space: pre-wrap; font-size: 0.95rem; color: var(--text-color); margin-bottom:0.5rem; line-height:1.6;">${line}</p>`;
        }).join('');
    }

    _viewTranscript(id) {
        const isAr = getLang() === 'ar';
        const session = this.sessions.find(s => s.id == id);
        if (!session) return;
        
        let contentHtml = '';
        const sStatus = (session.pipeline_status || '').toLowerCase();
        
        if (sStatus.includes('running') || sStatus.includes('progress')) {
            contentHtml = `
                <div style="text-align:center; padding: 4rem 2rem; color: var(--info);">
                    <i class="fas fa-cog fa-spin" style="font-size: 3rem; margin-bottom: 1.5rem; color:var(--primary-color);"></i>
                    <p style="font-size: 1.1rem; font-weight:600; color:var(--text-main);">${isAr ? 'جاري تفريغ المقابلة نصياً في الخلفية...' : 'AI pipeline is running transcription...'}</p>
                    <p style="font-size: 0.9rem; color:var(--text-muted);">${isAr ? 'قد تستغرق هذه العملية بضع دقائق حسب طول الجلسة.' : 'This might take a few minutes depending on session length.'}</p>
                </div>
            `;
        } else if (sStatus.includes('pending')) {
            contentHtml = `
                <div style="text-align:center; padding: 4rem 2rem; color: var(--warning);">
                    <i class="fas fa-hourglass-half" style="font-size: 3rem; margin-bottom: 1.5rem; color:#f59e0b;"></i>
                    <p style="font-size: 1.1rem; font-weight:600; color:var(--text-main);">${isAr ? 'قيد الانتظار لبدء التفريغ النصي...' : 'Pending transcription in queue...'}</p>
                </div>
            `;
        } else if (sStatus.includes('fail') || sStatus.includes('error')) {
             contentHtml = `
                <div style="text-align:center; padding: 4rem 2rem; color: var(--danger);">
                    <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 1.5rem; color:#ef4444;"></i>
                    <p style="font-size: 1.1rem; font-weight:600; color:var(--text-main);">${isAr ? 'فشلت عملية التفريغ النصي للمقابلة.' : 'Transcription failed for this session.'}</p>
                </div>
            `;
        } else {
            const formatted = this._formatTranscript(session.full_transcript);
            contentHtml = `
                <div style="display:flex; justify-content:flex-end; margin-bottom: 1rem;">
                    <button class="btn btn-outline" id="session-copy-btn" style="padding: 0.4rem 0.8rem; font-size: 0.85rem; border-radius:6px; display:inline-flex; align-items:center; gap:0.4rem;">
                        <i class="fas fa-copy"></i> ${isAr ? 'نسخ النص' : 'Copy Transcript'}
                    </button>
                </div>
                <div style="max-height: 65vh; overflow-y: auto; background: var(--bg-card); padding: 1.5rem; border-radius: 8px; border: 1px solid var(--border-color); box-shadow:inset 0 2px 4px rgba(0,0,0,0.02);">
                    ${formatted}
                </div>
            `;
        }
        
        const modal = new Modal({
            title: `<i class="fas fa-file-signature" style="color:var(--primary-color); margin-${isAr?'left':'right'}:0.4rem;"></i> ${isAr ? 'النص المفرغ للجلسة' : 'Session Transcript'} #${session.id}`,
            content: contentHtml
        });
        
        modal.show();
        
        const saveBtn = modal.element.querySelector('.modal-save-btn');
        if (saveBtn) saveBtn.style.display = 'none'; // No save action needed here

        const closeBtn = modal.element.querySelector('.cancel-btn');
        if (closeBtn) {
            closeBtn.textContent = isAr ? 'إغلاق' : 'Close';
            closeBtn.classList.replace('btn-outline', 'btn-primary'); // Highlight close
        }
        
        const copyBtn = modal.element.querySelector('#session-copy-btn');
        if (copyBtn) {
            copyBtn.addEventListener('click', async () => {
                try {
                    await navigator.clipboard.writeText(session.full_transcript || '');
                    Toast.show(isAr ? 'تم نسخ النص بنجاح!' : 'Transcript copied to clipboard!', 'success');
                } catch (err) {
                    Toast.show(isAr ? 'فشل نسخ النص' : 'Failed to copy', 'error');
                }
            });
        }
    }

    _openForm() {
        const isAr = getLang() === 'ar';
        const content = `
            <div class="form-group" style="margin-bottom:1.5rem;">
                <label class="form-label" style="font-weight:600;">${isAr ? 'نوع الجلسة' : 'Session Type'}</label>
                <select id="sess-type" class="form-control" style="padding:0.6rem; border-radius:6px;">
                    <option value="screening">${isAr ? 'مقابلة فرز (Screening)' : 'Screening'}</option>
                    <option value="technical">${isAr ? 'مقابلة تقنية (Technical)' : 'Technical'}</option>
                    <option value="cultural_fit">${isAr ? 'ملاءمة ثقافية (Cultural Fit)' : 'Cultural Fit'}</option>
                    <option value="final">${isAr ? 'مقابلة نهائية (Final)' : 'Final'}</option>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label" style="font-weight:600;">${isAr ? 'وضع تقييم الذكاء الاصطناعي' : 'AI Evaluation Mode'}</label>
                <select id="sess-ai-mode" class="form-control" style="padding:0.6rem; border-radius:6px;">
                    <option value="very_strict">${isAr ? 'قاسي جداً' : 'Very Strict'}</option>
                    <option value="strict">${isAr ? 'صارم' : 'Strict'}</option>
                    <option value="normal" selected>${isAr ? 'طبيعي' : 'Normal'}</option>
                    <option value="lenient">${isAr ? 'متساهل' : 'Lenient'}</option>
                </select>
                <div style="background:rgba(var(--primary-color-rgb, 79,70,229),0.05); padding:0.8rem; border-radius:6px; margin-top:0.8rem; border-inline-start:3px solid var(--primary-color);">
                    <small style="color:var(--text-muted); font-size:0.8rem; line-height:1.5; display:block;">
                        <i class="fas fa-info-circle" style="color:var(--primary-color);"></i>
                        ${isAr ? 'يحدد هذا الخيار مدى صرامة أو تساهل المحرك الذكي في تقييم إجابات المرشح عند بدء التحليل.' : 'Sets how conservative the AI engine should be when grading candidate responses.'}
                    </small>
                </div>
            </div>
        `;
        const modal = new Modal({
            title: isAr ? 'إنشاء جلسة مقابلة جديدة' : 'Create Interview Session',
            content,
            saveText: isAr ? 'إنشاء الجلسة' : 'Create Session',
            onSave: async (modalEl) => {
                try {
                    await api.post('/sessions', {
                        application_id: parseInt(this.appId),
                        session_type: modalEl.querySelector('#sess-type').value,
                        ai_mode: modalEl.querySelector('#sess-ai-mode').value
                    });
                    Toast.show(isAr ? 'تم إنشاء الجلسة بنجاح!' : 'Session created!', 'success');
                    await this.refresh();
                } catch (e) {
                    Toast.show(e.message || (isAr ? 'حدث خطأ أثناء إنشاء الجلسة' : 'Error creating session'), 'error');
                    throw e;
                }
            }
        });
        modal.show();
    }

    _openUploadModal(id) {
        const isAr = getLang() === 'ar';
        const content = `
            <style>
                .custom-toggle { position: relative; width: 46px; height: 26px; flex-shrink: 0; }
                .custom-toggle input { opacity: 0; width: 0; height: 0; position: absolute; }
                .toggle-slider { position: absolute; inset: 0; border-radius: 26px; background: var(--border-color); transition: 0.3s; cursor: pointer; }
                .toggle-knob { position: absolute; left: 3px; top: 3px; width: 20px; height: 20px; border-radius: 50%; background: white; transition: 0.3s; pointer-events: none; box-shadow: 0 1px 3px rgba(0,0,0,0.2); }
                .custom-toggle input:checked + .toggle-slider { background: #10b981; }
                .custom-toggle input:checked ~ .toggle-knob { transform: translateX(20px); }
            </style>

            <div class="tabs" style="display:flex; border-bottom:2px solid var(--border-color); margin-bottom:1.5rem;">
                <button class="tab-btn active" data-tab="upload" style="flex:1; padding:0.8rem; background:none; border:none; border-bottom:3px solid var(--primary-color); color:var(--primary-color); font-weight:700; cursor:pointer; font-size:0.95rem; transition:all 0.2s; margin-bottom:-2px;"><i class="fas fa-upload"></i> ${isAr ? 'رفع ملف' : 'Upload File'}</button>
                <button class="tab-btn" data-tab="record" style="flex:1; padding:0.8rem; background:none; border:none; border-bottom:3px solid transparent; color:var(--text-muted); font-weight:600; cursor:pointer; font-size:0.95rem; transition:all 0.2s; margin-bottom:-2px;"><i class="fas fa-video"></i> ${isAr ? 'تسجيل حي' : 'Record Now'}</button>
                <button class="tab-btn" data-tab="link" style="flex:1; padding:0.8rem; background:none; border:none; border-bottom:3px solid transparent; color:var(--text-muted); font-weight:600; cursor:pointer; font-size:0.95rem; transition:all 0.2s; margin-bottom:-2px;"><i class="fas fa-link"></i> ${isAr ? 'ربط رابط' : 'Link Media'}</button>
            </div>

            <div id="tab-upload" class="tab-content">
                <div class="form-group">
                    <label class="form-label" style="font-weight:600;">${isAr ? 'ملف المقابلة (MP3 / WAV / MP4 / WEBM / TXT)' : 'Interview Media (MP3 / WAV / MP4 / WEBM / TXT)'}</label>
                    <div style="border: 2px dashed var(--border-color); padding: 1.5rem; text-align: center; border-radius: 8px; background: var(--bg-secondary); margin-bottom: 0.5rem; transition: border-color 0.2s;">
                        <input type="file" id="media-file" class="form-control" accept=".mp3,.wav,.mp4,.webm,.m4a,.txt" style="width:100%; cursor:pointer;">
                    </div>
                    <small style="display:block; color:var(--text-muted); font-size:0.85rem;">
                        <i class="fas fa-robot" style="color:var(--primary-color);"></i>
                        ${isAr ? 'فور إتمام الرفع، سيبدأ محرك الذكاء الاصطناعي بالتحليل.' : 'AI processing will begin immediately after upload.'}
                    </small>
                </div>

                <div style="margin-top: 1.5rem; background:var(--bg-secondary); padding:1rem; border-radius:8px;">
                    <label style="display: flex; align-items: center; gap: 1rem; cursor: pointer; user-select: none; text-align: ${isAr ? 'right' : 'left'}; margin:0;">
                        <div class="custom-toggle">
                            <input type="checkbox" id="upload-validation" checked>
                            <span class="toggle-slider"></span>
                            <span class="toggle-knob"></span>
                        </div>
                        <div>
                            <span style="font-size: 0.9rem; font-weight: 700; color: var(--text-color); display: block;">
                                ${isAr ? 'التحقق من توافق المقابلة مع الوصف الوظيفي' : 'Validate Transcript Compatibility'}
                            </span>
                            <span style="font-size: 0.8rem; color: var(--text-muted); display: block; margin-top: 0.2rem;">
                                ${isAr ? 'التحقق من أن النص المفرغ متطابق مع الوصف الوظيفي (اختياري - قد يزيد وقت المعالجة).' : 'Check if transcript matches job description (optional - costs extra tokens).'}
                            </span>
                        </div>
                    </label>
                </div>
            </div>

            <div id="tab-record" class="tab-content" style="display:none; text-align:center;">
                <div style="margin-bottom:1.5rem; display:flex; justify-content:center; gap:2rem; background:var(--bg-secondary); padding:1rem; border-radius:8px;">
                    <label style="cursor:pointer; font-weight:600; display:flex; align-items:center; gap:0.4rem;">
                        <input type="radio" name="record-source" value="mic" checked> 
                        <i class="fas fa-microphone-alt" style="color:#8b5cf6;"></i> ${isAr ? 'ميكروفون فقط' : 'Mic Audio'}
                    </label>
                    <label style="cursor:pointer; font-weight:600; display:flex; align-items:center; gap:0.4rem;">
                        <input type="radio" name="record-source" value="system"> 
                        <i class="fas fa-desktop" style="color:#06b6d4;"></i> ${isAr ? 'شاشة وصوت النظام' : 'Screen & System'}
                    </label>
                </div>
                
                <div id="record-timer" style="font-size:3rem; font-weight:800; color:#ef4444; margin-bottom:1rem; font-variant-numeric:tabular-nums; display:none; letter-spacing:2px;">00:00</div>
                
                <div style="display:flex; justify-content:center; gap:1rem;">
                    <button type="button" id="start-record-btn" class="btn btn-primary" style="border-radius:50px; padding:0.7rem 2rem; font-size:1.05rem; font-weight:600; box-shadow:0 4px 15px rgba(var(--primary-color-rgb,79,70,229),0.3);"><i class="fas fa-circle" style="color:#ff4d4f; margin-inline-end:0.4rem;"></i> ${isAr ? 'بدء التسجيل' : 'Start Record'}</button>
                    <button type="button" id="stop-record-btn" class="btn btn-outline" style="border-radius:50px; padding:0.7rem 2rem; display:none; color:#ef4444; border-color:rgba(239,68,68,0.5); font-size:1.05rem; font-weight:600; background:rgba(239,68,68,0.05);"><i class="fas fa-stop-circle" style="margin-inline-end:0.4rem;"></i> ${isAr ? 'إيقاف وإنهاء' : 'Stop Record'}</button>
                </div>
                
                <div id="record-status" style="margin-top:1rem; color:var(--text-muted); font-size:0.95rem; font-weight:600; min-height:1.5rem;"></div>
                
                <video id="record-preview-video" controls style="margin-top:1.5rem; width:100%; max-height:280px; display:none; border-radius:10px; background:#000; box-shadow:0 4px 10px rgba(0,0,0,0.1);"></video>
                <audio id="record-preview-audio" controls style="margin-top:1.5rem; width:100%; display:none; border-radius:30px; outline:none;"></audio>
                
                <div id="submit-hint" style="display:none; margin-top:1.5rem; padding:1rem; background-color:rgba(16, 185, 129, 0.1); border:1px solid #10b981; border-radius:10px; color:#059669; font-weight:600; font-size:0.95rem;">
                    <i class="fas fa-check-circle"></i> ${isAr ? 'التسجيل جاهز للتحليل. اضغط (إرسال وبدء الـ AI) أدناه.' : 'Recording ready! Click Submit below to process.'}
                </div>

                <div style="margin-top: 1.5rem; background:var(--bg-secondary); padding:1rem; border-radius:8px;">
                    <label style="display: flex; align-items: center; gap: 1rem; cursor: pointer; user-select: none; text-align: ${isAr ? 'right' : 'left'}; margin:0;">
                        <div class="custom-toggle">
                            <input type="checkbox" id="record-auto-delete" checked>
                            <span class="toggle-slider"></span>
                            <span class="toggle-knob"></span>
                        </div>
                        <div>
                            <span style="font-size: 0.9rem; font-weight: 700; color: var(--text-color); display: block;">
                                ${isAr ? 'حذف التسجيل بعد النسخ لتوفير المساحة' : 'Auto-delete to save space'}
                            </span>
                            <span style="font-size: 0.8rem; color: var(--text-muted); display: block; margin-top: 0.2rem;">
                                ${isAr ? 'تدمير ملف الوسائط من السيرفر فور انتهاء معالجة الذكاء الاصطناعي.' : 'Destroy media file from server immediately after AI transcription finishes.'}
                            </span>
                        </div>
                    </label>
                </div>

                <div style="margin-top: 1.5rem; background:var(--bg-secondary); padding:1rem; border-radius:8px;">
                    <label style="display: flex; align-items: center; gap: 1rem; cursor: pointer; user-select: none; text-align: ${isAr ? 'right' : 'left'}; margin:0;">
                        <div class="custom-toggle">
                            <input type="checkbox" id="record-validation" checked>
                            <span class="toggle-slider"></span>
                            <span class="toggle-knob"></span>
                        </div>
                        <div>
                            <span style="font-size: 0.9rem; font-weight: 700; color: var(--text-color); display: block;">
                                ${isAr ? 'التحقق من توافق المقابلة مع الوصف الوظيفي' : 'Validate Transcript Compatibility'}
                            </span>
                            <span style="font-size: 0.8rem; color: var(--text-muted); display: block; margin-top: 0.2rem;">
                                ${isAr ? 'التحقق من أن النص المفرغ متطابق مع الوصف الوظيفي (اختياري - قد يزيد وقت المعالجة).' : 'Check if transcript matches job description (optional - costs extra tokens).'}
                            </span>
                        </div>
                    </label>
                </div>
            </div>

            <div id="tab-link" class="tab-content" style="display:none;">
                <div class="form-group">
                    <label class="form-label" style="font-weight:600;">${isAr ? 'رابط المقابلة الخارجي' : 'External Interview URL'}</label>
                    <div style="position:relative;">
                        <i class="fas fa-link" style="position:absolute; ${isAr ? 'right' : 'left'}:12px; top:50%; transform:translateY(-50%); color:var(--text-muted);"></i>
                        <input type="url" id="media-url" class="form-control" placeholder="https://www.youtube.com/watch?v=..." style="padding-${isAr ? 'right' : 'left'}:35px;">
                    </div>
                    <div style="display:flex; gap:0.5rem; margin-top:0.8rem; color:var(--text-muted); font-size:1.2rem; opacity:0.7;">
                        <i class="fab fa-youtube" style="color:#ff0000;" title="YouTube"></i>
                        <i class="fab fa-google-drive" style="color:#00a35c;" title="Google Drive"></i>
                        <i class="fab fa-vimeo" style="color:#1ab7ea;" title="Vimeo"></i>
                        <i class="fab fa-tiktok" style="color:#000;" title="TikTok"></i>
                    </div>
                </div>
                
                <div style="margin-top: 1.5rem; background:var(--bg-secondary); padding:1rem; border-radius:8px;">
                    <label style="display: flex; align-items: center; gap: 1rem; cursor: pointer; user-select: none; text-align: ${isAr ? 'right' : 'left'}; margin:0;">
                        <div class="custom-toggle">
                            <input type="checkbox" id="link-auto-delete" checked>
                            <span class="toggle-slider"></span>
                            <span class="toggle-knob"></span>
                        </div>
                        <div>
                            <span style="font-size: 0.9rem; font-weight: 700; color: var(--text-color); display: block;">
                                ${isAr ? 'حذف الملف المحمل بعد المعالجة' : 'Auto-delete downloaded file'}
                            </span>
                            <span style="font-size: 0.8rem; color: var(--text-muted); display: block; margin-top: 0.2rem;">
                                ${isAr ? 'مسح الملف المسحوب من الرابط لتوفير المساحة فور انتهاء التفريغ.' : 'Clear the downloaded file from storage once transcription succeeds.'}
                            </span>
                        </div>
                    </label>
                </div>

                <div style="margin-top: 1.5rem; background:var(--bg-secondary); padding:1rem; border-radius:8px;">
                    <label style="display: flex; align-items: center; gap: 1rem; cursor: pointer; user-select: none; text-align: ${isAr ? 'right' : 'left'}; margin:0;">
                        <div class="custom-toggle">
                            <input type="checkbox" id="link-validation" checked>
                            <span class="toggle-slider"></span>
                            <span class="toggle-knob"></span>
                        </div>
                        <div>
                            <span style="font-size: 0.9rem; font-weight: 700; color: var(--text-color); display: block;">
                                ${isAr ? 'التحقق من توافق المقابلة مع الوصف الوظيفي' : 'Validate Transcript Compatibility'}
                            </span>
                            <span style="font-size: 0.8rem; color: var(--text-muted); display: block; margin-top: 0.2rem;">
                                ${isAr ? 'التحقق من أن النص المفرغ متطابق مع الوصف الوظيفي (اختياري - قد يزيد وقت المعالجة).' : 'Check if transcript matches job description (optional - costs extra tokens).'}
                            </span>
                        </div>
                    </label>
                </div>
            </div>
        `;

        let mediaRecorder = null;
        let audioChunks = [];
        let recordInterval = null;
        let recordSeconds = 0;
        let recordBlob = null;
        let stream = null;
        let currentSource = 'mic';

        const modal = new Modal({
            title: `<i class="fas fa-cloud-upload-alt" style="color:var(--primary-color); margin-${isAr?'left':'right'}:0.4rem;"></i> ${isAr ? 'إضافة وسائط للجلسة' : 'Add Interview Media'}`,
            content,
            saveText: `<i class="fas fa-paper-plane"></i> ${isAr ? 'إرسال وبدء الذكاء الاصطناعي' : 'Submit & Start AI'}`,
            onSave: async (modalEl) => {
                const activeTab = modalEl.querySelector('.tab-btn.active').dataset.tab;
                const formData = new FormData();

                if (activeTab === 'upload') {
                    const fileInput = modalEl.querySelector('#media-file');
                    if (!fileInput.files.length) {
                        Toast.show(isAr ? 'الرجاء تحديد ملف لرفعه.' : 'Please select a file.', 'error');
                        throw new Error('No file');
                    }
                    formData.append('file', fileInput.files[0]);
                } else if (activeTab === 'record') {
                    if (mediaRecorder && mediaRecorder.state === 'recording') {
                        Toast.show(isAr ? 'التسجيل قيد العمل. أوقفه أولاً.' : 'Please stop recording first.', 'error');
                        throw new Error('Still recording');
                    }
                    if (!recordBlob) {
                        Toast.show(isAr ? 'لا يوجد ملف مسجل لإرساله.' : 'No recording to submit.', 'error');
                        throw new Error('No recording');
                    }
                    const ext = currentSource === 'system' ? 'webm' : 'webm';
                    formData.append('file', recordBlob, `recording.${ext}`);
                } else if (activeTab === 'link') {
                    const urlInput = modalEl.querySelector('#media-url');
                    const urlVal = urlInput.value.trim();
                    if (!urlVal) {
                        Toast.show(isAr ? 'الرجاء إدخال رابط صحيح.' : 'Please enter a valid URL.', 'error');
                        throw new Error('No URL');
                    }
                }

                try {
                    let autoDelete = false;
                    let enableValidation = false;

                    if (activeTab === 'upload') {
                        autoDelete = true;
                        enableValidation = modalEl.querySelector('#upload-validation')?.checked ?? true;
                        Toast.show(isAr ? 'جاري الرفع...' : 'Uploading...', 'info');
                        // Set validation preference first
                        console.log(`[SessionsSection] Setting validation preference for session ${id}: ${enableValidation}`);
                        const prefResult = await api.patch(`/sessions/${id}/validation-preference`, { enable: enableValidation });
                        console.log(`[SessionsSection] Validation preference set:`, prefResult);
                        await api.post(`/sessions/${id}/upload?auto_delete_media=${autoDelete}`, formData);
                    } else if (activeTab === 'record') {
                        autoDelete = modalEl.querySelector('#record-auto-delete')?.checked ?? false;
                        enableValidation = modalEl.querySelector('#record-validation')?.checked ?? true;
                        Toast.show(isAr ? 'جاري رفع التسجيل الحي...' : 'Uploading recording...', 'info');
                        // Set validation preference first
                        console.log(`[SessionsSection] Setting validation preference for session ${id}: ${enableValidation}`);
                        const prefResult = await api.patch(`/sessions/${id}/validation-preference`, { enable: enableValidation });
                        console.log(`[SessionsSection] Validation preference set:`, prefResult);
                        await api.post(`/sessions/${id}/upload?auto_delete_media=${autoDelete}`, formData);
                    } else if (activeTab === 'link') {
                        autoDelete = modalEl.querySelector('#link-auto-delete')?.checked ?? false;
                        enableValidation = modalEl.querySelector('#link-validation')?.checked ?? true;
                        const urlInput = modalEl.querySelector('#media-url');
                        const urlVal = urlInput.value.trim();
                        Toast.show(isAr ? 'جاري التحميل من الرابط...' : 'Downloading from URL...', 'info');
                        // Set validation preference first
                        console.log(`[SessionsSection] Setting validation preference for session ${id}: ${enableValidation}`);
                        const prefResult = await api.patch(`/sessions/${id}/validation-preference`, { enable: enableValidation });
                        console.log(`[SessionsSection] Validation preference set:`, prefResult);
                        await api.post(`/sessions/${id}/upload-url?url=${encodeURIComponent(urlVal)}&auto_delete_media=${autoDelete}`, {});
                    }

                    Toast.show(
                        autoDelete
                            ? (isAr ? 'تم الإرسال وبدأ التحليل (سيتم الحذف التلقائي للملف لاحقاً).' : 'Submitted! AI started (File will auto-delete).')
                            : (isAr ? 'تم الإرسال بنجاح! المعالجة مستمرة في الخلفية.' : 'Submitted successfully! AI processing started.'),
                        'success'
                    );
                    
                    this._startPipelinePolling(id);
                    await this.refresh();
                } catch (e) {
                    Toast.show(e.message || (isAr ? 'حدث خطأ أثناء الرفع' : 'Error uploading media'), 'error');
                    throw e;
                } finally {
                    if (stream) stream.getTracks().forEach(track => track.stop());
                }
            }
        });

        // Tabs Logic
        const tabBtns = modal.element.querySelectorAll('.tab-btn');
        const tabContents = modal.element.querySelectorAll('.tab-content');
        
        tabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.currentTarget.dataset.tab;
                tabBtns.forEach(b => {
                    b.classList.remove('active');
                    b.style.borderBottomColor = 'transparent';
                    b.style.color = 'var(--text-muted)';
                    b.style.fontWeight = '600';
                });
                e.currentTarget.classList.add('active');
                e.currentTarget.style.borderBottomColor = 'var(--primary-color)';
                e.currentTarget.style.color = 'var(--primary-color)';
                e.currentTarget.style.fontWeight = '700';
                
                tabContents.forEach(tc => tc.style.display = 'none');
                modal.element.querySelector('#tab-' + tab).style.display = 'block';
            });
        });

        // Record Logic
        const startBtn = modal.element.querySelector('#start-record-btn');
        const stopBtn = modal.element.querySelector('#stop-record-btn');
        const timerEl = modal.element.querySelector('#record-timer');
        const statusEl = modal.element.querySelector('#record-status');
        const previewVideo = modal.element.querySelector('#record-preview-video');
        const previewAudio = modal.element.querySelector('#record-preview-audio');
        const submitHint = modal.element.querySelector('#submit-hint');

        const updateTimer = () => {
            const m = String(Math.floor(recordSeconds / 60)).padStart(2, '0');
            const s = String(recordSeconds % 60).padStart(2, '0');
            timerEl.textContent = m + ':' + s;
        };

        startBtn.addEventListener('click', async () => {
            currentSource = modal.element.querySelector('input[name="record-source"]:checked').value;
            try {
                let mimeType = '';
                if (currentSource === 'system') {
                    stream = await navigator.mediaDevices.getDisplayMedia({ video: { cursor: "always" }, audio: true });
                    mimeType = MediaRecorder.isTypeSupported('video/webm; codecs=vp8,opus') ? 'video/webm; codecs=vp8,opus' : 'video/webm';
                } else {
                    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
                }

                audioChunks = [];
                mediaRecorder = new MediaRecorder(stream, { mimeType });

                mediaRecorder.ondataavailable = e => { if (e.data.size > 0) audioChunks.push(e.data); };

                mediaRecorder.onstop = () => {
                    const finalMime = currentSource === 'system' ? 'video/webm' : mimeType;
                    recordBlob = new Blob(audioChunks, { type: finalMime });
                    
                    const objUrl = URL.createObjectURL(recordBlob);
                    if (currentSource === 'system') {
                        previewVideo.src = objUrl; previewVideo.style.display = 'block'; previewAudio.style.display = 'none';
                    } else {
                        previewAudio.src = objUrl; previewAudio.style.display = 'block'; previewVideo.style.display = 'none';
                    }
                    
                    statusEl.textContent = isAr ? 'اكتمل التسجيل.' : 'Recording finished.';
                    statusEl.style.color = '#10b981';
                    submitHint.style.display = 'block';
                    
                    if (stream) stream.getTracks().forEach(track => track.stop());
                };

                mediaRecorder.start(1000); 
                startBtn.style.display = 'none';
                stopBtn.style.display = 'inline-flex';
                timerEl.style.display = 'block';
                previewVideo.style.display = 'none';
                previewAudio.style.display = 'none';
                submitHint.style.display = 'none';
                recordBlob = null;
                recordSeconds = 0;
                updateTimer();
                statusEl.textContent = isAr ? 'جاري التسجيل...' : 'Recording in progress...';
                statusEl.style.color = '#ef4444';

                recordInterval = setInterval(() => {
                    recordSeconds++;
                    updateTimer();
                }, 1000);

                if (currentSource === 'system') {
                    stream.getVideoTracks().forEach(track => {
                        track.onended = () => { if (mediaRecorder && mediaRecorder.state === 'recording') stopBtn.click(); };
                    });
                }
            } catch (err) {
                console.error(err);
                statusEl.textContent = (isAr ? 'فشل بدء التسجيل: ' : 'Failed to start: ') + err.message;
                statusEl.style.color = '#ef4444';
            }
        });

        stopBtn.addEventListener('click', () => {
            if (mediaRecorder && mediaRecorder.state === 'recording') mediaRecorder.stop();
            clearInterval(recordInterval);
            startBtn.style.display = 'inline-flex';
            startBtn.innerHTML = `<i class="fas fa-redo"></i> ${isAr ? 'إعادة التسجيل' : 'Record Again'}`;
            stopBtn.style.display = 'none';
        });

        const oldClose = modal.close.bind(modal);
        modal.close = () => {
            if (mediaRecorder && mediaRecorder.state === 'recording') mediaRecorder.stop();
            clearInterval(recordInterval);
            if (stream) stream.getTracks().forEach(track => track.stop());
            oldClose();
        };

        modal.show();
    }

    _startPipelinePolling(id) {
        if (this.disposed) return;
        const key = String(id);
        if (this.pollers.has(key)) {
            this.pollers.get(key).stop();
        }

        const poller = new PipelinePoller(id, {
            onUpdate: (status) => {
                if (this.disposed) return;
                const cell = document.querySelector(`[data-session-status="${id}"]`);
                if (cell) {
                    // Instantly update badge in DOM without full refresh
                    cell.innerHTML = this._statusBadge(status.status, id);
                }
            },
            onComplete: async () => {
                if (this.disposed) return;
                this.pollers.delete(key);
                await this.refresh();
            },
            onError: (error) => {
                if (this.disposed) return;
                console.error('Pipeline poll error:', error);
            }
        });

        this.pollers.set(key, poller);
        poller.start();
    }

    async _deleteSession(id) {
        const isAr = getLang() === 'ar';
        if (!confirm(isAr ? 'هل أنت متأكد من حذف هذه الجلسة بشكل نهائي؟' : 'Are you sure you want to permanently delete this session?')) return;
        try {
            await api.fetch(`/sessions/${id}`, { method: 'DELETE' });
            Toast.show(isAr ? 'تم الحذف بنجاح' : 'Session deleted successfully', 'success');
            await this.refresh();
        } catch {
            Toast.show(isAr ? 'خطأ أثناء الحذف' : 'Error deleting session', 'error');
        }
    }

    destroy() {
        this.disposed = true;
        for (const poller of this.pollers.values()) {
            poller.stop();
        }
        this.pollers.clear();
    }

    async refresh() {
        // Prevent double refresh if navigating away
        if (this.disposed || !window.location.hash.includes(`/applications/${this.appId}/sessions`)) {
            this.destroy();
            return;
        }
        await this.fetchData();
        
        if (this.disposed || !window.location.hash.includes(`/applications/${this.appId}/sessions`)) {
            this.destroy();
            return;
        }

        const container = document.getElementById('sessions-section-container');
        if (container) {
            container.innerHTML = this._renderInner();
            this.mount();
        }
    }
}