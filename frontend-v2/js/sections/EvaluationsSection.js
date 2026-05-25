import { t, getLang } from '../core/i18n.js';
import { api } from '../core/api.js';
import { Modal } from '../components/Modal.js';
import { Toast } from '../components/Toast.js';

export class EvaluationsSection {
    constructor() {
        this.sessions = [];
        this.isLoading = false;
    }

    // ─── Data Fetching ────────────────────────────────────────────────────────
    async fetchData() {
        this.isLoading = true;
        try {
            const data = await api.get('/sessions');
            this.sessions = Array.isArray(data) ? data : (data.items || []);
            
            // Sort sessions descending by ID or creation date (optional but good practice)
            this.sessions.sort((a, b) => b.id - a.id);
        } catch (error) {
            console.error('EvaluationsSection fetchData error:', error);
            Toast.show(getLang() === 'ar' ? 'فشل في تحميل الجلسات' : 'Failed to load sessions', 'error');
            this.sessions = [];
        } finally {
            this.isLoading = false;
        }
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────
    _getStatusBadge(status) {
        const s = (status || 'unknown').toLowerCase();
        const isAr = getLang() === 'ar';
        let bg = 'rgba(100,116,139,0.1)', color = '#64748b', icon = 'fa-circle-notch', text = status;

        if (s.includes('pending') || s.includes('scheduled')) {
            bg = 'rgba(245,158,11,0.1)'; color = '#f59e0b'; icon = 'fa-clock';
            text = isAr ? (s.includes('scheduled') ? 'مجدول' : 'قيد الانتظار') : text;
        } else if (s.includes('progress') || s.includes('running') || s.includes('analyzing')) {
            bg = 'rgba(59,130,246,0.1)'; color = '#3b82f6'; icon = 'fa-spinner fa-spin';
            text = isAr ? 'قيد المعالجة' : 'In Progress';
        } else if (s.includes('completed') || s.includes('done')) {
            bg = 'rgba(16,185,129,0.1)'; color = '#10b981'; icon = 'fa-check-circle';
            text = isAr ? 'مكتمل' : 'Completed';
        } else if (s.includes('fail') || s.includes('error')) {
            bg = 'rgba(239,68,68,0.1)'; color = '#ef4444'; icon = 'fa-exclamation-circle';
            text = isAr ? 'فشل' : 'Failed';
        }

        // Capitalize first letter if English
        if (!isAr) text = text.charAt(0).toUpperCase() + text.slice(1);

        return `<span style="background:${bg}; color:${color}; padding:0.3rem 0.6rem; border-radius:6px; font-size:0.8rem; font-weight:600; display:inline-flex; align-items:center; gap:0.3rem; white-space:nowrap;">
            <i class="fas ${icon}" style="font-size:0.75rem;"></i> ${text}
        </span>`;
    }

    _getTypeBadge(type) {
        const t = String(type || '').toLowerCase();
        let icon = 'fa-laptop-house';
        let color = 'var(--text-color)';
        
        if (t.includes('audio')) { icon = 'fa-microphone'; color = '#8b5cf6'; }
        else if (t.includes('video')) { icon = 'fa-video'; color = '#ec4899'; }
        else if (t.includes('text') || t.includes('chat')) { icon = 'fa-comment-dots'; color = '#06b6d4'; }
        
        return `<div style="display:flex; align-items:center; gap:0.5rem; font-weight:600;">
            <div style="width:28px; height:28px; border-radius:6px; background:rgba(0,0,0,0.04); display:flex; align-items:center; justify-content:center;">
                <i class="fas ${icon}" style="color:${color}; font-size:0.85rem;"></i>
            </div>
            ${type.charAt(0).toUpperCase() + type.slice(1)}
        </div>`;
    }

    _formatDate(dateStr) {
        if (!dateStr) return `<span style="color:var(--text-muted);">—</span>`;
        try {
            const isAr = getLang() === 'ar';
            return new Date(dateStr).toLocaleString(isAr ? 'ar-EG' : 'en-GB', {
                year: 'numeric', month: 'short', day: '2-digit',
                hour: '2-digit', minute: '2-digit'
            });
        } catch { return dateStr; }
    }

    // ─── Render ───────────────────────────────────────────────────────────────
    render() {
        return `<div id="evaluations-section-container" style="width:100%;">${this._renderInner()}</div>`;
    }

    _renderInner() {
        const isAr = getLang() === 'ar';
        const labels = {
            title: isAr ? "إدارة التقييمات والجلسات" : "Evaluations & Sessions",
            subtitle: isAr ? "تتبع المقابلات، ومراقبة حالة خط المعالجة، والوصول إلى تقارير الذكاء الاصطناعي." : "Track interviews, monitor pipeline status, and access AI reports.",
            session: isAr ? "رقم الجلسة" : "Session ID",
            appId: isAr ? "التقديم" : "App ID",
            type: isAr ? "نوع الجلسة" : "Type",
            status: isAr ? "الحالة" : "Status",
            scheduled: isAr ? "تاريخ الجدولة" : "Scheduled Date",
            actions: isAr ? "الإجراءات" : "Actions",
            view: isAr ? "التفاصيل" : "Details",
            refresh: isAr ? "تحديث" : "Refresh",
            noData: isAr ? "لا توجد جلسات مسجلة حالياً." : "No sessions found.",
            emptyDesc: isAr ? "بمجرد بدء مرشح لمقابلة، ستظهر تفاصيلها هنا." : "Once a candidate starts an interview, it will appear here."
        };

        let tableRows = '';

        if (this.isLoading) {
            tableRows = Array(5).fill(0).map(() => `
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
                            <i class="fas fa-calendar-times" style="font-size:2rem; color:var(--primary-color);"></i>
                        </div>
                        <div style="font-size:1.1rem; font-weight:600; color:var(--text-color); margin-bottom:0.3rem;">${labels.noData}</div>
                        <div style="font-size:0.9rem;">${labels.emptyDesc}</div>
                    </td>
                </tr>
            `;
        } else {
            tableRows = this.sessions.map((s, idx) => {
                const rowBg = idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.012)';
                return `
                    <tr style="background:${rowBg}; border-bottom:1px solid var(--border-color); transition: background 0.2s;">
                        <td style="padding:1rem;">
                            <strong style="color:var(--text-main); font-family:monospace; font-size:0.95rem;">#${s.id}</strong>
                        </td>
                        <td style="padding:1rem;">
                            <span style="background:var(--bg-secondary); padding:0.2rem 0.5rem; border-radius:4px; font-size:0.85rem; color:var(--text-muted); font-family:monospace;">
                                App #${s.application_id || '—'}
                            </span>
                        </td>
                        <td style="padding:1rem;">
                            ${this._getTypeBadge(s.session_type)}
                        </td>
                        <td style="padding:1rem;">
                            ${this._getStatusBadge(s.pipeline_status)}
                        </td>
                        <td style="padding:1rem; font-size:0.85rem; color:var(--text-muted);">
                            ${this._formatDate(s.scheduled_at)}
                        </td>
                        <td style="padding:1rem;">
                            <button class="btn btn-outline view-session-btn" data-id="${s.id}" style="padding:0.4rem 0.8rem; font-size:0.85rem; display:inline-flex; align-items:center; gap:0.4rem; border-radius:6px;">
                                <i class="fas fa-expand-alt" style="color:var(--primary-color);"></i> ${labels.view}
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
        }

        return `
            <style>
                @keyframes shimmer {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }
                .evals-table th {
                    background: var(--bg-secondary);
                    color: var(--text-muted);
                    font-size: 0.8rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    padding: 1rem;
                    border-bottom: 2px solid var(--border-color);
                    text-align: ${isAr ? 'right' : 'left'};
                    white-space: nowrap;
                }
                .evals-table td {
                    vertical-align: middle;
                }
                .evals-table tr:hover {
                    background: rgba(var(--primary-color-rgb,79,70,229), 0.03) !important;
                }
            </style>

            <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:1rem; margin-bottom:2rem;">
                <div>
                    <h1 style="color:var(--primary-color); font-size:1.8rem; font-weight:800; margin:0; display:flex; align-items:center; gap:0.6rem;">
                        <i class="fas fa-layer-group" style="opacity:0.8;"></i>${labels.title}
                    </h1>
                    <p style="color:var(--text-muted); margin:0.3rem 0 0; font-size:0.95rem;">${labels.subtitle}</p>
                </div>
                <button id="refresh-evals-btn" class="btn btn-outline" style="display:inline-flex; align-items:center; gap:0.5rem; padding:0.6rem 1rem; border-radius:8px;">
                    <i class="fas fa-sync-alt" id="refresh-icon"></i> ${labels.refresh}
                </button>
            </div>

            <div class="card" style="border-radius:12px; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,0.04); background:var(--bg-card); border:1px solid var(--border-color); padding:0;">
                <div class="table-responsive" style="overflow-x:auto; width:100%;">
                    <table class="table evals-table" style="width:100%; border-collapse:collapse; margin:0;">
                        <thead>
                            <tr>
                                <th style="width:100px;">${labels.session}</th>
                                <th style="width:120px;">${labels.appId}</th>
                                <th style="width:150px;">${labels.type}</th>
                                <th style="width:160px;">${labels.status}</th>
                                <th style="min-width:180px;">${labels.scheduled}</th>
                                <th style="width:120px;">${labels.actions}</th>
                            </tr>
                        </thead>
                        <tbody id="eval-tbody">
                            ${tableRows}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    // ─── Mount & Event Listeners ──────────────────────────────────────────────
    mount() {
        // Refresh Button
        const refreshBtn = document.getElementById('refresh-evals-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', async () => {
                const icon = document.getElementById('refresh-icon');
                if (icon) icon.classList.add('fa-spin');
                await this.refresh();
            });
        }

        // View Session Button
        const tbody = document.getElementById('eval-tbody');
        if (tbody) {
            tbody.addEventListener('click', (e) => {
                const viewBtn = e.target.closest('.view-session-btn');
                if (viewBtn) {
                    const session = this.sessions.find(s => s.id == viewBtn.dataset.id);
                    if (session) {
                        this.showSessionDetails(session);
                    }
                }
            });
        }
    }

    async refresh() {
        await this.fetchData();
        const container = document.getElementById('evaluations-section-container');
        if (container) {
            container.innerHTML = this._renderInner();
            this.mount();
        }
    }

    // ─── Modal Details ────────────────────────────────────────────────────────
    showSessionDetails(session) {
        const isAr = getLang() === 'ar';
        const s = (session.pipeline_status || '').toLowerCase();
        const isCompleted = s.includes('completed') || s.includes('done');
        
        const labels = {
            title: isAr ? "تفاصيل الجلسة والمعالجة" : "Session & Pipeline Details",
            sessionInfo: isAr ? "معلومات الجلسة" : "Session Information",
            session: isAr ? "رقم الجلسة" : "Session ID",
            appId: isAr ? "رقم التقديم" : "Application ID",
            type: isAr ? "نوع الجلسة" : "Session Type",
            status: isAr ? "حالة خط المعالجة" : "Pipeline Status",
            scheduledAt: isAr ? "تاريخ الجدولة" : "Scheduled At",
            completedAt: isAr ? "تاريخ الاكتمال" : "Completed At",
            viewReport: isAr ? "عرض تقرير الذكاء الاصطناعي" : "View AI Evaluation Report",
            trackPipeline: isAr ? "تتبع المعالجة (Pipeline)" : "Track Pipeline Progress"
        };

        const actionButtonHtml = isCompleted 
            ? `<button class="btn btn-primary" style="width:100%; padding:0.8rem; font-size:1rem; border-radius:8px; display:flex; justify-content:center; align-items:center; gap:0.5rem;" onclick="window.location.hash='/evaluations/${session.id}'; document.querySelector('.modal-close-btn').click();">
                   <i class="fas fa-chart-line"></i> ${labels.viewReport}
               </button>`
            : `<button class="btn btn-outline" style="width:100%; padding:0.8rem; font-size:1rem; border-radius:8px; display:flex; justify-content:center; align-items:center; gap:0.5rem; border-color:var(--primary-color); color:var(--primary-color);" onclick="window.location.hash='/pipeline/runs/${session.id}'; document.querySelector('.modal-close-btn').click();">
                   <i class="fas fa-project-diagram"></i> ${labels.trackPipeline}
               </button>`;

        const content = `
            <div style="padding: 0.5rem 0;">
                <div style="background:var(--bg-secondary); border-radius:10px; padding:1.2rem; margin-bottom:1.5rem; border:1px solid var(--border-color);">
                    <div style="display:flex; justify-content:space-between; margin-bottom:1rem; border-bottom:1px solid rgba(0,0,0,0.05); padding-bottom:0.8rem;">
                        <div style="color:var(--text-muted); font-size:0.85rem;">${labels.session}</div>
                        <div style="font-weight:700; font-family:monospace; font-size:1.1rem; color:var(--text-main);">#${session.id}</div>
                    </div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:1rem; border-bottom:1px solid rgba(0,0,0,0.05); padding-bottom:0.8rem;">
                        <div style="color:var(--text-muted); font-size:0.85rem;">${labels.appId}</div>
                        <div style="font-weight:600; color:var(--primary-color);">#${session.application_id || '—'}</div>
                    </div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:1rem; border-bottom:1px solid rgba(0,0,0,0.05); padding-bottom:0.8rem;">
                        <div style="color:var(--text-muted); font-size:0.85rem;">${labels.type}</div>
                        <div>${this._getTypeBadge(session.session_type)}</div>
                    </div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:1rem; border-bottom:1px solid rgba(0,0,0,0.05); padding-bottom:0.8rem;">
                        <div style="color:var(--text-muted); font-size:0.85rem;">${labels.status}</div>
                        <div>${this._getStatusBadge(session.pipeline_status)}</div>
                    </div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:1rem; border-bottom:1px solid rgba(0,0,0,0.05); padding-bottom:0.8rem;">
                        <div style="color:var(--text-muted); font-size:0.85rem;">${labels.scheduledAt}</div>
                        <div style="font-size:0.9rem; color:var(--text-main);">${this._formatDate(session.scheduled_at)}</div>
                    </div>
                    <div style="display:flex; justify-content:space-between;">
                        <div style="color:var(--text-muted); font-size:0.85rem;">${labels.completedAt}</div>
                        <div style="font-size:0.9rem; color:var(--text-main);">${this._formatDate(session.completed_at)}</div>
                    </div>
                </div>
                
                <div style="margin-top: 1.5rem;">
                    ${actionButtonHtml}
                </div>
            </div>
        `;
        
        const modal = new Modal({
            title: `<i class="fas fa-info-circle" style="color:var(--primary-color); margin-${isAr?'left':'right'}:0.5rem;"></i> ${labels.title}`,
            content: content
        });
        
        // Hide standard save button since we use custom action buttons inside content
        modal.show();
        const saveBtn = document.querySelector('.modal-save-btn');
        if(saveBtn) saveBtn.style.display = 'none'; 
    }
}