import { t } from '../core/i18n.js';
import { api } from '../core/api.js';
import { Modal } from '../components/Modal.js';
import { Toast } from '../components/Toast.js';

export class ApplicationsSection {
    constructor(params) {
        this.versionId = params.versionId;
        this.jobId = sessionStorage.getItem(`job_for_version_${this.versionId}`) || '';
        this.applications = [];
        this.candidates = [];
    }

    async fetchData() {
        try {
            if (this.versionId) {
                sessionStorage.setItem('current_version_id', this.versionId);
            }
            const [apps, cands] = await Promise.all([
                api.get(`/applications?job_version_id=${this.versionId}`),
                api.get('/candidates')
            ]);
            this.applications = Array.isArray(apps) ? apps : [];
            this.candidates = Array.isArray(cands) ? cands : [];
        } catch (error) {
            Toast.show(t('error'), 'error');
            this.applications = [];
        }
    }

    _candidateName(id) {
        const c = this.candidates.find(c => c.id === id);
        return c ? c.full_name : `Candidate #${id}`;
    }

    _statusBadge(status) {
        const colors = {
            applied:   '#6c757d',
            screening: 'var(--info)',
            interview: 'var(--warning)',
            offer:     'var(--primary-color)',
            hired:     'var(--success)',
            rejected:  'var(--danger)'
        };
        const color = colors[status] || 'var(--text-muted)';
        return `<span style="background:${color}; color:white; padding:0.2rem 0.6rem; border-radius:20px; font-size:0.8rem; font-weight:600;">${status}</span>`;
    }

    render() {
        const backPath = this.jobId ? `/jobs/${this.jobId}/versions` : '/jobs';
        let tableRows = '';
        if (this.applications.length === 0) {
            tableRows = `<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--text-muted);">
                <i class="fas fa-inbox" style="font-size:2rem;display:block;margin-bottom:0.5rem;"></i>
                No applications yet. Add the first one!
            </td></tr>`;
        } else {
            tableRows = this.applications.map(app => `
                <tr>
                    <td>${this._candidateName(app.candidate_id)}</td>
                    <td>${this._statusBadge(app.status)}</td>
                    <td>
                        <select class="form-control status-select" data-id="${app.id}" 
                            style="padding:0.2rem 0.4rem;display:inline-block;width:auto;font-size:0.82rem;">
                            ${['applied','screening','interview','offer','hired','rejected'].map(s =>
                                `<option value="${s}" ${app.status===s?'selected':''}>${s}</option>`
                            ).join('')}
                        </select>
                    </td>
                    <td>
                        <button class="btn btn-primary" 
                            onclick="window.location.hash='/applications/${app.id}/sessions'"
                            style="padding:0.3rem 0.7rem;font-size:0.85rem;">
                            <i class="fas fa-video"></i> Sessions
                        </button>
                    </td>
                    <td>
                        <button class="btn btn-outline delete-app-btn" data-id="${app.id}"
                            style="padding:0.3rem 0.6rem;color:var(--danger);border-color:var(--danger);">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
        }

        return `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;">
                <div>
                    <button class="btn btn-outline" onclick="window.location.hash='${backPath}'" style="margin-bottom:0.5rem;">
                        <i class="fas fa-arrow-left"></i> Back to Versions
                    </button>
                    <h1 style="color:var(--primary-color);">Applications</h1>
                    <p style="color:var(--text-muted);">Job Version #${this.versionId}</p>
                </div>
                <button id="add-app-btn" class="btn btn-primary">
                    <i class="fas fa-user-plus"></i> New Application
                </button>
            </div>
            <div class="card table-responsive">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Candidate</th>
                            <th>Status Badge</th>
                            <th>Change Status</th>
                            <th>Sessions</th>
                            <th>Delete</th>
                        </tr>
                    </thead>
                    <tbody id="app-tbody">${tableRows}</tbody>
                </table>
            </div>
        `;
    }

    mount() {
        document.getElementById('add-app-btn').addEventListener('click', () => this._openForm());

        document.getElementById('app-tbody').addEventListener('change', async (e) => {
            const sel = e.target.closest('.status-select');
            if (!sel) return;
            try {
                await api.fetch(`/applications/${sel.dataset.id}/status`, {
                    method: 'PATCH',
                    body: JSON.stringify({ status: sel.value })
                });
                Toast.show('Status updated', 'success');
            } catch {
                Toast.show('Error updating status', 'error');
            }
        });

        document.getElementById('app-tbody').addEventListener('click', (e) => {
            const del = e.target.closest('.delete-app-btn');
            if (del) this._delete(del.dataset.id);
        });
    }

    _openForm() {
        const candOptions = this.candidates.map(c =>
            `<option value="${c.id}">${c.full_name} (${c.email})</option>`
        ).join('');

        const content = `
            <div class="form-group">
                <label class="form-label">Select Candidate</label>
                <select id="app-cand-id" class="form-control" required>
                    <option value="">-- Choose Candidate --</option>
                    ${candOptions}
                </select>
            </div>
        `;

        const modal = new Modal({
            title: 'Create Application',
            content,
            saveText: 'Create',
            onSave: async (modalEl) => {
                const candId = modalEl.querySelector('#app-cand-id').value;
                if (!candId) { Toast.show('Please select a candidate', 'error'); throw new Error(); }
                try {
                    await api.post('/applications', {
                        candidate_id: parseInt(candId),
                        job_version_id: parseInt(this.versionId),
                        status: 'applied'
                    });
                    Toast.show('Application created!', 'success');
                    await this.refresh();
                } catch (e) {
                    Toast.show(e.message || 'Error creating application', 'error');
                    throw e;
                }
            }
        });
        modal.show();
    }

    async _delete(id) {
        if (!confirm('Delete this application?')) return;
        try {
            await api.fetch(`/applications/${id}`, { method: 'DELETE' });
            Toast.show('Application deleted', 'success');
            await this.refresh();
        } catch {
            Toast.show('Error deleting application', 'error');
        }
    }

    async refresh() {
        await this.fetchData();
        document.getElementById('app-content').innerHTML = this.render();
        this.mount();
    }
}
