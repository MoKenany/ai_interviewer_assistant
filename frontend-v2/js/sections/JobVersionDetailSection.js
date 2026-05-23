import { t, getLang } from '../core/i18n.js';
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

    async fetchData() {
        try {
            sessionStorage.setItem('current_job_id', this.jobId);
            sessionStorage.setItem(`job_for_version_${this.versionId}`, this.jobId);
            const [version, apps, cands] = await Promise.all([
                api.get(`/jobs/${this.jobId}/versions/${this.versionId}`),
                api.get(`/applications?job_version_id=${this.versionId}`),
                api.get('/candidates')
            ]);
            this.version = version;
            this.applications = Array.isArray(apps) ? apps : [];
            this.candidates = Array.isArray(cands) ? cands : [];
        } catch (e) {
            Toast.show('Error loading details', 'error');
            this.version = null;
            this.applications = [];
            this.candidates = [];
        }
    }

    _priorityBadge(level) {
        const isAr = getLang() === 'ar';
        const map = { high: 'var(--danger)', medium: 'var(--warning)', low: 'var(--success)' };
        const labelMap = isAr ? { high: 'مرتفع', medium: 'متوسط', low: 'منخفض' } : { high: 'High', medium: 'Medium', low: 'Low' };
        const label = labelMap[level] || level;
        return `<span style="background:${map[level]||'var(--info)'};color:white;padding:0.15rem 0.5rem;border-radius:20px;font-size:0.75rem;font-weight:600;">${label}</span>`;
    }

    _candidateName(id) {
        const c = this.candidates.find(cand => cand.id === id);
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
                            ${isAr?'الوزن':'Weight'}: <strong style="color:var(--primary-color);">${c.weight}/10</strong>
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
                    <td><strong>${this._candidateName(app.candidate_id)}</strong></td>
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
        document.getElementById('edit-jd-btn')?.addEventListener('click', () => {
            this._openEditJD();
        });

        // AI Extract
        document.getElementById('ai-extract-btn')?.addEventListener('click', async (e) => {
            e.preventDefault();
            await this._triggerAIExtraction();
        });

        // Add criteria
        document.getElementById('add-criteria-btn')?.addEventListener('click', () => {
            this._openCriteriaForm(null);
        });

        // Assign Candidate
        document.getElementById('assign-candidate-btn')?.addEventListener('click', () => {
            this._openAssignCandidateForm();
        });

        // Edit / Delete criteria (event delegation)
        document.getElementById('criteria-container')?.addEventListener('click', (e) => {
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
        });

        // Candidates actions (event delegation)
        document.getElementById('candidates-tbody')?.addEventListener('change', async (e) => {
            const sel = e.target.closest('.status-select');
            if (!sel) return;
            try {
                await api.fetch(`/applications/${sel.dataset.id}/status`, {
                    method: 'PATCH',
                    body: JSON.stringify({ status: sel.value })
                });
                Toast.show(isAr ? 'تم تحديث حالة المرشح بنجاح!' : 'Status updated successfully!', 'success');
                await this.refresh();
            } catch {
                Toast.show(isAr ? 'حدث خطأ أثناء التحديث.' : 'Error updating status', 'error');
            }
        });

        document.getElementById('candidates-tbody')?.addEventListener('click', (e) => {
            const del = e.target.closest('.delete-app-btn');
            if (del) {
                this._deleteApplication(del.dataset.id);
            }
        });
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
            await this.refresh();
        } catch (e) {
            Toast.show(e.message || (isAr ? 'فشل استخراج المعايير. حاول مجدداً.' : 'AI extraction failed. Try again.'), 'error');
            await this.refresh();
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
                <select id="edit-ver-mode" class="form-control">
                    <option value="manual" ${this.version.criteria_mode==='manual'?'selected':''}>
                        ${isAr ? 'يدوي – سأقوم بإضافة المعايير بنفسي' : 'Manual – I add criteria myself'}
                    </option>
                    <option value="ai" ${this.version.criteria_mode==='ai'?'selected':''}>
                        ${isAr ? 'توليد بالذكاء الاصطناعي – يقترح النظام المعايير تلقائياً' : 'AI Generated – AI suggests from JD'}
                    </option>
                    <option value="hybrid" ${this.version.criteria_mode==='hybrid'?'selected':''}>
                        ${isAr ? 'هجين – يقترح النظام وأستطيع التعديل' : 'Hybrid – AI suggests, I refine'}
                    </option>
                </select>
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

                    Toast.show(isAr ? 'تم حفظ الوصف الوظيفي بنجاح!' : 'Job description updated successfully!', 'success');
                    await this.refresh();
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
        const candOptions = this.candidates.map(c =>
            `<option value="${c.id}">${c.full_name} (${c.email})</option>`
        ).join('');

        const content = `
            <div style="display:flex; border-bottom: 2px solid var(--border-color); margin-bottom: 1.2rem; gap: 0.5rem;">
                <button id="tab-assign-existing" class="btn" style="flex:1; border-radius:0; border:none; border-bottom: 3px solid var(--primary-color); background:none; font-weight:bold; padding:0.6rem; color:var(--primary-color); cursor:pointer; font-size:0.9rem;">
                    <i class="fas fa-user-check"></i> ${isAr ? 'تعيين مرشح مسجل' : 'Assign Registered'}
                </button>
                <button id="tab-create-new" class="btn" style="flex:1; border-radius:0; border:none; border-bottom: 3px solid transparent; background:none; font-weight:normal; padding:0.6rem; color:var(--text-muted); cursor:pointer; font-size:0.9rem;">
                    <i class="fas fa-user-plus"></i> ${isAr ? 'تسجيل مرشح جديد' : 'Register New Candidate'}
                </button>
            </div>

            <!-- Tab Content: Assign Existing -->
            <div id="content-assign-existing" style="display:block;">
                <div class="form-group">
                    <label class="form-label">${isAr ? 'اختر المرشح' : 'Select Candidate'}</label>
                    <select id="app-cand-id" class="form-control">
                        <option value="">${isAr ? '-- اختر المرشح --' : '-- Choose Candidate --'}</option>
                        ${candOptions}
                    </select>
                </div>
                <div style="background:var(--bg-color);border-radius:var(--radius-md);padding:0.8rem;font-size:0.85rem;color:var(--text-muted);display:flex;align-items:center;gap:0.5rem;margin-top:1rem;">
                    <i class="fas fa-info-circle" style="color:var(--primary-color);"></i>
                    <span>${isAr ? 'تعيين مرشح تم تسجيل بياناته مسبقاً في النظام لتقييمه في هذه النسخة.' : 'Assign an already registered candidate to be evaluated on this version.'}</span>
                </div>
            </div>

            <!-- Tab Content: Create New -->
            <div id="content-create-new" style="display:none;">
                <div class="form-group">
                    <label class="form-label">${isAr ? 'الاسم الكامل *' : 'Full Name *'}</label>
                    <input type="text" id="cand-fullname" class="form-control" placeholder="e.g. John Doe">
                </div>
                <div class="form-group">
                    <label class="form-label">${isAr ? 'البريد الإلكتروني *' : 'Email *'}</label>
                    <input type="email" id="cand-email" class="form-control" placeholder="e.g. john@example.com">
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
                    <div class="form-group">
                        <label class="form-label">${isAr ? 'رقم الهاتف' : 'Phone'}</label>
                        <input type="text" id="cand-phone" class="form-control" placeholder="+201...">
                    </div>
                    <div class="form-group">
                        <label class="form-label">${isAr ? 'المصدر' : 'Source'}</label>
                        <input type="text" id="cand-source" class="form-control" placeholder="LinkedIn, Referral, etc.">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">${isAr ? 'رابط لينكد إن' : 'LinkedIn URL'}</label>
                    <input type="url" id="cand-linkedin" class="form-control" placeholder="https://linkedin.com/in/...">
                </div>
            </div>
        `;

        let currentTab = 'existing';

        const modal = new Modal({
            title: isAr ? 'إضافة مرشح للتقييم على هذه النسخة' : 'Add Candidate to this Version',
            content,
            saveText: isAr ? 'حفظ وتعيين' : 'Save & Assign',
            onSave: async (modalEl) => {
                if (currentTab === 'existing') {
                    const candId = modalEl.querySelector('#app-cand-id').value;
                    if (!candId) { 
                        Toast.show(isAr ? 'يرجى اختيار مرشح.' : 'Please select a candidate', 'error'); 
                        throw new Error(); 
                    }
                    try {
                        await api.post('/applications', {
                            candidate_id: parseInt(candId),
                            job_version_id: parseInt(this.versionId),
                            status: 'applied'
                        });
                        Toast.show(isAr ? 'تم تعيين المرشح للنسخة بنجاح!' : 'Candidate assigned to this version successfully!', 'success');
                        await this.refresh();
                    } catch (e) {
                        Toast.show(e.message || (isAr ? 'حدث خطأ أثناء التعيين' : 'Error assigning candidate'), 'error');
                        throw e;
                    }
                } else {
                    const full_name = modalEl.querySelector('#cand-fullname').value.trim();
                    const email = modalEl.querySelector('#cand-email').value.trim();
                    const phone = modalEl.querySelector('#cand-phone').value.trim() || null;
                    const source = modalEl.querySelector('#cand-source').value.trim() || null;
                    const linkedin_url = modalEl.querySelector('#cand-linkedin').value.trim() || null;
                    
                    if (!full_name || !email) {
                        Toast.show(isAr ? 'يرجى إدخال الاسم الكامل والبريد الإلكتروني.' : 'Full name and email are required.', 'error');
                        throw new Error();
                    }
                    
                    try {
                        // 1. Create the Candidate
                        const newCand = await api.post('/candidates', {
                            full_name,
                            email,
                            phone,
                            source,
                            linkedin_url
                        });
                        
                        // 2. Assign to Job Version
                        await api.post('/applications', {
                            candidate_id: newCand.id,
                            job_version_id: parseInt(this.versionId),
                            status: 'applied'
                        });
                        
                        Toast.show(isAr ? 'تم تسجيل وتعيين المرشح بنجاح!' : 'Candidate registered and assigned successfully!', 'success');
                        await this.refresh();
                    } catch (e) {
                        Toast.show(e.message || (isAr ? 'حدث خطأ أثناء تسجيل وتعيين المرشح' : 'Error creating and assigning candidate'), 'error');
                        throw e;
                    }
                }
            }
        });
        modal.show();

        // Bind tabs
        const tabExisting = document.getElementById('tab-assign-existing');
        const tabCreate = document.getElementById('tab-create-new');
        const contentExisting = document.getElementById('content-assign-existing');
        const contentCreate = document.getElementById('content-create-new');

        tabExisting?.addEventListener('click', () => {
            currentTab = 'existing';
            tabExisting.style.borderBottomColor = 'var(--primary-color)';
            tabExisting.style.fontWeight = 'bold';
            tabExisting.style.color = 'var(--primary-color)';
            
            tabCreate.style.borderBottomColor = 'transparent';
            tabCreate.style.fontWeight = 'normal';
            tabCreate.style.color = 'var(--text-muted)';
            
            contentExisting.style.display = 'block';
            contentCreate.style.display = 'none';
        });

        tabCreate?.addEventListener('click', () => {
            currentTab = 'new';
            tabCreate.style.borderBottomColor = 'var(--primary-color)';
            tabCreate.style.fontWeight = 'bold';
            tabCreate.style.color = 'var(--primary-color)';
            
            tabExisting.style.borderBottomColor = 'transparent';
            tabExisting.style.fontWeight = 'normal';
            tabExisting.style.color = 'var(--text-muted)';
            
            contentExisting.style.display = 'none';
            contentCreate.style.display = 'block';
        });
    }

    async _deleteApplication(id) {
        const isAr = getLang() === 'ar';
        if (!confirm(isAr ? 'هل أنت متأكد من إلغاء تعيين هذا المرشح من هذه النسخة؟' : 'Are you sure you want to remove this candidate from this version?')) return;
        try {
            await api.fetch(`/applications/${id}`, { method: 'DELETE' });
            Toast.show(isAr ? 'تمت إزالة المرشح بنجاح.' : 'Candidate removed successfully.', 'success');
            await this.refresh();
        } catch {
            Toast.show(isAr ? 'حدث خطأ أثناء الحذف.' : 'Error removing candidate.', 'error');
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
                    <label class="form-label">${isAr ? 'الوزن (1-10)' : 'Weight (1-10)'} <span style="color:var(--danger);">*</span></label>
                    <input type="number" id="crit-weight" class="form-control" 
                        value="${isEdit ? existing.weight : 5}" min="1" max="10" step="0.5">
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
                const payload = {
                    name,
                    description: modalEl.querySelector('#crit-desc').value || null,
                    weight: parseFloat(modalEl.querySelector('#crit-weight').value) || 5,
                    priority_level: modalEl.querySelector('#crit-priority').value,
                    is_mandatory: modalEl.querySelector('#crit-mandatory').checked
                };
                try {
                    if (isEdit) {
                        await api.fetch(`/jobs/${this.jobId}/versions/${this.versionId}/criteria/${existing.id}`, { method: 'DELETE' });
                        await api.post(`/jobs/${this.jobId}/versions/${this.versionId}/criteria`, payload);
                        Toast.show(isAr ? 'تم تحديث المعيار!' : 'Criteria updated', 'success');
                    } else {
                        await api.post(`/jobs/${this.jobId}/versions/${this.versionId}/criteria`, payload);
                        Toast.show(isAr ? 'تمت إضافة المعيار!' : 'Criteria added', 'success');
                    }
                    await this.refresh();
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
            Toast.show(isAr ? 'تم حذف المعيار بنجاح.' : 'Criteria deleted', 'success');
            await this.refresh();
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
