import { t } from '../core/i18n.js';
import { api } from '../core/api.js';
import { Modal } from '../components/Modal.js';
import { Toast } from '../components/Toast.js';

export class JobVersionsSection {
    constructor(params) {
        this.jobId = params.jobId;
        this.versions = [];
        this.job = null;
    }

    async fetchData() {
        try {
            sessionStorage.setItem('current_job_id', this.jobId);
            [this.job, this.versions] = await Promise.all([
                api.get(`/jobs/${this.jobId}`),
                api.get(`/jobs/${this.jobId}/versions`)
            ]);
            this.versions.forEach(version => {
                sessionStorage.setItem(`job_for_version_${version.id}`, this.jobId);
            });
        } catch (error) {
            Toast.show('Error loading job versions', 'error');
            this.versions = [];
        }
    }

    _modeLabel(mode) {
        const map = {
            manual: { label: 'Manual', color: 'var(--info)' },
            ai: { label: 'AI Generated', color: 'var(--success)' },
            hybrid: { label: 'Hybrid', color: 'var(--warning)' }
        };
        const m = map[mode] || { label: mode, color: 'var(--text-muted)' };
        return `<span style="background:${m.color};color:white;padding:0.2rem 0.6rem;border-radius:20px;font-size:0.8rem;font-weight:600;">${m.label}</span>`;
    }

    render() {
        const jobTitle = this.job ? this.job.title : `Job #${this.jobId}`;

        let cards = '';
        if (this.versions.length === 0) {
            cards = `
                <div style="text-align:center;padding:3rem;background:var(--surface-color);border-radius:var(--radius-lg);border:2px dashed var(--border-color);">
                    <i class="fas fa-code-branch" style="font-size:2.5rem;color:var(--primary-light);margin-bottom:1rem;display:block;"></i>
                    <h3 style="color:var(--text-muted);margin-bottom:0.5rem;">No Versions Yet</h3>
                    <p style="color:var(--text-muted);margin-bottom:1rem;">Create a version and then add the job description and evaluation criteria.</p>
                </div>`;
        } else {
            cards = this.versions.map(v => `
                <div class="card" style="margin-bottom:1rem;border-left:4px solid var(--primary-color);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem;">
                    <div>
                        <div style="display:flex;align-items:center;gap:0.8rem;margin-bottom:0.3rem;">
                            <h3 style="margin:0;">Version #${v.version_number}</h3>
                            ${this._modeLabel(v.criteria_mode)}
                        </div>
                        <div style="font-size:0.85rem;color:var(--text-muted);">
                            <i class="fas fa-calendar-alt"></i> Created: ${new Date(v.created_at).toLocaleDateString()}
                            &nbsp;|&nbsp;
                            <i class="fas fa-list-check"></i> Criteria: <strong>${v.criteria ? v.criteria.length : 0}</strong>
                            &nbsp;|&nbsp;
                            <i class="fas fa-file-alt"></i> JD: ${v.raw_jd_text ? `<span style="color:var(--success);">✓ Added</span>` : `<span style="color:var(--warning);">Not added</span>`}
                        </div>
                    </div>
                    <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
                        <button class="btn btn-primary"
                            onclick="window.location.hash='/jobs/${this.jobId}/versions/${v.id}'"
                            style="padding:0.4rem 0.9rem;font-size:0.85rem;">
                            <i class="fas fa-cog"></i> Manage JD & Criteria
                        </button>
                        <button class="btn btn-outline delete-version-btn" data-id="${v.id}"
                            style="padding:0.4rem 0.7rem;color:var(--danger);border-color:var(--danger);">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `).join('');
        }

        return `
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1.5rem;flex-wrap:wrap;gap:1rem;">
                <div>
                    <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-bottom:0.5rem;">
                        <button class="btn btn-outline" onclick="window.location.hash='/jobs'" style="font-size:0.85rem;">
                            <i class="fas fa-arrow-left"></i> Back to Jobs
                        </button>
                        <button class="btn btn-outline" onclick="window.location.hash='/candidates?jobId=${this.jobId}'" style="font-size:0.85rem;">
                            <i class="fas fa-users"></i> View All Candidates
                        </button>
                    </div>
                    <h1 style="color:var(--primary-color);">Job Versions</h1>
                    <p style="color:var(--text-muted);">${jobTitle}</p>
                </div>
                <button id="add-version-btn" class="btn btn-primary">
                    <i class="fas fa-plus"></i> New Version
                </button>
            </div>

            <div id="versions-container">
                ${cards}
            </div>
        `;
    }

    mount() {
        document.getElementById('add-version-btn').addEventListener('click', () => {
            this._openCreateForm();
        });

        document.getElementById('versions-container').addEventListener('click', (e) => {
            const delBtn = e.target.closest('.delete-version-btn');
            if (delBtn) this._deleteVersion(delBtn.dataset.id);
        });
    }

    _openCreateForm() {
        const content = `
            <div class="form-group">
                <label class="form-label">Criteria Mode</label>
                <div class="form-control" style="background:var(--bg-secondary);color:var(--text-main);">
                    Hybrid – AI suggests, I refine
                </div>
                <input type="hidden" id="ver-mode" value="hybrid">
            </div>
            <div style="background:var(--bg-color);border-radius:var(--radius-md);padding:1rem;margin-top:0.5rem;font-size:0.9rem;color:var(--text-muted);">
                <i class="fas fa-info-circle" style="color:var(--info);"></i>
                After creating the version, you'll be taken directly to the <strong>Version Detail</strong> page where you can:
                <ul style="margin:0.5rem 0 0 1rem;line-height:1.8;">
                    <li>Add / edit the full Job Description text</li>
                    <li>View AI-suggested evaluation criteria and refine them</li>
                    <li>Navigate to Applications for this version</li>
                </ul>
            </div>
        `;

        const modal = new Modal({
            title: 'Create New Job Version',
            content,
            saveText: 'Create & Set Up',
            onSave: async (modalEl) => {
                try {
                    const created = await api.post(`/jobs/${this.jobId}/versions`, {
                        criteria_mode: modalEl.querySelector('#ver-mode').value,
                        raw_jd_text: '',
                        structured_jd: {}
                    });
                    Toast.show('Version created! Set up the JD and criteria now.', 'success');
                    // Navigate immediately to the detail page
                    window.location.hash = `/jobs/${this.jobId}/versions/${created.id}`;
                } catch (e) {
                    Toast.show(e.message || 'Error creating version', 'error');
                    throw e;
                }
            }
        });
        modal.show();
    }

    async _deleteVersion(versionId) {
        if (!confirm('Delete this version and all its criteria?')) return;
        try {
            await api.fetch(`/jobs/${this.jobId}/versions/${versionId}`, { method: 'DELETE' });
            Toast.show('Version deleted', 'success');
            await this.refresh();
        } catch {
            Toast.show('Error deleting version', 'error');
        }
    }

    async refresh() {
        await this.fetchData();
        document.getElementById('app-content').innerHTML = this.render();
        this.mount();
    }
}
