import { t, getLang } from '../core/i18n.js';
import { api } from '../core/api.js';
import { Modal } from '../components/Modal.js';
import { Toast } from '../components/Toast.js';

export class ApplicationsSection {
    constructor(params) {
        this.versionId = params.versionId;
        this.jobId = sessionStorage.getItem(`job_for_version_${this.versionId}`) || '';
        this.applications = [];
        this.candidates = [];
        this.isLoading = false;
    }

    // ─── Data Fetching ────────────────────────────────────────────────────────
    async fetchData() {
        this.isLoading = true;
        try {
            if (this.versionId) {
                sessionStorage.setItem('current_version_id', this.versionId);
            }
            const [apps, cands] = await Promise.all([
                api.get(`/applications?job_version_id=${this.versionId}`),
                api.get('/candidates')
            ]);
            this.applications = Array.isArray(apps) ? apps : (apps.items || []);
            this.candidates = Array.isArray(cands) ? cands : (cands.items || []);
        } catch (error) {
            console.error('ApplicationsSection fetchData error:', error);
            Toast.show(getLang() === 'ar' ? 'فشل في تحميل الطلبات' : 'Failed to load applications', 'error');
            this.applications = [];
        } finally {
            this.isLoading = false;
        }
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────
    _candidateDetails(id) {
        const c = this.candidates.find(c => c.id == id);
        if (c) {
            return {
                name: c.full_name || `Candidate #${id}`,
                email: c.email || '',
                initials: (c.full_name || 'C').substring(0, 2).toUpperCase()
            };
        }
        return { name: `Candidate #${id}`, email: '', initials: 'C' };
    }

    _statusBadge(status) {
        const s = (status || '').toLowerCase();
        let bg = 'rgba(100,116,139,0.1)', color = '#64748b', icon = 'fa-circle';

        if (s === 'applied') { bg = 'rgba(100,116,139,0.1)'; color = '#64748b'; icon = 'fa-inbox'; }
        else if (s === 'screening') { bg = 'rgba(59,130,246,0.1)'; color = '#3b82f6'; icon = 'fa-search'; }
        else if (s === 'interview') { bg = 'rgba(245,158,11,0.1)'; color = '#f59e0b'; icon = 'fa-comments'; }
        else if (s === 'offer') { bg = 'rgba(139,92,246,0.1)'; color = '#8b5cf6'; icon = 'fa-file-signature'; }
        else if (s === 'hired') { bg = 'rgba(16,185,129,0.1)'; color = '#10b981'; icon = 'fa-check-circle'; }
        else if (s === 'rejected') { bg = 'rgba(239,68,68,0.1)'; color = '#ef4444'; icon = 'fa-times-circle'; }

        return `<span style="background:${bg}; color:${color}; padding:0.3rem 0.7rem; border-radius:8px; font-size:0.82rem; font-weight:600; display:inline-flex; align-items:center; gap:0.4rem; white-space:nowrap;">
            <i class="fas ${icon}" style="font-size:0.75rem;"></i> ${status.charAt(0).toUpperCase() + status.slice(1)}
        </span>`;
    }

    // ─── Render ───────────────────────────────────────────────────────────────
    render() {
        return `<div id="applications-section-container" style="width:100%;">${this._renderInner()}</div>`;
    }

    _renderInner() {
        const isAr = getLang() === 'ar';
        const labels = {
            title: isAr ? "طلبات التقديم" : "Applications",
            subtitle: isAr ? `نسخة الوظيفة #${this.versionId}` : `Job Version #${this.versionId}`,
            back: isAr ? "الرجوع للنسخ" : "Back to Versions",
            newApp: isAr ? "تقديم جديد" : "New Application",
            candidate: isAr ? "المرشح" : "Candidate",
            status: isAr ? "الحالة" : "Status",
            changeStatus: isAr ? "تغيير الحالة" : "Change Status",
            sessions: isAr ? "الجلسات" : "Sessions",
            actions: isAr ? "إجراءات" : "Actions",
            noApps: isAr ? "لا توجد طلبات تقديم حتى الآن. أضف الطلب الأول!" : "No applications yet. Add the first one!",
        };

        const backPath = this.jobId ? `/jobs/${this.jobId}/versions` : '/jobs';

        let tableRows = '';
        if (this.isLoading) {
            tableRows = Array(4).fill(0).map(() => `
                <tr>
                    ${Array(5).fill(0).map(() => `
                        <td style="padding:1rem;">
                            <div style="height:16px; background:linear-gradient(90deg,var(--bg-secondary) 25%,rgba(0,0,0,0.04) 50%,var(--bg-secondary) 75%); background-size:200% 100%; animation:shimmer 1.5s infinite; border-radius:4px;"></div>
                        </td>
                    `).join('')}
                </tr>
            `).join('');
        } else if (this.applications.length === 0) {
            tableRows = `
                <tr>
                    <td colspan="5" style="text-align:center; padding:4rem 2rem; color:var(--text-muted);">
                        <div style="width:60px; height:60px; background:rgba(var(--primary-color-rgb,79,70,229),0.1); border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 1rem;">
                            <i class="fas fa-inbox" style="font-size:1.8rem; color:var(--primary-color);"></i>
                        </div>
                        <div style="font-size:1.1rem; font-weight:600; color:var(--text-color);">${labels.noApps}</div>
                    </td>
                </tr>
            `;
        } else {
            tableRows = this.applications.map((app, idx) => {
                const cand = this._candidateDetails(app.candidate_id);
                const rowBg = idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.012)';
                const statuses = ['applied', 'screening', 'interview', 'offer', 'hired', 'rejected'];
                
                return `
                    <tr style="background:${rowBg}; border-bottom:1px solid var(--border-color); transition: background 0.2s;">
                        <td style="padding:1rem;">
                            <div style="display:flex; align-items:center; gap:0.75rem;">
                                <div style="width:36px; height:36px; border-radius:50%; background:rgba(var(--primary-color-rgb,79,70,229),0.12); color:var(--primary-color); display:flex; align-items:center; justify-content:center; font-weight:700; font-size:0.9rem; flex-shrink:0;">
                                    ${cand.initials}
                                </div>
                                <div>
                                    <div style="font-weight:600; font-size:0.95rem; color:var(--text-color);">${cand.name}</div>
                                    ${cand.email ? `<div style="font-size:0.8rem; color:var(--text-muted); margin-top:0.15rem;">${cand.email}</div>` : ''}
                                </div>
                            </div>
                        </td>
                        <td style="padding:1rem;">
                            <div id="status-badge-${app.id}">
                                ${this._statusBadge(app.status)}
                            </div>
                        </td>
                        <td style="padding:1rem;">
                            <select class="form-control status-select" data-id="${app.id}" style="padding:0.4rem 0.6rem; width:130px; font-size:0.85rem; border-radius:6px; cursor:pointer;">
                                ${statuses.map(s => `<option value="${s}" ${app.status === s ? 'selected' : ''}>${isAr ? s.toUpperCase() : s.charAt(0).toUpperCase() + s.slice(1)}</option>`).join('')}
                            </select>
                        </td>
                        <td style="padding:1rem;">
                            <button class="btn btn-outline" onclick="window.location.hash='/applications/${app.id}/sessions'" style="padding:0.4rem 0.75rem; font-size:0.85rem; display:inline-flex; align-items:center; gap:0.4rem; border-radius:6px;">
                                <i class="fas fa-video" style="color:var(--primary-color);"></i> ${labels.sessions}
                            </button>
                        </td>
                        <td style="padding:1rem;">
                            <button class="btn btn-outline delete-app-btn" data-id="${app.id}" style="padding:0.4rem 0.6rem; color:#ef4444; border-color:rgba(239,68,68,0.3); border-radius:6px;" title="${isAr ? 'حذف' : 'Delete'}">
                                <i class="fas fa-trash-alt"></i>
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
                .app-table th {
                    background: var(--bg-secondary);
                    color: var(--text-muted);
                    font-size: 0.8rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    padding: 1rem;
                    border-bottom: 2px solid var(--border-color);
                    text-align: ${isAr ? 'right' : 'left'};
                }
                .app-table td {
                    vertical-align: middle;
                }
                .status-select:focus {
                    border-color: var(--primary-color);
                    box-shadow: 0 0 0 2px rgba(var(--primary-color-rgb,79,70,229), 0.15);
                }
            </style>

            <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:1rem; margin-bottom:2rem;">
                <div>
                    <button class="btn btn-outline" onclick="window.location.hash='${backPath}'" style="margin-bottom:0.75rem; padding:0.4rem 0.8rem; font-size:0.85rem; border-radius:6px; display:inline-flex; align-items:center; gap:0.4rem;">
                        <i class="fas fa-arrow-${isAr ? 'right' : 'left'}"></i> ${labels.back}
                    </button>
                    <h1 style="color:var(--primary-color); font-size:1.8rem; font-weight:800; margin:0;">
                        <i class="fas fa-file-alt" style="margin-${isAr ? 'left' : 'right'}:0.5rem; opacity:0.8;"></i>${labels.title}
                    </h1>
                    <p style="color:var(--text-muted); margin:0.3rem 0 0; font-size:0.95rem;">${labels.subtitle}</p>
                </div>
                <button id="add-app-btn" class="btn btn-primary" style="display:inline-flex; align-items:center; gap:0.5rem; padding:0.6rem 1.2rem; border-radius:8px; font-weight:600; box-shadow:0 4px 12px rgba(var(--primary-color-rgb,79,70,229), 0.2);">
                    <i class="fas fa-user-plus"></i> ${labels.newApp}
                </button>
            </div>

            <div class="card" style="border-radius:12px; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,0.04); background:var(--bg-card); border:1px solid var(--border-color); padding:0;">
                <div class="table-responsive" style="overflow-x:auto; width:100%;">
                    <table class="table app-table" style="width:100%; border-collapse:collapse; margin:0;">
                        <thead>
                            <tr>
                                <th style="min-width:200px;">${labels.candidate}</th>
                                <th style="width:140px;">${labels.status}</th>
                                <th style="width:160px;">${labels.changeStatus}</th>
                                <th style="width:140px;">${labels.sessions}</th>
                                <th style="width:80px;">${labels.actions}</th>
                            </tr>
                        </thead>
                        <tbody id="app-tbody">
                            ${tableRows}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    // ─── Mount & Event Listeners ──────────────────────────────────────────────
    mount() {
        const isAr = getLang() === 'ar';

        // Open Create Modal
        const addBtn = document.getElementById('add-app-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this._openForm());
        }

        // Handle Status Change
        const tbody = document.getElementById('app-tbody');
        if (tbody) {
            tbody.addEventListener('change', async (e) => {
                const sel = e.target.closest('.status-select');
                if (!sel) return;

                const appId = sel.dataset.id;
                const newStatus = sel.value;
                const badgeContainer = document.getElementById(`status-badge-${appId}`);
                
                // Disable select during request
                sel.disabled = true;

                try {
                    // Assuming your API supports PATCH. If only fetch is supported:
                    await api.fetch(`/applications/${appId}/status`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: newStatus })
                    });
                    
                    Toast.show(isAr ? 'تم تحديث الحالة بنجاح' : 'Status updated successfully', 'success');
                    
                    // Optimistic UI Update locally
                    const app = this.applications.find(a => a.id == appId);
                    if (app) app.status = newStatus;
                    if (badgeContainer) badgeContainer.innerHTML = this._statusBadge(newStatus);
                    
                } catch (error) {
                    console.error('Status update error:', error);
                    Toast.show(isAr ? 'حدث خطأ أثناء تحديث الحالة' : 'Error updating status', 'error');
                    
                    // Revert select back to original value
                    const app = this.applications.find(a => a.id == appId);
                    if (app) sel.value = app.status;
                } finally {
                    sel.disabled = false;
                }
            });

            // Handle Delete
            tbody.addEventListener('click', (e) => {
                const delBtn = e.target.closest('.delete-app-btn');
                if (delBtn) this._delete(delBtn.dataset.id);
            });
        }
    }

    // ─── Actions ──────────────────────────────────────────────────────────────
    _openForm() {
        const isAr = getLang() === 'ar';
        const candOptions = this.candidates.map(c =>
            `<option value="${c.id}">${c.full_name || 'Candidate'} (${c.email || 'No Email'})</option>`
        ).join('');

        const content = `
            <div class="form-group" style="margin-bottom:1rem;">
                <label class="form-label" style="font-weight:600; margin-bottom:0.5rem; display:block;">
                    ${isAr ? 'اختر المرشح' : 'Select Candidate'}
                </label>
                <select id="app-cand-id" class="form-control" style="width:100%; padding:0.6rem; border-radius:6px; border:1px solid var(--border-color);" required>
                    <option value="">${isAr ? '-- اختر مرشحاً --' : '-- Choose Candidate --'}</option>
                    ${candOptions}
                </select>
            </div>
        `;

        const modal = new Modal({
            title: isAr ? 'إنشاء طلب تقديم' : 'Create Application',
            content,
            saveText: isAr ? 'إنشاء' : 'Create',
            onSave: async (modalEl) => {
                const candId = modalEl.querySelector('#app-cand-id').value;
                if (!candId) { 
                    Toast.show(isAr ? 'برجاء اختيار مرشح' : 'Please select a candidate', 'error'); 
                    throw new Error('No candidate selected'); 
                }
                
                try {
                    await api.post('/applications', {
                        candidate_id: parseInt(candId),
                        job_version_id: parseInt(this.versionId),
                        status: 'applied'
                    });
                    Toast.show(isAr ? 'تم إنشاء الطلب بنجاح!' : 'Application created!', 'success');
                    await this.refresh();
                } catch (e) {
                    Toast.show(e.message || (isAr ? 'خطأ في إنشاء الطلب' : 'Error creating application'), 'error');
                    throw e;
                }
            }
        });
        modal.show();
    }

    async _delete(id) {
        const isAr = getLang() === 'ar';
        if (!confirm(isAr ? 'هل أنت متأكد من حذف هذا الطلب؟' : 'Are you sure you want to delete this application?')) return;
        
        try {
            await api.fetch(`/applications/${id}`, { method: 'DELETE' });
            Toast.show(isAr ? 'تم حذف الطلب' : 'Application deleted', 'success');
            await this.refresh();
        } catch {
            Toast.show(isAr ? 'حدث خطأ أثناء الحذف' : 'Error deleting application', 'error');
        }
    }

    async refresh() {
        await this.fetchData();
        const container = document.getElementById('applications-section-container');
        if (container) {
            container.innerHTML = this._renderInner();
            this.mount();
        }
    }
}