import { getLang } from '../core/i18n.js';
import { api } from '../core/api.js';
import { Modal } from '../components/Modal.js';
import { Toast } from '../components/Toast.js';

const criteriaGenerationRequests = new Set();

export class JobVersionDetailSection {
    constructor(params) {
        this.jobId = params.jobId;
        this.versionId = params.versionId;
        this.version = null;
    }
    // دالة مساعدة لتحديث جدول المرشحين محلياً وبدون Refresh
    _updateCandidatesTable() {
        const isAr = getLang() === 'ar';
        const tbody = document.getElementById('candidates-tbody');
        if (!tbody) return;

        if (this.applications.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--text-muted);">
                <i class="fas fa-user-slash" style="font-size:2rem;display:block;margin-bottom:0.5rem;"></i>
                ${isAr ? 'لا يوجد مرشحين معينين لهذه النسخة بعد.' : 'No candidates assigned to this version yet.'}
            </td></tr>`;
        } else {
            tbody.innerHTML = this.applications.map(app => `
                <tr>
                    <td><strong>${this._candidateName(app)}</strong></td>
                    <td>${this._statusBadge(app.status)}</td>
                    <td>
                        <select class="form-control status-select" data-id="${app.id}"
                            style="padding:0.2rem 0.4rem;display:inline-block;width:auto;font-size:0.82rem;">
                            ${['applied','screening','interview','offer','hired','rejected'].map(s => {
                                const labels = isAr ? { applied: 'تقديم جديد', screening: 'فحص مبدئي', interview: 'مقابلة', offer: 'عرض عمل', hired: 'تم تعيينه', rejected: 'مرفوض' } : { applied: 'Applied', screening: 'Screening', interview: 'Interview', offer: 'Offer', hired: 'Hired', rejected: 'Rejected' };
                                return `<option value="${s}" ${app.status===s?'selected':''}>${labels[s] || s}</option>`;
                            }).join('')}
                        </select>
                    </td>
                    <td>
                        <button class="btn btn-primary"
                            onclick="window.location.hash='/applications/${app.id}/sessions'"
                            style="padding:0.35rem 0.8rem;font-size:0.85rem;display:flex;align-items:center;gap:0.4rem;">
                            <i class="fas fa-video"></i> ${isAr ? 'جلسات التقييم' : 'Sessions'}
                        </button>
                    </td>
                    <td>
                        <button class="btn btn-outline delete-app-btn" data-id="${app.id}"
                            style="padding:0.35rem 0.6rem;color:var(--danger);border-color:var(--danger);">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
        }

        // تحديث عداد المرشحين بجوار العنوان
        const header = document.querySelector('h2 i.fa-users')?.parentElement;
        if (header) {
            const badge = header.querySelector('span');
            if (badge) badge.textContent = this.applications.length;
        }
    }

    // دالة مساعدة لتحديث كروت المعايير محلياً وبدون Refresh
    _updateCriteriaUI() {
        const container = document.getElementById('criteria-container');
        if (container) {
            container.innerHTML = this._criteriaCards(this.version.criteria || []);
        }

        // تحديث أرقام المعايير والوزن الإجمالي في العنوان
        const header = document.querySelector('h2 i.fa-list-check')?.parentElement;
        if (header) {
            const badges = header.querySelectorAll('span');
            if (badges.length >= 2) {
                const totalWeight = (this.version.criteria || []).reduce((sum, c) => sum + (c.weight || 0), 0);
                badges[0].textContent = (this.version.criteria || []).length;
                badges[1].textContent = `${getLang() === 'ar' ? 'الإجمالي' : 'Total'}: ${Number(totalWeight.toFixed(1))}%`;
            }
        }
    }
    async fetchData() {
        try {
            sessionStorage.setItem('current_job_id', this.jobId);
            sessionStorage.setItem(`job_for_version_${this.versionId}`, this.jobId);
            const [version, apps] = await Promise.all([
                api.get(`/jobs/${this.jobId}/versions/${this.versionId}`),
                api.get(`/applications?job_version_id=${this.versionId}`)
            ]);
            this.version = version;
            this.applications = Array.isArray(apps) ? apps : [];
        } catch (e) {
            Toast.show('Error loading details', 'error');
            this.version = null;
            this.applications = [];
        }
    }

    _priorityBadge(level) {
        const isAr = getLang() === 'ar';
        const map = { high: 'var(--danger)', medium: 'var(--warning)', low: 'var(--success)' };
        const labelMap = isAr ? { high: 'مرتفع', medium: 'متوسط', low: 'منخفض' } : { high: 'High', medium: 'Medium', low: 'Low' };
        const label = labelMap[level] || level;
        return `<span style="background:${map[level]||'var(--info)'};color:white;padding:0.15rem 0.5rem;border-radius:20px;font-size:0.75rem;font-weight:600;">${label}</span>`;
    }

    _candidateName(app) {
        // app is the full application object with candidate details
        if (app.candidate && app.candidate.full_name) {
            return app.candidate.full_name;
        }
        return `Candidate #${app.candidate_id}`;
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
        const isAr = getLang() === 'ar';
        const labels = isAr ? {
            applied: 'تقديم جديد',
            screening: 'فحص مبدئي',
            interview: 'مقابلة',
            offer: 'عرض عمل',
            hired: 'تم التوظيف',
            rejected: 'مرفوض'
        } : {
            applied: 'Applied',
            screening: 'Screening',
            interview: 'Interview',
            offer: 'Offer',
            hired: 'Hired',
            rejected: 'Rejected'
        };
        return `<span style="background:${color}; color:white; padding:0.2rem 0.6rem; border-radius:20px; font-size:0.8rem; font-weight:600;">${labels[status] || status}</span>`;
    }

    _criteriaCards(criteria) {
        const isAr = getLang() === 'ar';
        if (!criteria || criteria.length === 0) {
            return `
                <div style="text-align:center;padding:2rem;color:var(--text-muted);background:var(--bg-color);border-radius:var(--radius-md);">
                    <i class="fas fa-list-check" style="font-size:2rem;margin-bottom:0.5rem;display:block;"></i>
                    ${isAr ? 'لا توجد معايير بعد. أضف بعضها أو دع الذكاء الاصطناعي يقترحها.' : 'No criteria yet. Add some or let AI suggest them.'}
                </div>`;
        }
        return criteria.map(c => `
            <div class="card" style="margin-bottom:1rem;border-left:4px solid ${c.is_mandatory ? 'var(--danger)' : 'var(--primary-color)'};">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:0.5rem;">
                    <div style="flex:1;min-width:200px;">
                        <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.4rem;flex-wrap:wrap;">
                            <strong style="font-size:1rem;">${c.name}</strong>
                            ${this._priorityBadge(c.priority_level)}
                            ${c.is_mandatory ? `<span style="background:var(--danger);color:white;padding:0.1rem 0.4rem;border-radius:20px;font-size:0.72rem;">${isAr?'مطلوب':'Required'}</span>` : ''}
                        </div>
                        <p style="color:var(--text-muted);font-size:0.9rem;margin-bottom:0.4rem;">${c.description || (isAr ? 'لا يوجد وصف.' : 'No description.')}</p>
                        <div style="font-size:0.85rem;color:var(--text-muted);">
                            ${isAr?'الوزن':'Weight'}: <strong style="color:var(--primary-color);">${Number(c.weight.toFixed(1))}%</strong>
                        </div>
                    </div>
                    <div style="display:flex;gap:0.4rem;align-items:center;">
                        <button class="btn btn-outline edit-criteria-btn"
                            data-id="${c.id}" data-name="${c.name}" data-desc="${(c.description||'').replace(/"/g,'&quot;')}"
                            data-weight="${c.weight}" data-mandatory="${c.is_mandatory}" data-priority="${c.priority_level}"
                            style="padding:0.3rem 0.6rem;font-size:0.8rem;">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline delete-criteria-btn" data-id="${c.id}"
                            style="padding:0.3rem 0.6rem;font-size:0.8rem;color:var(--danger);border-color:var(--danger);">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    render() {
        const isAr = getLang() === 'ar';
        if (!this.version) {
            return `<div style="text-align:center;padding:3rem;"><p>${isAr ? 'لم يتم العثور على النسخة.' : 'Version not found.'}</p>
                <button class="btn btn-outline" onclick="window.location.hash='/jobs/${this.jobId}/versions'">${isAr ? 'رجوع' : 'Go Back'}</button></div>`;
        }
        const v = this.version;
        const modeLabels = isAr
            ? { manual: 'يدوي', ai: 'مستخرج بالذكاء الاصطناعي', hybrid: 'هجين' }
            : { manual: 'Manual', ai: 'AI Generated', hybrid: 'Hybrid' };
        const totalCriteriaWeight = (v.criteria || []).reduce((sum, c) => sum + (c.weight || 0), 0);
        const totalWeightDisplay = Number(totalCriteriaWeight.toFixed(1));

        // Generate Candidates Rows
        let tableRows = '';
        if (this.applications.length === 0) {
            tableRows = `<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--text-muted);">
                <i class="fas fa-user-slash" style="font-size:2rem;display:block;margin-bottom:0.5rem;"></i>
                ${isAr ? 'لا يوجد مرشحين معينين لهذه النسخة بعد.' : 'No candidates assigned to this version yet.'}
            </td></tr>`;
        } else {
            tableRows = this.applications.map(app => `
                <tr>
                    <td><strong>${this._candidateName(app)}</strong></td>
                    <td>${this._statusBadge(app.status)}</td>
                    <td>
                        <select class="form-control status-select" data-id="${app.id}"
                            style="padding:0.2rem 0.4rem;display:inline-block;width:auto;font-size:0.82rem;">
                            ${['applied','screening','interview','offer','hired','rejected'].map(s => {
                                const labels = isAr ? {
                                    applied: 'تقديم جديد',
                                    screening: 'فحص مبدئي',
                                    interview: 'مقابلة',
                                    offer: 'عرض عمل',
                                    hired: 'تم تعيينه',
                                    rejected: 'مرفوض'
                                } : {
                                    applied: 'Applied',
                                    screening: 'Screening',
                                    interview: 'Interview',
                                    offer: 'Offer',
                                    hired: 'Hired',
                                    rejected: 'Rejected'
                                };
                                return `<option value="${s}" ${app.status===s?'selected':''}>${labels[s] || s}</option>`;
                            }).join('')}
                        </select>
                    </td>
                    <td>
                        <button class="btn btn-primary"
                            onclick="window.location.hash='/applications/${app.id}/sessions'"
                            style="padding:0.35rem 0.8rem;font-size:0.85rem;display:flex;align-items:center;gap:0.4rem;">
                            <i class="fas fa-video"></i> ${isAr ? 'جلسات التقييم' : 'Sessions'}
                        </button>
                    </td>
                    <td>
                        <button class="btn btn-outline delete-app-btn" data-id="${app.id}"
                            style="padding:0.35rem 0.6rem;color:var(--danger);border-color:var(--danger);">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
        }

        return `
            <!-- Breadcrumb / Header -->
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1.5rem;flex-wrap:wrap;gap:1rem;">
                <div>
                    <button class="btn btn-outline" onclick="window.location.hash='/jobs/${this.jobId}/versions'" style="margin-bottom:0.5rem;font-size:0.85rem;">
                        <i class="fas fa-arrow-left"></i> ${isAr ? 'العودة إلى النسخ' : 'Back to Versions'}
                    </button>
                    <h1 style="color:var(--primary-color);">${isAr ? 'النسخة' : 'Version'} #${v.version_number}</h1>
                    <p style="color:var(--text-muted);">
                        ${isAr ? 'وضع تحديد المعايير' : 'Mode'}: <span style="font-weight:600;">${modeLabels[v.criteria_mode] || v.criteria_mode}</span> &nbsp;|&nbsp;
                        ${isAr ? 'تاريخ الإنشاء' : 'Created'}: ${new Date(v.created_at).toLocaleDateString()}
                    </p>
                </div>
            </div>

            <!-- Two Column Layout: JD and Criteria -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 2rem; align-items: start;">
                <!-- JD Section -->
                <div class="card" style="height: 100%; display: flex; flex-direction: column;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
                        <h2 style="font-size:1.1rem;color:var(--primary-color);"><i class="fas fa-file-alt"></i> ${isAr ? 'الوصف الوظيفي' : 'Job Description'}</h2>
                        <button id="edit-jd-btn" class="btn btn-outline" style="font-size:0.85rem;padding:0.3rem 0.7rem;">
                            <i class="fas fa-edit"></i> ${isAr ? 'تعديل الوصف الوظيفي' : 'Edit JD'}
                        </button>
                    </div>
                    <div id="jd-display" style="background:var(--bg-color);border-radius:var(--radius-md);padding:1.2rem;line-height:1.8;white-space:pre-wrap;font-size:0.95rem;color:var(--text-main);flex: 1;max-height:350px;overflow-y:auto;">
${v.raw_jd_text || `<em style="color:var(--text-muted);">${isAr ? 'لا يوجد وصف وظيفي مضاف بعد.' : 'No job description added yet.'}</em>`}
                    </div>
                </div>

                <!-- Criteria Section -->
                <div class="card" style="height: 100%; display: flex; flex-direction: column;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;flex-wrap:wrap;gap:0.5rem;">
                        <h2 style="font-size:1.1rem;color:var(--primary-color);">
                            <i class="fas fa-list-check"></i> ${isAr ? 'معايير التقييم' : 'Evaluation Criteria'}
                            <span style="background:var(--primary-color);color:white;border-radius:20px;padding:0.1rem 0.5rem;font-size:0.8rem;margin-left:0.4rem;">
                                ${v.criteria ? v.criteria.length : 0}
                            </span>
                            <span style="background:var(--secondary-color);color:white;border-radius:20px;padding:0.1rem 0.5rem;font-size:0.8rem;margin-left:0.4rem;">
                                ${isAr ? 'الإجمالي' : 'Total'}: ${totalWeightDisplay}%
                            </span>
                        </h2>
                        <div style="display:flex;gap:0.5rem;">
                            ${v.criteria_mode !== 'manual' ? `
                            <button id="ai-extract-btn" class="btn btn-outline" style="font-size:0.85rem;border-color:var(--primary-color);color:var(--primary-color);padding:0.3rem 0.6rem;">
                                <i class="fas fa-robot"></i> ${isAr ? 'اقتراح بالذكاء الاصطناعي' : 'Suggest AI'}
                            </button>
                            ` : ''}
                            <button id="add-criteria-btn" class="btn btn-primary" style="font-size:0.85rem;padding:0.3rem 0.6rem;">
                                <i class="fas fa-plus"></i> ${isAr ? 'إضافة معيار' : 'Add'}
                            </button>
                        </div>
                    </div>
                    <div id="criteria-container" style="flex: 1; max-height: 350px; overflow-y: auto;">
                        ${this._criteriaCards(v.criteria || [])}
                    </div>
                </div>
            </div>

            <!-- Candidates Assigned Section -->
            <div class="card" style="margin-bottom: 2rem;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.2rem;flex-wrap:wrap;gap:0.5rem;">
                    <h2 style="font-size:1.1rem;color:var(--primary-color);">
                        <i class="fas fa-users"></i> ${isAr ? 'المرشحون المعينون للتقييم على هذه النسخة' : 'Candidates Assigned to this Version'}
                        <span style="background:var(--primary-color);color:white;border-radius:20px;padding:0.1rem 0.5rem;font-size:0.8rem;margin-left:0.4rem;">
                            ${this.applications.length}
                        </span>
                    </h2>
                    <button id="assign-candidate-btn" class="btn btn-primary" style="font-size:0.85rem;">
                        <i class="fas fa-user-plus"></i> ${isAr ? 'تعيين مرشح للنسخة' : 'Assign Candidate'}
                    </button>
                </div>

                <div class="table-responsive">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>${isAr ? 'المرشح' : 'Candidate'}</th>
                                <th>${isAr ? 'الحالة الحالية' : 'Current Status'}</th>
                                <th>${isAr ? 'تغيير الحالة' : 'Change Status'}</th>
                                <th>${isAr ? 'جلسات التقييم' : 'Sessions'}</th>
                                <th>${isAr ? 'حذف تعيين' : 'Delete'}</th>
                            </tr>
                        </thead>
                        <tbody id="candidates-tbody">${tableRows}</tbody>
                    </table>
                </div>
            </div>
        `;
    }

    mount() {
        const isAr = getLang() === 'ar';

        // Edit JD
        const editJdBtn = document.getElementById('edit-jd-btn');
        if (editJdBtn) {
            // إزالة المستمع القديم قبل إضافة جديد
            if (editJdBtn._clickHandler) {
                editJdBtn.removeEventListener('click', editJdBtn._clickHandler);
            }
            editJdBtn._clickHandler = () => this._openEditJD();
            editJdBtn.addEventListener('click', editJdBtn._clickHandler);
        }

        // AI Extract
        const aiExtractBtn = document.getElementById('ai-extract-btn');
        if (aiExtractBtn) {
            // إزالة المستمع القديم قبل إضافة جديد
            if (aiExtractBtn._clickHandler) {
                aiExtractBtn.removeEventListener('click', aiExtractBtn._clickHandler);
            }
            aiExtractBtn._clickHandler = async (e) => {
                e.preventDefault();
                await this._triggerAIExtraction();
            };
            aiExtractBtn.addEventListener('click', aiExtractBtn._clickHandler);
        }

        // Add criteria
        const addCriteriaBtn = document.getElementById('add-criteria-btn');
        if (addCriteriaBtn) {
            // إزالة المستمع القديم قبل إضافة جديد
            if (addCriteriaBtn._clickHandler) {
                addCriteriaBtn.removeEventListener('click', addCriteriaBtn._clickHandler);
            }
            addCriteriaBtn._clickHandler = () => this._openCriteriaForm(null);
            addCriteriaBtn.addEventListener('click', addCriteriaBtn._clickHandler);
        }

        // Assign Candidate
        const assignCandidateBtn = document.getElementById('assign-candidate-btn');
        if (assignCandidateBtn) {
            // إزالة المستمع القديم قبل إضافة جديد
            if (assignCandidateBtn._clickHandler) {
                assignCandidateBtn.removeEventListener('click', assignCandidateBtn._clickHandler);
            }
            assignCandidateBtn._clickHandler = () => this._openAssignCandidateForm();
            assignCandidateBtn.addEventListener('click', assignCandidateBtn._clickHandler);
        }

        // Edit / Delete criteria (event delegation)
        const criteriaContainer = document.getElementById('criteria-container');
        if (criteriaContainer) {
            // إزالة المستمع القديم قبل إضافة جديد
            if (criteriaContainer._clickHandler) {
                criteriaContainer.removeEventListener('click', criteriaContainer._clickHandler);
            }
            criteriaContainer._clickHandler = (e) => {
                const editBtn = e.target.closest('.edit-criteria-btn');
                const delBtn = e.target.closest('.delete-criteria-btn');
                if (editBtn) {
                    const d = editBtn.dataset;
                    this._openCriteriaForm({
                        id: d.id, name: d.name, description: d.desc,
                        weight: parseFloat(d.weight), is_mandatory: d.mandatory === 'true',
                        priority_level: d.priority
                    });
                }
                if (delBtn) {
                    this._deleteCriteria(delBtn.dataset.id);
                }
            };
            criteriaContainer.addEventListener('click', criteriaContainer._clickHandler);
        }

        // Candidates actions (event delegation)
        const candidatesTbody = document.getElementById('candidates-tbody');
        if (candidatesTbody) {
            // إزالة المستمعين القدماء قبل إضافة جديد
            if (candidatesTbody._changeHandler) {
                candidatesTbody.removeEventListener('change', candidatesTbody._changeHandler);
            }
            candidatesTbody._changeHandler = async (e) => {
                const sel = e.target.closest('.status-select');
                if (!sel) return;
                try {
                    await api.fetch(`/applications/${sel.dataset.id}/status`, {
                        method: 'PATCH',
                        body: JSON.stringify({ status: sel.value })
                    });

                    // تحديث الحالة في المصفوفة المحلية
                    const appId = parseInt(sel.dataset.id);
                    const appIndex = this.applications.findIndex(a => a.id === appId);
                    if (appIndex !== -1) {
                        this.applications[appIndex].status = sel.value;
                    }
                    this._updateCandidatesTable(); // تحديث فوري بدون refresh

                    Toast.show(isAr ? 'تم تحديث حالة المرشح بنجاح!' : 'Status updated successfully!', 'success');
                } catch {
                    Toast.show(isAr ? 'حدث خطأ أثناء التحديث.' : 'Error updating status', 'error');
                }
            };
            candidatesTbody.addEventListener('change', candidatesTbody._changeHandler);

            if (candidatesTbody._clickHandler) {
                candidatesTbody.removeEventListener('click', candidatesTbody._clickHandler);
            }
            candidatesTbody._clickHandler = (e) => {
                const del = e.target.closest('.delete-app-btn');
                if (del) {
                    this._deleteApplication(del.dataset.id);
                }
            };
            candidatesTbody.addEventListener('click', candidatesTbody._clickHandler);
        }
    }

    async _triggerAIExtraction() {
        const container = document.getElementById('criteria-container');
        const btn = document.getElementById('ai-extract-btn');
        const isAr = getLang() === 'ar';
        const requestKey = `${this.jobId}:${this.versionId}`;

        if (criteriaGenerationRequests.has(requestKey) || btn?.disabled) {
            Toast.show(isAr ? 'يتم توليد المعايير بالفعل، انتظر حتى يكتمل الطلب الحالي.' : 'Criteria generation is already running. Please wait.', 'info');
            return;
        }

        if (!this.version.raw_jd_text || !this.version.raw_jd_text.trim()) {
            Toast.show(isAr ? 'برجاء إضافة الوصف الوظيفي أولاً.' : 'Please add a Job Description first.', 'error');
            return;
        }

        criteriaGenerationRequests.add(requestKey);
        const originalBtnHtml = btn.innerHTML;
        btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${isAr ? 'جاري الاستخراج...' : 'Generating...'}`;
        btn.disabled = true;

        // Show premium skeleton loading state inside the criteria container
        container.innerHTML = `
            <div style="text-align:center;padding:3.5rem 2rem;background:var(--surface-color);border-radius:var(--radius-lg);border:1px solid var(--border-color);display:flex;flex-direction:column;align-items:center;gap:1.2rem;box-shadow:var(--shadow-sm);margin-top:1rem;">
                <div class="spinner" style="width:45px;height:45px;border-width:4px;"></div>
                <div style="color:var(--primary-color);font-weight:700;font-size:1.15rem;display:flex;align-items:center;gap:0.6rem;">
                    <i class="fas fa-robot fa-bounce" style="font-size:1.3rem;"></i>
                    ${isAr ? 'يقوم الذكاء الاصطناعي بتحليل الوصف الوظيفي الآن...' : 'AI is scanning the Job Description...'}
                </div>
                <p style="color:var(--text-muted);font-size:0.9rem;max-width:420px;line-height:1.7;margin:0;">
                    ${isAr
                        ? 'يقوم نموذج الذكاء الاصطناعي باستخراج المؤهلات الرئيسية والمهارات المطلوبة وتحديد الأوزان المناسبة لكل معيار. يستغرق ذلك عادة من 5 إلى 10 ثوانٍ.'
                        : 'Our AI model is extracting key qualifications, mandatory requirements, and preferred technical skills, then matching appropriate weights. This usually takes 5-10 seconds.'}
                </p>
            </div>
        `;

        try {
            await api.post(`/jobs/${this.jobId}/versions/${this.versionId}/generate-criteria`);
            Toast.show(isAr ? 'اكتمل استخراج المعايير بنجاح!' : 'AI extraction complete! Criteria cards generated.', 'success');

            // إعادة تحميل المعايير من الخادم وتحديث الـ UI محلياً
            try {
                const updated = await api.fetch(`/jobs/${this.jobId}/versions/${this.versionId}`);
                if (updated) {
                    this.version = updated;
                    this._updateCriteriaUI();
                }
            } catch (err) {
                // في حالة الخطأ في إعادة التحميل الجزئية، أخفِ الخطأ وأظهر Toast إضافي
                Toast.show(isAr ? 'تم إنشاء المعايير ولكن حدث خطأ في إعادة تحميلها. جرّب تحديث الصفحة.' : 'Criteria created but failed to reload. Try refreshing the page.', 'warning');
            }
        } catch (e) {
            Toast.show(e.message || (isAr ? 'فشل استخراج المعايير. حاول مجدداً.' : 'AI extraction failed. Try again.'), 'error');
        } finally {
            criteriaGenerationRequests.delete(requestKey);
        }
    }

    _openEditJD() {
        const isAr = getLang() === 'ar';
        const isAI = this.version.criteria_mode === 'ai' || this.version.criteria_mode === 'hybrid';
        const content = `
            <div class="form-group">
                <label class="form-label">${isAr ? 'وضع تحديد المعايير' : 'Criteria Mode'}</label>
                <div class="form-control" style="background:var(--bg-secondary);color:var(--text-main);">
                    ${isAr ? 'هجين – يقترح النظام وأستطيع التعديل' : 'Hybrid – AI suggests, I refine'}
                </div>
                <input type="hidden" id="edit-ver-mode" value="hybrid">
            </div>
            <div class="form-group">
                <label class="form-label">${isAr ? 'نص الوصف الوظيفي' : 'Job Description Text'}</label>
                <textarea id="edit-jd-text" class="form-control"
                    style="height:280px;line-height:1.8;resize:vertical;"
                    placeholder="${isAr ? 'قم بلصق الوصف الوظيفي الكامل هنا...' : 'Paste the full job description here...'}">${this.version.raw_jd_text || ''}</textarea>
            </div>
            <div style="background:linear-gradient(135deg,rgba(0,180,136,0.08),rgba(0,180,136,0.03));
                border:1px solid var(--primary-color);border-radius:var(--radius-md);padding:0.8rem 1rem;
                display:flex;align-items:center;gap:0.7rem;font-size:0.9rem;">
                <i class="fas fa-info-circle" style="color:var(--primary-color);font-size:1.2rem;"></i>
                <span>
                    ${isAr
                        ? 'بعد حفظ الوصف الوظيفي، يمكنك الضغط على زر <strong>"اقتراح بالذكاء الاصطناعي"</strong> في قسم المعايير لتوليدها.'
                        : 'After saving, you can click the <strong>"Suggest with AI"</strong> button in the criteria section to generate them.'}
                </span>
            </div>
        `;
        const modal = new Modal({
            title: isAr ? 'تعديل الوصف الوظيفي' : 'Edit Job Description',
            content,
            saveText: isAr ? 'حفظ الوصف الوظيفي' : 'Save JD',
            onSave: async (modalEl) => {
                const jdText = modalEl.querySelector('#edit-jd-text').value;
                const mode = modalEl.querySelector('#edit-ver-mode').value;

                try {
                    await api.fetch(`/jobs/${this.jobId}/versions/${this.versionId}`, {
                        method: 'PATCH',
                        body: JSON.stringify({ raw_jd_text: jdText, criteria_mode: mode })
                    });

                    // تحديث محلي فوري
                    this.version.raw_jd_text = jdText;
                    this.version.criteria_mode = mode;

                    // تحديث الـ DOM مباشرة بدون refresh
                    const jdDisplay = document.getElementById('jd-display');
                    if (jdDisplay) {
                        if (jdText && jdText.trim()) {
                            jdDisplay.textContent = jdText;
                        } else {
                            jdDisplay.innerHTML = `<em style="color:var(--text-muted);">${isAr ? 'لا يوجد وصف وظيفي مضاف بعد.' : 'No job description added yet.'}</em>`;
                        }
                    }

                    Toast.show(isAr ? 'تم حفظ الوصف الوظيفي بنجاح!' : 'Job description updated successfully!', 'success');
                } catch (e) {
                    Toast.show(e.message || (isAr ? 'خطأ أثناء التحديث' : 'Error updating JD'), 'error');
                    throw e;
                }
            }
        });
        modal.show();
    }

_openAssignCandidateForm() {
        const isAr = getLang() === 'ar';
        let currentTab = 'search';
        let selectedCandidateId = null;
        let importedCandidates = [];
        let selectedImportedRows = new Set();
        let selectedImportFile = null;
        const align = isAr ? 'right' : 'left';

        // تصميم مشابه تماماً لـ _openCriteriaForm
        const content = `
            <div id="assign-modal-container">
                <!-- أزرار التبويبات -->
                <div style="display:flex; border-bottom: 2px solid var(--border-color); margin-bottom: 1.5rem; gap: 0;">
                    <button type="button" class="assign-tab-btn" data-target="search" style="flex:1; border:none; border-bottom: 3px solid var(--primary-color); background:none; font-weight:bold; padding:0.8rem; color:var(--primary-color); cursor:pointer; font-size:1rem; transition:all 0.2s;">
                        <i class="fas fa-search"></i> ${isAr ? 'بحث عن مرشح' : 'Search'}
                    </button>
                    <button type="button" class="assign-tab-btn" data-target="import" style="flex:1; border:none; border-bottom: 3px solid transparent; background:none; font-weight:normal; padding:0.8rem; color:var(--text-muted); cursor:pointer; font-size:1rem; transition:all 0.2s;">
                        <i class="fas fa-file-excel"></i> ${isAr ? 'استيراد CSV' : 'Import CSV'}
                    </button>
                    <button type="button" class="assign-tab-btn" data-target="new" style="flex:1; border:none; border-bottom: 3px solid transparent; background:none; font-weight:normal; padding:0.8rem; color:var(--text-muted); cursor:pointer; font-size:1rem; transition:all 0.2s;">
                        <i class="fas fa-user-plus"></i> ${isAr ? 'مرشح جديد' : 'New Candidate'}
                    </button>
                </div>

                <!-- 1. تبويب البحث -->
                <div id="tab-search" class="assign-tab-content" style="display:block;">
                    <div class="form-group" style="margin-bottom:1rem;">
                        <label class="form-label" style="font-weight:600;">${isAr ? 'ابحث بالبريد أو الاسم' : 'Search by email or name'} <span style="color:var(--danger);">*</span></label>
                        <input type="text" id="search-cand-input" class="form-control" style="width:100%;" placeholder="${isAr ? 'اكتب الاسم أو البريد الإلكتروني...' : 'Type name or email...'}">
                    </div>
                    <div id="search-results-container" style="max-height: 200px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: 6px; padding: 1rem; text-align: center; color: var(--text-muted); margin-bottom: 1rem;">
                        ${isAr ? 'ابدأ بالكتابة للبحث...' : 'Start typing to search...'}
                    </div>
                    <div style="background:var(--bg-secondary); padding:1rem; border-radius:6px; border:1px solid var(--border-color); font-weight:600;">
                        ${isAr ? 'المرشح المختار:' : 'Selected:'} <span id="selected-cand-name" style="color:var(--primary-color);">${isAr ? 'لا يوجد' : 'None'}</span>
                    </div>
                </div>

                <!-- 2. تبويب الاستيراد -->
                <div id="tab-import" class="assign-tab-content" style="display:none;">
                    <div class="form-group" style="margin-bottom:1rem;">
                        <label class="form-label" style="font-weight:600;">${isAr ? 'رفع ملف' : 'Upload File'} <span style="color:var(--danger);">*</span></label>
                        <input type="file" id="import-file-input" class="form-control" accept=".csv,.txt,.tsv,.xlsx,.xls,.xlsm" style="width:100%;">
                        <small style="color:var(--text-muted); display:block; margin-top:0.5rem;">
                            ${isAr ? 'يجب أن يحتوي الملف على: الاسم، البريد، الهاتف، المصدر، لينكدإن، جيت هاب' : 'Columns: Name, Email, Phone, Source, LinkedIn, GitHub. CSV, TSV, XLS and XLSX are supported.'}
                        </small>
                    </div>
                    <div id="import-preview-container" style="display:none; max-height: 250px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: 6px;">
                        <table style="width:100%; border-collapse:collapse; font-size:0.9rem;">
                            <thead>
                                <tr style="background:var(--bg-secondary); border-bottom:1px solid var(--border-color);">
                                    <th style="padding:0.8rem; text-align:center; width:50px;"><input type="checkbox" id="select-all-import" checked style="width:16px;height:16px;"></th>
                                    <th style="padding:0.8rem; text-align:${align};">${isAr ? 'الاسم' : 'Name'}</th>
                                    <th style="padding:0.8rem; text-align:${align};">${isAr ? 'البريد' : 'Email'}</th>
                                </tr>
                            </thead>
                            <tbody id="import-table-body"></tbody>
                        </table>
                    </div>
                </div>

                <!-- 3. تبويب مرشح جديد (بتصميم الـ Grid المشابه لمعايير التقييم) -->
                <div id="tab-new" class="assign-tab-content" style="display:none;">
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;margin-bottom:1rem;">
                        <div class="form-group">
                            <label class="form-label" style="font-weight:600;">${isAr ? 'الاسم الكامل' : 'Full Name'} <span style="color:var(--danger);">*</span></label>
                            <input type="text" id="new-cand-name" class="form-control" style="width:100%;" placeholder="${isAr ? 'مثال: أحمد محمد' : 'e.g. John Doe'}">
                        </div>
                        <div class="form-group">
                            <label class="form-label" style="font-weight:600;">${isAr ? 'البريد الإلكتروني' : 'Email'} <span style="color:var(--danger);">*</span></label>
                            <input type="email" id="new-cand-email" class="form-control" style="width:100%;" placeholder="email@example.com">
                        </div>
                    </div>

                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;margin-bottom:1rem;">
                        <div class="form-group">
                            <label class="form-label" style="font-weight:600;">${isAr ? 'رقم الهاتف' : 'Phone'}</label>
                            <input type="text" id="new-cand-phone" class="form-control" style="width:100%;">
                        </div>
                        <div class="form-group">
                            <label class="form-label" style="font-weight:600;">${isAr ? 'المصدر' : 'Source'}</label>
                            <input type="text" id="new-cand-source" class="form-control" style="width:100%;" placeholder="${isAr ? 'مثال: LinkedIn, موقع الشركة' : 'e.g. LinkedIn, Website'}">
                        </div>
                    </div>

                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;margin-bottom:1rem;">
                        <div class="form-group">
                            <label class="form-label" style="font-weight:600;">${isAr ? 'رابط لينكد إن' : 'LinkedIn URL'}</label>
                            <input type="url" id="new-cand-linkedin" class="form-control" style="width:100%;" placeholder="https://linkedin.com/in/...">
                        </div>
                        <div class="form-group">
                            <label class="form-label" style="font-weight:600;">${isAr ? 'رابط جيت هاب' : 'GitHub URL'}</label>
                            <input type="url" id="new-cand-github" class="form-control" style="width:100%;" placeholder="https://github.com/...">
                        </div>
                    </div>
                </div>
            </div>
        `;

        const modal = new Modal({
            title: isAr ? 'إضافة مرشح للنسخة' : 'Add Candidate to Version',
            content,
            saveText: isAr ? 'حفظ وتعيين' : 'Save & Assign',
            onSave: async (modalEl) => {
                try {
                    // معالجة الحفظ بناءً على التبويب النشط
                    if (currentTab === 'search') {
                        if (!selectedCandidateId) throw new Error(isAr ? 'الرجاء اختيار مرشح من قائمة البحث.' : 'Please select a candidate from search.');

                        const appResponse = await api.post('/applications', {
                            candidate_id: selectedCandidateId,
                            job_version_id: parseInt(this.versionId),
                            status: 'applied'
                        });
                        if (!appResponse || !appResponse.id) {
                            throw new Error(isAr ? 'فشل تعيين المرشح' : 'Failed to assign candidate');
                        }
                        // إضافة إلى الـ state مع ربط بيانات المرشح
                        const selectedName = document.getElementById('selected-cand-name').textContent;
                        appResponse.candidate = { id: selectedCandidateId, full_name: selectedName };
                        this.applications.push(appResponse);
                        Toast.show(isAr ? 'تم تعيين المرشح بنجاح!' : 'Candidate assigned successfully!', 'success');
                        // تحديث الجدول محلياً
                        this._updateCandidatesTable();

                    } else if (currentTab === 'import') {
                        if (!selectedImportFile) throw new Error(isAr ? 'الرجاء اختيار ملف للاستيراد.' : 'Please choose a file to import.');

                        const formData = new FormData();
                        if (importedCandidates.length > 0) {
                            if (selectedImportedRows.size === 0) {
                                throw new Error(isAr ? 'الرجاء تحديد مرشح واحد على الأقل من القائمة.' : 'Please select at least one candidate.');
                            }
                            const headers = ['full_name', 'email', 'phone', 'source', 'linkedin_url', 'github_url'];
                            const csvValue = (value) => `"${String(value || '').replace(/"/g, '""')}"`;
                            const selectedRows = [...selectedImportedRows]
                                .sort((a, b) => a - b)
                                .map(idx => importedCandidates[idx])
                                .filter(Boolean);
                            const csvContent = [
                                headers.join(','),
                                ...selectedRows.map(row => headers.map(header => csvValue(row[header])).join(','))
                            ].join('\n');
                            const selectedBlob = new Blob([csvContent], { type: 'text/csv' });
                            formData.append('files', selectedBlob, selectedImportFile.name || 'selected-import.csv');
                        } else {
                            formData.append('files', selectedImportFile);
                        }
                        const result = await api.post(`/applications/job-versions/${this.versionId}/bulk-import`, formData);
                        const linked = Array.isArray(result?.linked) ? result.linked : [];
                        const skipped = Array.isArray(result?.skipped) ? result.skipped : [];
                        const errors = Array.isArray(result?.errors) ? result.errors : [];
                        const fileErrors = Array.isArray(result?.files_errors) ? result.files_errors : [];

                        const existingAppIds = new Set(this.applications.map(app => app.id));
                        linked.forEach(item => {
                            if (item.application && !existingAppIds.has(item.application.id)) {
                                this.applications.push(item.application);
                                existingAppIds.add(item.application.id);
                            }
                        });
                        this._updateCandidatesTable();

                        const failedCount = skipped.length + errors.length + fileErrors.length;
                        if (failedCount > 0) {
                            const rowDetails = [...skipped, ...errors]
                                .slice(0, 5)
                                .map(item => `${item.email || `row ${item.row || '?'}`}: ${item.reason}`)
                                .join(' | ');
                            const fileDetails = fileErrors.slice(0, 2).map(item => `${item.file}: ${item.error}`).join(' | ');
                            const detailText = [rowDetails, fileDetails].filter(Boolean).join(' | ');
                            Toast.show(
                                isAr
                                    ? `تم ربط ${linked.length}، وتم رفض ${failedCount}. ${detailText}`
                                    : `Linked ${linked.length}, rejected ${failedCount}. ${detailText}`,
                                linked.length ? 'info' : 'error'
                            );
                        } else {
                            Toast.show(isAr ? `تم ربط ${linked.length} مرشح بنجاح!` : `${linked.length} candidate(s) imported and linked!`, 'success');
                        }

                    } else if (currentTab === 'new') {
                        const fullName = document.getElementById('new-cand-name').value.trim();
                        const email = document.getElementById('new-cand-email').value.trim();

                        if (!fullName || !email) throw new Error(isAr ? 'حقل الاسم والبريد الإلكتروني مطلوبان.' : 'Name and email are required.');

                        // التحقق من وجود البريد الإلكتروني مسبقاً
                        let existingCand = null;
                        try {
                            const res = await api.get(`/candidates?search=${encodeURIComponent(email)}`);
                            const candidates = Array.isArray(res) ? res : (res.data || []);
                            existingCand = candidates.find(c => c.email.toLowerCase() === email.toLowerCase());
                        } catch (e) {}

                        if (existingCand) {
                            throw new Error(isAr
                                ? `البريد الإلكتروني "${email}" مسجل بالفعل باسم "${existingCand.full_name}"`
                                : `Email "${email}" is already registered as "${existingCand.full_name}"`);
                        }

                        let newCand;
                        try {
                            newCand = await api.post('/candidates', {
                                full_name: fullName,
                                email: email,
                                phone: document.getElementById('new-cand-phone').value.trim() || null,
                                source: document.getElementById('new-cand-source').value.trim() || 'Manual',
                                linkedin_url: document.getElementById('new-cand-linkedin').value.trim() || null,
                                github_url: document.getElementById('new-cand-github').value.trim() || null
                            });
                        } catch (createErr) {
                            throw new Error(createErr.message || (isAr ? 'فشل إنشاء المرشح' : 'Failed to create candidate'));
                        }

                        let appResponse;
                        try {
                            appResponse = await api.post('/applications', {
                                candidate_id: newCand.id,
                                job_version_id: parseInt(this.versionId),
                                status: 'applied'
                            });
                        } catch (appErr) {
                            throw new Error(appErr.message || (isAr ? 'فشل تعيين المرشح' : 'Failed to assign candidate'));
                        }

                        if (!appResponse || !appResponse.id) {
                            throw new Error(isAr ? 'فشل إنشاء التعيين' : 'Failed to create application assignment');
                        }
                        // إضافة إلى الـ state مع ربط كامل بيانات المرشح
                        appResponse.candidate = newCand;
                        this.applications.push(appResponse);
                        Toast.show(isAr ? 'تم إنشاء المرشح وتعيينه بنجاح!' : 'Candidate created and assigned!', 'success');
                        // تحديث الجدول محلياً
                        this._updateCandidatesTable();
                    }
                    // تم إزالة await this.refresh() - التحديث يحدث محلياً فقط
                } catch (e) {
                    Toast.show(e.message || (isAr ? 'حدث خطأ' : 'An error occurred'), 'error');
                    throw e; // إبقاء النافذة مفتوحة إذا كان هناك خطأ
                }
            }
        });
        modal.show();

        // ---------------------------------------------------------
        // ربط الأحداث (Event Listeners) بعد ظهور النافذة
        // ---------------------------------------------------------

        // 1. منطق تبديل التبويبات (Tabs Logic)
        const tabBtns = document.querySelectorAll('.assign-tab-btn');
        const tabContents = document.querySelectorAll('.assign-tab-content');

        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                currentTab = btn.getAttribute('data-target');

                // إعادة ضبط شكل الأزرار
                tabBtns.forEach(b => {
                    b.style.borderBottomColor = 'transparent';
                    b.style.color = 'var(--text-muted)';
                    b.style.fontWeight = 'normal';
                });

                // تفعيل الزر الحالي
                btn.style.borderBottomColor = 'var(--primary-color)';
                btn.style.color = 'var(--primary-color)';
                btn.style.fontWeight = 'bold';

                // إخفاء كل المحتوى وإظهار المحتوى المطلوب فقط
                tabContents.forEach(tc => tc.style.display = 'none');
                document.getElementById(`tab-${currentTab}`).style.display = 'block';
            });
        });

        // 2. منطق البحث (Search Logic)
        const searchInput = document.getElementById('search-cand-input');
        let searchTimeout;
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                const query = e.target.value.trim();
                const resultsDiv = document.getElementById('search-results-container');

                if (query.length < 2) {
                    resultsDiv.innerHTML = isAr ? 'ابحث بحرفين أو أكثر...' : 'Type at least 2 chars...';
                    return;
                }

                searchTimeout = setTimeout(async () => {
                    try {
                        resultsDiv.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                        const results = await api.get(`/candidates?search=${encodeURIComponent(query)}`);
                        const candidates = Array.isArray(results) ? results : (results?.data || []);

                        if (candidates.length === 0) {
                            resultsDiv.innerHTML = isAr ? 'لا توجد نتائج' : 'No results found';
                            return;
                        }

                        resultsDiv.innerHTML = candidates.map(c => `
                            <div class="search-cand-item" data-id="${c.id}" data-name="${c.full_name}" style="padding:0.8rem; border-bottom:1px solid var(--border-color); cursor:pointer; text-align:${align};">
                                <div style="font-weight:600; color:var(--text-main);">${c.full_name}</div>
                                <div style="font-size:0.85rem; color:var(--text-muted);">${c.email}</div>
                            </div>
                        `).join('');

                        document.querySelectorAll('.search-cand-item').forEach(item => {
                            item.addEventListener('click', () => {
                                document.querySelectorAll('.search-cand-item').forEach(i => i.style.background = 'transparent');
                                item.style.background = 'rgba(var(--primary-color-rgb, 79,70,229), 0.1)';
                                selectedCandidateId = parseInt(item.getAttribute('data-id'));
                                document.getElementById('selected-cand-name').textContent = item.getAttribute('data-name');
                            });
                        });
                    } catch (err) {
                        resultsDiv.innerHTML = `<span style="color:var(--danger);">${isAr ? 'خطأ في جلب النتائج' : 'Error loading results'}</span>`;
                    }
                }, 400);
            });
        }

        // 3. منطق الاستيراد (Import Logic)
        const importInput = document.getElementById('import-file-input');
        if (importInput) {
            importInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;
                selectedImportFile = file;
                importedCandidates = [];
                selectedImportedRows.clear();

                const previewContainer = document.getElementById('import-preview-container');
                const tbody = document.getElementById('import-table-body');
                if (previewContainer) previewContainer.style.display = 'none';
                if (tbody) tbody.innerHTML = '';

                const ext = (file.name.split('.').pop() || '').toLowerCase();
                if (!['csv', 'txt', 'tsv'].includes(ext)) {
                    Toast.show(isAr ? 'سيتم فحص الملف وربطه عند الحفظ.' : 'The file will be validated and linked when you save.', 'info');
                    return;
                }

                const reader = new FileReader();
                reader.onload = (evt) => {
                    try {
                        const content = evt.target.result;
                        const delimiter = ext === 'tsv' ? '\t' : ',';
                        const rows = content.split('\n').map((line, idx) => {
                            if (idx === 0 || !line.trim()) return null; // تخطي الرأس والأسطر الفارغة
                            const cells = line.split(delimiter).map(c => c.trim().replace(/^"|"$/g, ''));
                            if (!cells[0] || !cells[1]) return null;

                            return {
                                full_name: cells[0],
                                email: cells[1],
                                phone: cells[2] || '',
                                source: cells[3] || '',
                                linkedin_url: cells[4] || '',
                                github_url: cells[5] || ''
                            };
                        }).filter(r => r !== null);

                        if (rows.length === 0) {
                            Toast.show(isAr ? 'الملف فارغ أو التنسيق غير صحيح' : 'File is empty or invalid format', 'error');
                            return;
                        }

                        importedCandidates = rows;
                        selectedImportedRows.clear();
                        for (let i = 0; i < rows.length; i++) selectedImportedRows.add(i);

                        const tbody = document.getElementById('import-table-body');
                        tbody.innerHTML = rows.map((row, idx) => `
                            <tr style="border-bottom:1px solid var(--border-color);">
                                <td style="padding:0.6rem; text-align:center;"><input type="checkbox" class="import-row-cb" data-idx="${idx}" checked style="width:16px;height:16px;"></td>
                                <td style="padding:0.6rem; text-align:${align}; font-weight:600;">${row.full_name}</td>
                                <td style="padding:0.6rem; text-align:${align};">${row.email}</td>
                            </tr>
                        `).join('');

                        document.getElementById('import-preview-container').style.display = 'block';

                        // تفعيل خيار تحديد الكل
                        const selectAllCb = document.getElementById('select-all-import');
                        selectAllCb.checked = true;
                        selectAllCb.addEventListener('change', (ev) => {
                            document.querySelectorAll('.import-row-cb').forEach(cb => {
                                cb.checked = ev.target.checked;
                                const index = parseInt(cb.getAttribute('data-idx'));
                                if (ev.target.checked) selectedImportedRows.add(index);
                                else selectedImportedRows.delete(index);
                            });
                        });

                        document.querySelectorAll('.import-row-cb').forEach(cb => {
                            cb.addEventListener('change', (ev) => {
                                const index = parseInt(ev.target.getAttribute('data-idx'));
                                if (ev.target.checked) selectedImportedRows.add(index);
                                else {
                                    selectedImportedRows.delete(index);
                                    selectAllCb.checked = false;
                                }
                            });
                        });
                    } catch (err) {
                        Toast.show(isAr ? 'حدث خطأ أثناء قراءة الملف' : 'Error reading file', 'error');
                    }
                };
                reader.readAsText(file);
            });
        }
    }
    async _deleteApplication(id) {
        const isAr = getLang() === 'ar';
        if (!confirm(isAr ? 'هل أنت متأكد من إلغاء تعيين هذا المرشح من هذه النسخة؟' : 'Are you sure you want to remove this candidate from this version?')) return;
        try {
            // البحث عن الصف في الـ DOM وإزالته فوراً (Optimistic update)
            const row = document.querySelector(`button[data-id="${id}"]`)?.closest('tr');
            if (row) {
                row.style.opacity = '0.5';
                row.style.pointerEvents = 'none';
            }

            await api.fetch(`/applications/${id}`, { method: 'DELETE' });

            // إزالة من الـ state
            this.applications = this.applications.filter(app => app.id !== id);

            // إزالة من الـ DOM مباشرة
            if (row) {
                row.style.transition = 'all 0.3s ease';
                row.style.opacity = '0';
                row.style.height = '0';
                row.style.padding = '0';
                setTimeout(() => row.remove(), 300);
            }

            // تحديث العدد الإجمالي
            const totalEl = document.getElementById('candidates-total');
            if (totalEl) totalEl.textContent = this.applications.length;

            Toast.show(isAr ? 'تمت إزالة المرشح بنجاح.' : 'Candidate removed successfully.', 'success');
        } catch (err) {
            Toast.show(isAr ? 'حدث خطأ أثناء الحذف.' : 'Error removing candidate.', 'error');
            // إعادة الصف إلى حالته الطبيعية عند الخطأ
            const row = document.querySelector(`button[data-id="${id}"]`)?.closest('tr');
            if (row) {
                row.style.opacity = '1';
                row.style.pointerEvents = 'auto';
                row.style.height = 'auto';
                row.style.padding = '';
            }
        }
    }

    _openCriteriaForm(existing) {
        const isEdit = !!existing;
        const isAr = getLang() === 'ar';
        const content = `
            <div class="form-group">
                <label class="form-label">${isAr ? 'اسم المعيار' : 'Criteria Name'} <span style="color:var(--danger);">*</span></label>
                <input type="text" id="crit-name" class="form-control" value="${isEdit ? existing.name : ''}"
                    placeholder="e.g. Communication Skills" required>
            </div>
            <div class="form-group">
                <label class="form-label">${isAr ? 'الوصف' : 'Description'}</label>
                <textarea id="crit-desc" class="form-control" style="height:80px;resize:none;"
                    placeholder="What does this criteria measure?">${isEdit ? (existing.description||'') : ''}</textarea>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
                <div class="form-group">
                    <label class="form-label">${isAr ? 'الوزن (%)' : 'Weight (%)'} <span style="color:var(--danger);">*</span></label>
                    <input type="number" id="crit-weight" class="form-control"
                        value="${isEdit ? existing.weight : 10}" min="1" max="100" step="0.5">
                </div>
                <div class="form-group">
                    <label class="form-label">${isAr ? 'مستوى الأهمية' : 'Priority Level'}</label>
                    <select id="crit-priority" class="form-control">
                        <option value="high" ${isEdit && existing.priority_level==='high'?'selected':''}>${isAr?'مرتفع':'High'}</option>
                        <option value="medium" ${(!isEdit || existing.priority_level==='medium')?'selected':''}>${isAr?'متوسط':'Medium'}</option>
                        <option value="low" ${isEdit && existing.priority_level==='low'?'selected':''}>${isAr?'منخفض':'Low'}</option>
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;">
                    <input type="checkbox" id="crit-mandatory" ${isEdit && existing.is_mandatory ? 'checked' : ''}>
                    <span>${isAr ? 'معيار إجباري (مطلوب)' : 'Mark as Mandatory Criteria'}</span>
                </label>
            </div>
        `;
        const modal = new Modal({
            title: isEdit ? (isAr ? 'تعديل المعيار' : 'Edit Criteria') : (isAr ? 'إضافة معيار تقييم' : 'Add Evaluation Criteria'),
            content,
            saveText: isEdit ? (isAr ? 'تحديث' : 'Update') : (isAr ? 'إضافة' : 'Add'),
            onSave: async (modalEl) => {
                const name = modalEl.querySelector('#crit-name').value.trim();
                if (!name) { Toast.show(isAr ? 'اسم المعيار مطلوب.' : 'Criteria name is required', 'error'); throw new Error(); }
                const weightValue = parseFloat(modalEl.querySelector('#crit-weight').value) || 0;
                const payload = {
                    name,
                    description: modalEl.querySelector('#crit-desc').value || null,
                    weight: weightValue,
                    priority_level: modalEl.querySelector('#crit-priority').value,
                    is_mandatory: modalEl.querySelector('#crit-mandatory').checked
                };

                const currentTotal = (this.version?.criteria || []).reduce((sum, c) => sum + (c.weight || 0), 0);
                const existingWeight = isEdit ? (existing.weight || 0) : 0;
                if (weightValue <= 0 || weightValue > 100) {
                    Toast.show(isAr ? 'يجب أن يكون الوزن بين 1 و 100.' : 'Weight must be between 1 and 100.', 'error');
                    throw new Error();
                }
                if (currentTotal - existingWeight + weightValue > 100) {
                    Toast.show(isAr ? 'الإجمالي لا يجب أن يتجاوز 100%.' : 'Total criteria weight cannot exceed 100%.', 'error');
                    throw new Error();
                }
                try {
                    if (isEdit) {
                        await api.fetch(`/jobs/${this.jobId}/versions/${this.versionId}/criteria/${existing.id}`, { method: 'DELETE' });
                        const updatedCrit = await api.post(`/jobs/${this.jobId}/versions/${this.versionId}/criteria`, payload);

                        // تحديث المصفوفة محلياً
                        const savedData = updatedCrit?.id ? updatedCrit : { id: existing.id, ...payload };
                        const index = this.version.criteria.findIndex(c => c.id == existing.id);
                        if (index !== -1) this.version.criteria[index] = savedData;
                        else this.version.criteria.push(savedData);

                        Toast.show(isAr ? 'تم تحديث المعيار!' : 'Criteria updated', 'success');
                    } else {
                        const newCrit = await api.post(`/jobs/${this.jobId}/versions/${this.versionId}/criteria`, payload);
                        const savedData = newCrit?.id ? newCrit : { id: Date.now(), ...payload };

                        if (!this.version.criteria) this.version.criteria = [];
                        this.version.criteria.push(savedData);
                        Toast.show(isAr ? 'تمت إضافة المعيار!' : 'Criteria added', 'success');
                    }

                    // تحديث واجهة المعايير فورياً بدون refresh
                    this._updateCriteriaUI();
                } catch (e) {
                    Toast.show(e.message || (isAr ? 'خطأ أثناء الحفظ' : 'Error saving criteria'), 'error');
                    throw e;
                }
            }
        });
        modal.show();
    }

    async _deleteCriteria(criteriaId) {
        const isAr = getLang() === 'ar';
        if (!confirm(isAr ? 'حذف هذا المعيار؟' : 'Delete this criteria?')) return;
        try {
            await api.fetch(`/jobs/${this.jobId}/versions/${this.versionId}/criteria/${criteriaId}`, { method: 'DELETE' });

            // التحديث المحلي - إزالة من المصفوفة
            this.version.criteria = this.version.criteria.filter(c => c.id != criteriaId);
            this._updateCriteriaUI();

            Toast.show(isAr ? 'تم حذف المعيار بنجاح.' : 'Criteria deleted', 'success');
        } catch {
            Toast.show(isAr ? 'حدث خطأ أثناء الحذف.' : 'Error deleting criteria', 'error');
        }
    }

    async refresh() {
        await this.fetchData();
        document.getElementById('app-content').innerHTML = this.render();
        this.mount();
    }
}
