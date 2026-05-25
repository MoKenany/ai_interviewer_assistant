import { t, getLang } from '../core/i18n.js';
import { api } from '../core/api.js';
import { Modal } from '../components/Modal.js';
import { Toast } from '../components/Toast.js';
import { renderJobsSection } from './CandidatesJobsSection.js';
import { renderAssignedCandidatesSection } from './AssignedCandidatesSection.js';
import { renderUnassignedCandidatesSection } from './UnassignedCandidatesSection.js';

export class CandidatesSection {
    constructor(params = {}) {
        this.jobs = [];
        this.unassigned = [];
        this.unassignedSearch = '';
        this.unassignedSourceFilter = '';
        this.unassignedActiveFilter = '';
        this.unassignedDisplayLimit = 20;
        this.unassignedLoadStep = 20;
        this.selectedUnassigned = new Set();
        this.assignedSearch = '';
        this.assignedJobFilter = params.jobId ? parseInt(params.jobId, 10) : null;
        this.assignedVersionFilter = params.versionId ? parseInt(params.versionId, 10) : null;
        this.assignedStatusFilter = '';
        this.assignedDisplayLimit = 20;
        this.assignedLoadStep = 20;
        this.selectedAssigned = new Set();
        this.activeTab = this.assignedJobFilter ? 'assigned' : 'versions'; // التبويب الافتراضي للإصدارات
    }

    async fetchData() {
        try {
            const data = await api.get('/candidates/organized');
            this.jobs = data.jobs || [];
            this.unassigned = data.unassigned || [];
        } catch (error) {
            Toast.show(t('error'), 'error');
            this.jobs = [];
            this.unassigned = [];
        }
    }

    render() {
        const isAr = getLang() === 'ar';
        
        // Define bilingual labels
        const labels = {
            title: isAr ? "المرشحون الاستراتيجيون" : "Strategic Candidates Hub",
            subtitle: isAr ? "إدارة ومقارنة وتصنيف نتائج تقييم المرشحين حسب كل وظيفة وإصدار بشكل منظم." : "Manage, compare and track candidate evaluations across different job positions and versions.",
            addCandidate: isAr ? "إضافة مرشح جديد" : "Add Candidate",
            importCandidates: isAr ? "استيراد من ملف" : "Import from File",
            unassignedTitle: isAr ? "المرشحون غير المعينين" : "Unassigned Candidates",
            unassignedSubtitle: isAr ? "مرشحون مضافون للنظام ولكن لم يتم ربطهم بأي تقديم أو وظيفة بعد." : "Candidates registered in the system but not yet linked to any job position or version.",
            noJobs: isAr ? "لا توجد وظائف مفعلة حالياً." : "No active jobs found.",
            noUnassigned: isAr ? "لا يوجد مرشحين غير معينين." : "No unassigned candidates.",
            noAssignedCandidates: isAr ? "لا يوجد مرشحين معينين." : "No assigned candidates.",
            linkJob: isAr ? "ربط بوظيفة" : "Link to Job",
            unlinkJob: isAr ? "إلغاء التقديم" : "Unlink Application",
            assignedTitle: isAr ? "المرشحون المعينون" : "Assigned Candidates",
            assignedSubtitle: isAr ? "المرشحون المرتبطون حالياً بوظائف وإصدارات." : "Candidates currently linked to jobs and versions.",
            overallScore: isAr ? "التقييم الكلي" : "AI Score",
            confidence: isAr ? "ثقة الذكاء الاصطناعي" : "Confidence",
            recBadge: isAr ? "التوصية" : "Recommendation",
            status: isAr ? "الحالة" : "Status",
            resume: isAr ? "السيرة الذاتية" : "Resume",
            actions: isAr ? "الإجراءات" : "Actions",
            rank: isAr ? "الترتيب" : "Rank",
            candidateInfo: isAr ? "المرشح" : "Candidate",
            totalCandidates: isAr ? "مرشحاً" : "candidates"
        };

        // Render Jobs Accordion
        const jobsHtml = renderJobsSection(this.jobs, labels, isAr);

        const assignedCandidates = this._getAssignedCandidates();
        const assignedHtml = renderAssignedCandidatesSection(
            assignedCandidates,
            this.assignedSearch,
            this.assignedDisplayLimit,
            this.assignedJobFilter,
            this.assignedVersionFilter,
            this.assignedStatusFilter,
            this.selectedAssigned,
            this.jobs,
            labels,
            isAr
        );

        const assignedJobLabel = this.assignedJobFilter ? (this.jobs.find(j => j.job_id === this.assignedJobFilter)?.title || this.jobs.find(j => j.job_id === this.assignedJobFilter)?.job_title || `Job #${this.assignedJobFilter}`) : null;
        const assignedFilterNotice = assignedJobLabel ? `
            <div style="margin-bottom:1rem;padding:1rem;border-radius:var(--radius-md);background:var(--surface-color);border:1px solid var(--border-color);font-size:0.95rem;color:var(--text-muted);">
                Showing candidates for <strong>${assignedJobLabel}</strong>.
            </div>` : '';
        const unassignedHtml = renderUnassignedCandidatesSection(
            this.unassigned,
            this.unassignedSearch,
            this.unassignedDisplayLimit,
            this.selectedUnassigned,
            this.unassignedSourceFilter,
            this.unassignedActiveFilter,
            labels,
            isAr
        );

        return `
            <style>
                /* Premium CSS Styles for Strategic Candidate Section */
                .job-accordion-card {
                    box-shadow: 0 4px 20px rgba(0,0,0,0.03);
                    border-radius: 12px;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    overflow: hidden;
                    background: var(--bg-card);
                }
                .job-accordion-card:hover {
                    box-shadow: 0 8px 30px rgba(0,0,0,0.08);
                    transform: translateY(-2px);
                }
                .job-card-header:hover {
                    background: rgba(0,0,0,0.01);
                }
                .job-accordion-card.active .toggle-icon {
                    transform: rotate(180deg);
                }
                .premium-table th {
                    background: var(--bg-secondary);
                    color: var(--text-color);
                    font-weight: 600;
                    border-bottom: 2px solid var(--border-color);
                    font-size: 0.85rem;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .leaderboard-row {
                    transition: background 0.2s ease;
                }
                .leaderboard-row:hover {
                    background: rgba(0,0,0,0.02);
                }
                .rank-badge {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    font-weight: 700;
                    font-size: 0.85rem;
                }
                .rank-1 {
                    background: linear-gradient(135deg, #ffd700, #ffa500);
                    color: #fff;
                    box-shadow: 0 2px 8px rgba(255, 215, 0, 0.4);
                }
                .rank-2 {
                    background: linear-gradient(135deg, #cbd5e1, #94a3b8);
                    color: #fff;
                    box-shadow: 0 2px 8px rgba(148, 163, 184, 0.4);
                }
                .rank-3 {
                    background: linear-gradient(135deg, #d97706, #b45309);
                    color: #fff;
                    box-shadow: 0 2px 8px rgba(180, 83, 9, 0.4);
                }
                .rank-other {
                    background: rgba(0,0,0,0.04);
                    color: var(--text-color);
                }
                .badge-primary-subtle {
                    background: rgba(var(--primary-color-rgb, 79, 70, 229), 0.1);
                    color: var(--primary-color);
                    font-weight: 600;
                }
                .btn-action {
                    background: none;
                    border: none;
                    cursor: pointer;
                    padding: 0.4rem;
                    border-radius: 6px;
                    color: var(--text-muted);
                    transition: all 0.2s ease;
                }
                .btn-action:hover {
                    background: rgba(0,0,0,0.05);
                    color: var(--text-color);
                    transform: scale(1.1);
                }
                .actions-group {
                    display: flex;
                    gap: 0.3rem;
                }
                .unassigned-toolbar {
                    border-bottom: 1px solid var(--border-color);
                    padding-bottom: 1rem;
                    margin-bottom: 1rem;
                }
                .unassigned-toolbar input[type="search"] {
                    min-width: 260px;
                    max-width: 360px;
                }
                .unassigned-footer {
                    border-top: 1px solid var(--border-color);
                    padding-top: 1rem;
                }
                .status-pill {
                    display: inline-block;
                    padding: 0.25rem 0.6rem;
                    border-radius: 50px;
                    font-size: 0.75rem;
                    font-weight: 600;
                    text-transform: capitalize;
                }
                .status-applied { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
                .status-screening { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
                .status-interviewing { background: rgba(139, 92, 246, 0.1); color: #8b5cf6; }
                .status-accepted { background: rgba(16, 185, 129, 0.1); color: #10b981; }
                .status-rejected { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
                
                .badge-success { background: #10b981; color: white; border-radius:4px; padding:2px 6px; }
                .badge-info { background: #3b82f6; color: white; border-radius:4px; padding:2px 6px; }
                .badge-warning { background: #f59e0b; color: white; border-radius:4px; padding:2px 6px; }
                .badge-danger { background: #ef4444; color: white; border-radius:4px; padding:2px 6px; }
                .badge-secondary { background: #64748b; color: white; border-radius:4px; padding:2px 6px; }
                .badge-outline-info { border: 1px solid #3b82f6; color: #3b82f6; border-radius:4px; padding:1px 4px; display:inline-block; }
                .empty-state { text-align:center; padding:3rem; border:2px dashed var(--border-color); border-radius:12px; color:var(--text-muted); }
                
                /* التنسيق الخاص بالتبويبات (Tabs) */
                .tab-btn {
                    background: none; border: none; padding: 0.6rem 1.3rem; font-size: 1.05rem; font-weight: 700;
                    color: var(--text-muted); border-bottom: 3px solid transparent; cursor: pointer;
                    transition: all 0.2s ease; display: inline-flex; align-items: center; gap: 0.5rem; margin-bottom: -2px;
                }
                .tab-btn:hover { color: var(--primary-color); opacity: 0.9; }
                .tab-btn.active { color: var(--primary-color); border-bottom-color: var(--primary-color); }
            </style>

            <div class="candidates-container">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; flex-wrap: wrap; gap:1.5rem;">
                    <div>
                        <h1 style="color: var(--primary-color); font-size: 2.2rem; font-weight: 800; margin: 0;">${labels.title}</h1>
                        <p style="color: var(--text-muted); margin: 0.3rem 0 0 0; font-size: 1.05rem;">${labels.subtitle}</p>
                    </div>
                    <div style="display:flex; gap:0.75rem; flex-wrap:wrap;">
                        <button id="import-cand-btn" class="btn btn-outline" style="display:inline-flex;align-items:center;gap:0.5rem;"><i class="fas fa-file-import"></i> ${labels.importCandidates}</button>
                        <button id="add-cand-btn" class="btn btn-primary" style="box-shadow: 0 4px 12px rgba(var(--primary-color-rgb), 0.2);display:inline-flex;align-items:center;gap:0.5rem;"><i class="fas fa-user-plus"></i> ${labels.addCandidate}</button>
                    </div>
                </div>

                <div class="tabs-navigation" style="display: flex; gap: 1rem; margin-bottom: 2.5rem; border-bottom: 2px solid var(--border-color);">
                    <button class="tab-btn ${this.activeTab === 'versions' ? 'active' : ''}" data-tab="versions">
                        <i class="fas fa-layer-group"></i> ${isAr ? 'الوظائف والإصدارات' : 'Jobs & Versions'}
                    </button>
                    <button class="tab-btn ${this.activeTab === 'assigned' ? 'active' : ''}" data-tab="assigned">
                        <i class="fas fa-briefcase"></i> ${labels.assignedTitle}
                    </button>
                    <button class="tab-btn ${this.activeTab === 'unassigned' ? 'active' : ''}" data-tab="unassigned">
                        <i class="fas fa-user-tag"></i> ${labels.unassignedTitle}
                    </button>
                </div>

                ${this.activeTab === 'versions' ? `
                    <div class="jobs-list" style="display: flex; flex-direction: column; gap: 1.5rem; margin-bottom: 3.5rem;">
                        ${jobsHtml}
                    </div>
                ` : this.activeTab === 'assigned' ? `
                    ${assignedFilterNotice}${assignedHtml}
                ` : `
                    ${unassignedHtml}
                `}
            </div>
        `;
    }

    _getFilteredUnassigned() {
        const query = (this.unassignedSearch || '').toLowerCase().trim();
        let filtered = this.unassigned;

        if (this.unassignedSourceFilter) {
            filtered = filtered.filter(c => (c.source || '').toLowerCase() === this.unassignedSourceFilter.toLowerCase());
        }
        if (this.unassignedActiveFilter) {
            filtered = filtered.filter(c => {
                if (this.unassignedActiveFilter === 'active') return c.is_active;
                if (this.unassignedActiveFilter === 'inactive') return !c.is_active;
                return true;
            });
        }
        if (!query) return filtered;

        return filtered.filter(c => {
            const value = `${c.full_name || ''} ${c.email || ''} ${c.phone || ''} ${c.source || ''}`.toLowerCase();
            return value.includes(query);
        });
    }

    _getAssignedCandidates() {
        const grouped = new Map();

        for (const job of this.jobs) {
            const jobId = job.job_id;
            const jobTitle = job.job_title || '-';
            for (const version of (job.versions || [])) {
                const versionId = version.version_id;
                const versionNumber = version.version_number;
                for (const candidate of (version.candidates || [])) {
                    const app = {
                        app_id: candidate.app_id,
                        job_id: jobId,
                        job_title: jobTitle,
                        version_id: versionId,
                        version_number: versionNumber,
                        app_status: candidate.app_status,
                        source: candidate.source,
                        overall_score: candidate.overall_score,
                        confidence_score: candidate.confidence_score,
                        hiring_recommendation: candidate.hiring_recommendation
                    };

                    if (!grouped.has(candidate.candidate_id)) {
                        grouped.set(candidate.candidate_id, {
                            candidate_id: candidate.candidate_id,
                            full_name: candidate.full_name,
                            email: candidate.email,
                            source: candidate.source,
                            is_active: candidate.is_active,
                            applications: [app]
                        });
                    } else {
                        grouped.get(candidate.candidate_id).applications.push(app);
                    }
                }
            }
        }

        return Array.from(grouped.values());
    }

    _getFilteredAssignedCandidates() {
        const query = (this.assignedSearch || '').toLowerCase().trim();
        let assigned = this._getAssignedCandidates();

        if (this.assignedJobFilter) {
            assigned = assigned.filter(c => c.applications.some(app => app.job_id === this.assignedJobFilter));
        }
        if (this.assignedVersionFilter) {
            assigned = assigned.filter(c => c.applications.some(app => app.version_id === this.assignedVersionFilter));
        }
        if (this.assignedStatusFilter) {
            assigned = assigned.filter(c => c.applications.some(app => (app.app_status || '').toLowerCase() === this.assignedStatusFilter));
        }
        if (!query) return assigned;

        return assigned.filter(c => {
            const jobText = (c.applications || []).map(app => `${app.job_title || ''} ${app.version_number || ''} ${app.app_status || ''}`).join(' ');
            const value = `${c.full_name || ''} ${c.email || ''} ${c.source || ''} ${jobText}`.toLowerCase();
            return value.includes(query);
        });
    }

    _getVisibleAssignedCandidates() {
        return this._getFilteredAssignedCandidates().slice(0, this.assignedDisplayLimit);
    }

    async deleteAllUnassigned() {
        const isAr = getLang() === 'ar';
        if (!confirm(isAr ? 'هل أنت متأكد من حذف جميع المرشحين غير المعينين؟ (لا يمكن التراجع)' : 'Are you sure you want to delete ALL unassigned candidates? (Cannot be undone)')) return;

        try {
            await api.fetch('/candidates/unassigned', { method: 'DELETE' });
            Toast.show(isAr ? 'تم حذف جميع المرشحين غير المعينين' : 'All unassigned candidates deleted', 'success');
            await this.refresh();
        } catch (err) {
            Toast.show(isAr ? 'فشل حذف المرشحين غير المعينين' : 'Failed to delete unassigned candidates', 'error');
        }
    }

    async deleteAllAssigned() {
        const isAr = getLang() === 'ar';
        if (!confirm(isAr ? 'هل أنت متأكد من حذف جميع المرشحين المعينين؟ (لا يمكن التراجع)' : 'Are you sure you want to delete ALL assigned candidates? (Cannot be undone)')) return;

        try {
            await api.fetch('/candidates/assigned', { method: 'DELETE' });
            Toast.show(isAr ? 'تم حذف جميع المرشحين المعينين' : 'All assigned candidates deleted', 'success');
            await this.refresh();
        } catch (err) {
            Toast.show(isAr ? 'فشل حذف المرشحين المعينين' : 'Failed to delete assigned candidates', 'error');
        }
    }

    _getVisibleUnassigned() {
        return this._getFilteredUnassigned().slice(0, this.unassignedDisplayLimit);
    }

    async showMoreUnassigned() {
        this.unassignedDisplayLimit += 20;
        await this.refresh();
    }

    async showMoreAssigned() {
        this.assignedDisplayLimit += 20;
        await this.refresh();
    }

    mount() {
        // إدارة أزرار التبويب (Tabs)
        const tabButtons = document.querySelectorAll('.tab-btn');
        tabButtons.forEach(btn => {
            btn.addEventListener('click', async () => {
                this.activeTab = btn.dataset.tab;
                await this.refresh();
            });
        });

        // 1. Add Candidate Button
        const addBtn = document.getElementById('add-cand-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.openCandidateForm());
        }

        // 1b. Import Candidates Button
        const importBtn = document.getElementById('import-cand-btn');
        if (importBtn) {
            importBtn.addEventListener('click', () => this.openImportModal());
        }

        // 2. Collapsible Accordion logic
        const toggles = document.querySelectorAll('.accordion-toggle');
        toggles.forEach(toggle => {
            toggle.addEventListener('click', () => {
                const targetId = toggle.dataset.target;
                const body = document.getElementById(targetId);
                const parent = toggle.closest('.job-accordion-card');
                
                if (body) {
                    const isVisible = body.style.display === 'block';
                    body.style.display = isVisible ? 'none' : 'block';
                    if (isVisible) {
                        parent.classList.remove('active');
                    } else {
                        parent.classList.add('active');
                    }
                }
            });
        });

        // 3. Delegate click events inside app-content cleanly to avoid leaks
        const contentArea = document.getElementById('app-content');
        if (contentArea) {
            if (this.clickListener) {
                contentArea.removeEventListener('click', this.clickListener);
            }
            this.clickListener = this.handleActionsClick.bind(this);
            contentArea.addEventListener('click', this.clickListener);

            if (this.inputListener) {
                contentArea.removeEventListener('input', this.inputListener);
            }
            this.inputListener = this.handleContentInput.bind(this);
            contentArea.addEventListener('input', this.inputListener);

            if (this.changeListener) {
                contentArea.removeEventListener('change', this.changeListener);
            }
            this.changeListener = this.handleContentChange.bind(this);
            contentArea.addEventListener('change', this.changeListener);
        }
    }

    async handleActionsClick(e) {
        const editBtn = e.target.closest('.edit-cand-btn');
        const delBtn = e.target.closest('.delete-cand-btn');
        const uploadBtn = e.target.closest('.upload-resume-btn');
        const delResBtn = e.target.closest('.del-resume-btn');
        const linkBtn = e.target.closest('.link-job-btn');
        const deleteAppBtn = e.target.closest('.delete-app-btn');
        const viewTranscriptsBtn = e.target.closest('.view-transcripts-btn');
        const bulkLinkBtn = e.target.closest('#bulk-link-selected-btn');
        const bulkDeleteBtn = e.target.closest('#bulk-delete-selected-btn');
        const bulkLinkAssignedBtn = e.target.closest('#bulk-link-assigned-btn');
        const bulkDeleteAssignedBtn = e.target.closest('#bulk-delete-assigned-btn');
        const showMoreUnassignedBtn = e.target.closest('#show-more-unassigned-btn');
        const deleteAllUnassignedBtn = e.target.closest('#delete-all-unassigned-btn');
        const showMoreAssignedBtn = e.target.closest('#show-more-assigned-btn');
        const deleteAllAssignedBtn = e.target.closest('#delete-all-assigned-btn');

        if (deleteAllUnassignedBtn) {
            e.stopPropagation();
            this.deleteAllUnassigned();
        }
        if (deleteAllAssignedBtn) {
            e.stopPropagation();
            this.deleteAllAssigned();
        }
        if (bulkLinkAssignedBtn) {
            e.stopPropagation();
            this.openBulkLinkJobModal(Array.from(this.selectedAssigned));
        }
        if (bulkDeleteAssignedBtn) {
            e.stopPropagation();
            this.bulkDeleteSelectedAssigned();
        }
        if (viewTranscriptsBtn) {
            e.stopPropagation();
            this.openTranscriptsModal(viewTranscriptsBtn.dataset.id);
        }
        if (editBtn) {
            e.stopPropagation();
            const id = editBtn.dataset.id;
            let cand = null;
            for (const j of this.jobs) {
                for (const v of j.versions) {
                    cand = v.candidates.find(c => c.candidate_id == id);
                    if (cand) break;
                }
                if (cand) break;
            }
            if (!cand) cand = this.unassigned.find(c => c.candidate_id == id);
            
            if (cand) {
                const mappedCand = {
                    id: cand.candidate_id,
                    full_name: cand.full_name,
                    email: cand.email,
                    phone: cand.phone,
                    source: cand.source,
                    is_active: cand.is_active
                };
                this.openCandidateForm(mappedCand);
            }
        }
        if (delBtn) {
            e.stopPropagation();
            this.deleteCandidate(delBtn.dataset.id);
        }
        if (uploadBtn) {
            e.stopPropagation();
            this.openUploadResumeModal(uploadBtn.dataset.id);
        }
        if (delResBtn) {
            e.stopPropagation();
            this.deleteResume(delResBtn.dataset.id);
        }
        if (linkBtn) {
            e.stopPropagation();
            this.openLinkJobModal(linkBtn.dataset.id);
        }
        if (bulkLinkBtn) {
            e.stopPropagation();
            this.openBulkLinkJobModal();
        }
        if (bulkDeleteBtn) {
            e.stopPropagation();
            this.bulkDeleteSelectedCandidates();
        }
        if (showMoreUnassignedBtn) {
            e.stopPropagation();
            this.showMoreUnassigned();
        }
        if (showMoreAssignedBtn) {
            e.stopPropagation();
            this.showMoreAssigned();
        }
        if (deleteAppBtn) {
            e.stopPropagation();
            this.deleteApplication(deleteAppBtn.dataset.appId);
        }
    }

    async handleContentInput(e) {
        const unassignedSearchInput = e.target.closest('#unassigned-search');
        const assignedSearchInput = e.target.closest('#assigned-search');

        if (unassignedSearchInput) {
            this.unassignedSearch = unassignedSearchInput.value.trim();
            await this.refresh();
            return;
        }
        if (assignedSearchInput) {
            this.assignedSearch = assignedSearchInput.value.trim();
            await this.refresh();
        }
    }

    async handleContentChange(e) {
        const unassignedCheckbox = e.target.closest('.unassigned-select-checkbox');
        const assignedCheckbox = e.target.closest('.assigned-select-checkbox');
        const selectAllUnassignedCheckbox = e.target.closest('#select-all-unassigned');
        const selectAllAssignedCheckbox = e.target.closest('#select-all-assigned');
        const assignedJobFilter = e.target.closest('#assigned-job-filter');
        const assignedVersionFilter = e.target.closest('#assigned-version-filter');
        const assignedStatusFilter = e.target.closest('#assigned-status-filter');
        const unassignedSourceFilter = e.target.closest('#unassigned-source-filter');
        const unassignedActiveFilter = e.target.closest('#unassigned-active-filter');

        if (unassignedCheckbox) {
            const candidateId = parseInt(unassignedCheckbox.dataset.id);
            if (unassignedCheckbox.checked) {
                this.selectedUnassigned.add(candidateId);
            } else {
                this.selectedUnassigned.delete(candidateId);
            }
            await this.refresh();
            return;
        }

        if (assignedCheckbox) {
            const candidateId = parseInt(assignedCheckbox.dataset.id);
            if (assignedCheckbox.checked) {
                this.selectedAssigned.add(candidateId);
            } else {
                this.selectedAssigned.delete(candidateId);
            }
            await this.refresh();
            return;
        }

        if (selectAllUnassignedCheckbox) {
            const visible = this._getVisibleUnassigned();
            if (selectAllUnassignedCheckbox.checked) {
                visible.forEach(c => this.selectedUnassigned.add(c.candidate_id));
            } else {
                visible.forEach(c => this.selectedUnassigned.delete(c.candidate_id));
            }
            await this.refresh();
            return;
        }

        if (selectAllAssignedCheckbox) {
            const visible = this._getVisibleAssignedCandidates();
            if (selectAllAssignedCheckbox.checked) {
                visible.forEach(c => this.selectedAssigned.add(c.candidate_id));
            } else {
                visible.forEach(c => this.selectedAssigned.delete(c.candidate_id));
            }
            await this.refresh();
            return;
        }

        if (assignedJobFilter) {
            this.assignedJobFilter = assignedJobFilter.value ? parseInt(assignedJobFilter.value, 10) : null;
            this.assignedVersionFilter = null;
            await this.refresh();
            return;
        }

        if (assignedVersionFilter) {
            this.assignedVersionFilter = assignedVersionFilter.value ? parseInt(assignedVersionFilter.value, 10) : null;
            await this.refresh();
            return;
        }

        if (assignedStatusFilter) {
            this.assignedStatusFilter = assignedStatusFilter.value;
            await this.refresh();
            return;
        }

        if (unassignedSourceFilter) {
            this.unassignedSourceFilter = unassignedSourceFilter.value;
            await this.refresh();
            return;
        }

        if (unassignedActiveFilter) {
            this.unassignedActiveFilter = unassignedActiveFilter.value;
            await this.refresh();
            return;
        }
    }

    toggleSelectAllUnassigned() {
        const visible = this._getVisibleUnassigned();
        if (visible.length === 0) return;
        const allSelected = visible.every(c => this.selectedUnassigned.has(c.candidate_id));
        if (allSelected) {
            visible.forEach(c => this.selectedUnassigned.delete(c.candidate_id));
        } else {
            visible.forEach(c => this.selectedUnassigned.add(c.candidate_id));
        }
        return this.refresh();
    }

    async clearUnassignedSelection() {
        this.selectedUnassigned.clear();
        await this.refresh();
    }

    async openBulkLinkJobModal(candidateIds = null) {
        const isAr = getLang() === 'ar';
        candidateIds = candidateIds || Array.from(this.selectedUnassigned);
        if (!candidateIds.length) {
            Toast.show(isAr ? 'الرجاء تحديد مرشح واحد على الأقل.' : 'Please select at least one candidate.', 'warning');
            return;
        }

        const availableJobs = this.jobs.filter(job => Array.isArray(job.versions) && job.versions.length);
        if (!availableJobs.length) {
            Toast.show(isAr ? 'لا توجد وظائف متاحة حالياً.' : 'No available job versions.', 'warning');
            return;
        }

        const jobOptions = availableJobs.map((job, idx) => `
            <option value="${idx}">${job.job_title}</option>
        `).join('');

        const buildVersionOptions = (job) => job.versions.map(v => `
            <option value="${v.version_id}">${isAr ? 'الإصدار' : 'Version'} ${v.version_number}</option>
        `).join('');

        const content = `
            <div class="form-group">
                <label class="form-label">${isAr ? 'اختر الوظيفة' : 'Select Job'}</label>
                <select id="bulk-link-job-id" class="form-control">
                    ${jobOptions}
                </select>
            </div>
            <div class="form-group" style="margin-top:1rem;">
                <label class="form-label">${isAr ? 'اختر الإصدار' : 'Select Version'}</label>
                <select id="bulk-link-job-version-id" class="form-control">
                    ${buildVersionOptions(availableJobs[0])}
                </select>
            </div>
            <p style="font-size:0.9rem; color:var(--text-muted); margin-top:0.75rem;">${isAr ? 'سيتم ربط جميع المرشحين المحددين بهذا الإصدار.' : 'All selected candidates will be linked to this version.'}</p>
        `;

        const modal = new Modal({
            title: isAr ? 'ربط المحددين بوظيفة' : 'Link Selected Candidates to Job',
            content,
            saveText: isAr ? 'ربط الآن' : 'Link Now',
            onSave: async (modalEl) => {
                const selectedVersionId = parseInt(modalEl.querySelector('#bulk-link-job-version-id').value);
                if (!selectedVersionId) {
                    Toast.show(isAr ? 'الرجاء اختيار إصدار صالح.' : 'Please select a valid version.', 'error');
                    throw new Error('Invalid version');
                }

                const results = [];
                for (const candidateId of candidateIds) {
                    try {
                        await api.post('/applications', {
                            candidate_id: candidateId,
                            job_version_id: selectedVersionId
                        });
                        results.push({ candidateId, status: 'success' });
                    } catch (err) {
                        results.push({ candidateId, status: 'error', message: err?.message || 'Failed' });
                    }
                }

                const successCount = results.filter(r => r.status === 'success').length;
                if (successCount > 0) {
                    Toast.show(isAr ? `تم ربط ${successCount} مرشح${successCount === 1 ? '' : 'ين'} بنجاح.` : `${successCount} candidate(s) linked successfully.`, 'success');
                }
                await this.refresh();
            }
        });
        modal.show();

        const jobSelect = modal.element.querySelector('#bulk-link-job-id');
        const versionSelect = modal.element.querySelector('#bulk-link-job-version-id');
        if (jobSelect && versionSelect) {
            jobSelect.addEventListener('change', () => {
                const selectedJob = availableJobs[parseInt(jobSelect.value, 10)] || availableJobs[0];
                versionSelect.innerHTML = buildVersionOptions(selectedJob);
            });
        }
    }

    async bulkDeleteSelectedCandidates() {
        const isAr = getLang() === 'ar';
        const candidateIds = Array.from(this.selectedUnassigned);
        if (!candidateIds.length) {
            Toast.show(isAr ? 'الرجاء تحديد مرشح واحد على الأقل.' : 'Please select at least one candidate.', 'warning');
            return;
        }

        const confirmed = confirm(isAr ? 'هل أنت متأكد من حذف المرشحين المحددين نهائياً؟' : 'Are you sure you want to delete selected candidates permanently?');
        if (!confirmed) return;

        const deletions = [];
        for (const id of candidateIds) {
            try {
                await api.fetch(`/candidates/${id}`, { method: 'DELETE' });
                deletions.push(id);
            } catch (err) {
                console.warn('Bulk delete failed for', id, err);
            }
        }

        deletions.forEach(id => this.selectedUnassigned.delete(id));
        if (deletions.length) {
            Toast.show(isAr ? `تم حذف ${deletions.length} مرشح${deletions.length === 1 ? '' : 'ين'}.` : `${deletions.length} candidate(s) deleted.`, 'success');
        }
        await this.refresh();
    }

    async bulkDeleteSelectedAssigned() {
        const isAr = getLang() === 'ar';
        const candidateIds = Array.from(this.selectedAssigned);
        if (!candidateIds.length) {
            Toast.show(isAr ? 'الرجاء تحديد مرشح واحد على الأقل.' : 'Please select at least one candidate.', 'warning');
            return;
        }

        const confirmed = confirm(isAr ? 'هل أنت متأكد من حذف المرشحين المعينين المحددين نهائياً؟' : 'Are you sure you want to delete selected assigned candidates permanently?');
        if (!confirmed) return;

        const deletions = [];
        for (const id of candidateIds) {
            try {
                await api.fetch(`/candidates/${id}`, { method: 'DELETE' });
                deletions.push(id);
            } catch (err) {
                console.warn('Bulk delete failed for', id, err);
            }
        }

        deletions.forEach(id => this.selectedAssigned.delete(id));
        if (deletions.length) {
            Toast.show(isAr ? `تم حذف ${deletions.length} مرشح${deletions.length === 1 ? '' : 'ين'}.` : `${deletions.length} assigned candidate(s) deleted.`, 'success');
        }
        await this.refresh();
    }

    openCandidateForm(cand = null) {
        const isAr = getLang() === 'ar';
        const isEdit = !!cand;
        
        const labels = {
            fullName: isAr ? 'الاسم الكامل' : 'Full Name',
            email: isAr ? 'البريد الإلكتروني' : 'Email',
            phone: isAr ? 'رقم الهاتف' : 'Phone',
            source: isAr ? 'مصدر التقديم (مثال: لينكد إن)' : 'Source (e.g. LinkedIn)',
            status: isAr ? 'الحالة' : 'Status',
            active: isAr ? 'نشط' : 'Active',
            inactive: isAr ? 'غير نشط' : 'Inactive',
            titleEdit: isAr ? 'تعديل بيانات المرشح' : 'Edit Candidate',
            titleCreate: isAr ? 'إضافة مرشح جديد' : 'Create Candidate',
            btnUpdate: isAr ? 'تحديث' : 'Update',
            btnCreate: isAr ? 'إضافة' : 'Create',
            errName: isAr ? 'اسم المرشح مطلوب' : 'Candidate name is required',
            errEmail: isAr ? 'البريد الإلكتروني مطلوب' : 'Email is required',
            successUpdate: isAr ? 'تم تحديث بيانات المرشح بنجاح!' : 'Candidate updated successfully',
            successCreate: isAr ? 'تم إضافة المرشح بنجاح!' : 'Candidate created successfully',
            errSave: isAr ? 'حدث خطأ أثناء الحفظ.' : 'Error saving candidate'
        };

        const content = `
            <div class="form-group">
                <label class="form-label">${labels.fullName}</label>
                <input type="text" id="cand-name" class="form-control" value="${cand ? cand.full_name : ''}" required>
            </div>
            <div class="form-group">
                <label class="form-label">${labels.email}</label>
                <input type="email" id="cand-email" class="form-control" value="${cand ? cand.email : ''}" required>
            </div>
            <div class="form-group">
                <label class="form-label">${labels.phone}</label>
                <input type="text" id="cand-phone" class="form-control" value="${cand ? (cand.phone || '') : ''}">
            </div>
            <div class="form-group">
                <label class="form-label">${labels.source}</label>
                <input type="text" id="cand-source" class="form-control" value="${cand ? (cand.source || '') : ''}">
            </div>
            ${isEdit ? `
            <div class="form-group">
                <label class="form-label">${labels.status}</label>
                <select id="cand-active" class="form-control">
                    <option value="true" ${cand && cand.is_active ? 'selected' : ''}>${labels.active}</option>
                    <option value="false" ${cand && !cand.is_active ? 'selected' : ''}>${labels.inactive}</option>
                </select>
            </div>` : ''}
        `;

        const modal = new Modal({
            title: isEdit ? labels.titleEdit : labels.titleCreate,
            content: content,
            saveText: isEdit ? labels.btnUpdate : labels.btnCreate,
            onSave: async (modalEl) => {
                const fullName = modalEl.querySelector('#cand-name').value.trim();
                const email = modalEl.querySelector('#cand-email').value.trim();
                const phone = modalEl.querySelector('#cand-phone').value.trim() || null;
                const source = modalEl.querySelector('#cand-source').value.trim() || null;

                if (!fullName) {
                    Toast.show(labels.errName, 'error');
                    throw new Error('Validation failed');
                }
                if (!email) {
                    Toast.show(labels.errEmail, 'error');
                    throw new Error('Validation failed');
                }

                const payload = {
                    full_name: fullName,
                    email: email,
                    phone: phone,
                    source: source
                };
                
                if(isEdit) {
                    payload.is_active = modalEl.querySelector('#cand-active').value === 'true';
                }

                try {
                    if (isEdit) {
                        await api.fetch(`/candidates/${cand.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
                        Toast.show(labels.successUpdate, 'success');
                    } else {
                        await api.post('/candidates', payload);
                        Toast.show(labels.successCreate, 'success');
                    }
                    await this.refresh();
                } catch (e) {
                    Toast.show(e.message || labels.errSave, 'error');
                    throw e; 
                }
            }
        });
        modal.show();
    }

    openLinkJobModal(candidateId) {
        const isAr = getLang() === 'ar';
        const availableJobs = this.jobs.filter(job => Array.isArray(job.versions) && job.versions.length);
        if (!availableJobs.length) {
            Toast.show(isAr ? 'لا توجد وظائف متاحة حالياً.' : 'No active Job Versions available. Please create a Job and a Version first.', 'warning');
            return;
        }

        const jobOptions = availableJobs.map((job, idx) => `
            <option value="${idx}">${job.job_title}</option>
        `).join('');

        const buildVersionOptions = (job) => job.versions.map(v => `
            <option value="${v.version_id}">${isAr ? 'الإصدار' : 'Version'} ${v.version_number}</option>
        `).join('');

        const content = `
            <div class="form-group">
                <label class="form-label">${isAr ? 'اختر الوظيفة' : 'Select Job'}</label>
                <select id="link-job-id" class="form-control">
                    ${jobOptions}
                </select>
            </div>
            <div class="form-group" style="margin-top:1rem;">
                <label class="form-label">${isAr ? 'اختر الإصدار' : 'Select Version'}</label>
                <select id="link-job-version-id" class="form-control">
                    ${buildVersionOptions(availableJobs[0])}
                </select>
            </div>
        `;

        const modal = new Modal({
            title: isAr ? 'ربط المرشح بوظيفة' : 'Link Candidate to Job',
            content: content,
            saveText: isAr ? 'ربط الآن' : 'Link Now',
            onSave: async (modalEl) => {
                const jobVersionId = parseInt(modalEl.querySelector('#link-job-version-id').value);
                if (!jobVersionId) {
                    Toast.show(isAr ? 'الرجاء اختيار إصدار صالح.' : 'Please select a valid job version', 'error');
                    throw new Error('No selection');
                }

                try {
                    await api.post('/applications', {
                        candidate_id: parseInt(candidateId),
                        job_version_id: jobVersionId
                    });
                    Toast.show(isAr ? 'تم ربط المرشح بالوظيفة بنجاح' : 'Candidate linked to job successfully', 'success');
                    await this.refresh();
                } catch(e) {
                    Toast.show(e.message || (isAr ? 'فشل الربط' : 'Failed to link candidate'), 'error');
                    throw e;
                }
            }
        });
        modal.show();

        const jobSelect = modal.element.querySelector('#link-job-id');
        const versionSelect = modal.element.querySelector('#link-job-version-id');
        if (jobSelect && versionSelect) {
            jobSelect.addEventListener('change', () => {
                const selectedJob = availableJobs[parseInt(jobSelect.value, 10)] || availableJobs[0];
                versionSelect.innerHTML = buildVersionOptions(selectedJob);
            });
        }
    }

    openUploadResumeModal(id) {
        const isAr = getLang() === 'ar';
        const content = `
            <div class="form-group">
                <label class="form-label">${isAr ? 'اختر ملف السيرة الذاتية (PDF, DOCX)' : 'Select Resume File (PDF, DOCX)'}</label>
                <input type="file" id="resume-file" class="form-control" required>
            </div>
        `;
        const modal = new Modal({
            title: isAr ? 'رفع السيرة الذاتية' : 'Upload Resume',
            content: content,
            saveText: isAr ? 'رفع الآن' : 'Upload',
            onSave: async (modalEl) => {
                const fileInput = modalEl.querySelector('#resume-file');
                if (!fileInput.files.length) {
                    Toast.show(isAr ? 'الرجاء اختيار ملف أولاً' : 'Please select a file', 'error');
                    throw new Error('No file');
                }
                const formData = new FormData();
                formData.append('file', fileInput.files[0]);

                try {
                    const token = localStorage.getItem('access_token');
                    const response = await fetch(`http://127.0.0.1:8000/api/v1/candidates/${id}/resume`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` },
                        body: formData
                    });
                    if (!response.ok) throw new Error('Upload failed');
                    Toast.show(isAr ? 'تم رفع السيرة الذاتية بنجاح!' : 'Resume uploaded successfully', 'success');
                    await this.refresh();
                } catch(e) {
                    Toast.show(e.message || (isAr ? 'خطأ أثناء رفع السيرة الذاتية' : 'Error uploading resume'), 'error');
                    throw e;
                }
            }
        });
        modal.show();
    }

    async deleteResume(id) {
        const isAr = getLang() === 'ar';
        const msg = isAr ? 'هل أنت متأكد من رغبتك في حذف السيرة الذاتية للمرشح؟' : 'Are you sure you want to delete this resume?';
        if (!confirm(msg)) return;
        try {
            await api.fetch(`/candidates/${id}/resume`, { method: 'DELETE' });
            Toast.show(isAr ? 'تم حذف السيرة الذاتية بنجاح' : 'Resume deleted', 'success');
            await this.refresh();
        } catch(e) {
            Toast.show(e.message || (isAr ? 'خطأ أثناء حذف السيرة الذاتية' : 'Error deleting resume'), 'error');
        }
    }

    async deleteApplication(appId) {
        const isAr = getLang() === 'ar';
        const msg = isAr 
            ? 'هل أنت متأكد من رغبتك في إلغاء تقديم هذا المرشح لهذه الوظيفة؟ (لن يتم حذف ملف المرشح)' 
            : 'Are you sure you want to remove this candidate from this job version? (Candidate profile will not be deleted)';
        if (!confirm(msg)) return;
        try {
            await api.fetch(`/applications/${appId}`, { method: 'DELETE' });
            Toast.show(isAr ? 'تم إلغاء تقديم المرشح بنجاح' : 'Application deleted and candidate unlinked', 'success');
            await this.refresh();
        } catch(e) {
            Toast.show(e.message || (isAr ? 'خطأ أثناء إلغاء التقديم' : 'Error unlinking application'), 'error');
        }
    }

    async deleteCandidate(id) {
        const isAr = getLang() === 'ar';
        const msg = isAr 
            ? 'هل أنت متأكد من حذف هذا المرشح تماماً من قاعدة البيانات وجميع تقديماته وجلسات تقييمه؟ (إجراء غير قابل للتراجع!)' 
            : 'Are you sure you want to delete this candidate completely from the database along with all applications and sessions? (This action cannot be undone!)';
        if (!confirm(msg)) return;
        try {
            await api.fetch(`/candidates/${id}`, { method: 'DELETE' });
            Toast.show(isAr ? 'تم حذف المرشح وجميع بياناته بنجاح!' : 'Candidate deleted successfully', 'success');
            await this.refresh();
        } catch (e) {
            Toast.show(e.message || (isAr ? 'حدث خطأ أثناء حذف المرشح' : 'Error deleting candidate'), 'error');
        }
    }

    _formatTranscript(text) {
        if (!text || !text.trim()) return '<p style="color:var(--text-muted); font-style:italic;">No transcript text available.</p>';
        const lines = text.split('\n');
        return lines.map(line => {
            if (!line.trim()) return '';
            const match = line.match(/^([^:]+):(.*)$/);
            if (match) {
                const speaker = match[1].trim();
                const content = match[2].trim();
                const isInterviewer = speaker.toLowerCase().includes('interviewer') || speaker.toLowerCase().includes('ai') || speaker.toLowerCase().includes('speaker 0');
                const bg = isInterviewer ? 'rgba(79, 70, 229, 0.05)' : 'rgba(16, 185, 129, 0.05)';
                const border = isInterviewer ? 'var(--primary-color)' : '#10b981';
                return `
                    <div style="background:${bg}; border-left: 3px solid ${border}; padding: 0.8rem; margin-bottom: 0.8rem; border-radius: 6px;">
                        <strong style="color:${border}; display:block; margin-bottom:0.25rem;">${speaker}</strong>
                        <span style="white-space: pre-wrap; font-size: 0.95rem; color: var(--text-color);">${content}</span>
                    </div>
                `;
            }
            return `<p style="white-space: pre-wrap; font-size: 0.95rem; color: var(--text-color); margin-bottom:0.5rem;">${line}</p>`;
        }).join('');
    }

    async openTranscriptsModal(candidateId) {
        const isAr = getLang() === 'ar';
        
        const loadingContent = `
            <div style="text-align: center; padding: 2rem;">
                <i class="fas fa-spinner fa-spin" style="font-size: 2.5rem; color: var(--primary-color); margin-bottom: 1rem;"></i>
                <p>${isAr ? 'جاري تحميل سجلات المقابلات...' : 'Loading interview transcripts...'}</p>
            </div>
        `;
        
        const modal = new Modal({
            title: isAr ? 'سجلات المقابلات' : 'Interview Transcripts',
            content: loadingContent
        });
        modal.show();
        
        const closeBtn = modal.element.querySelector('.cancel-btn');
        if (closeBtn) closeBtn.textContent = isAr ? 'إغلاق' : 'Close';
        
        try {
            const transcripts = await api.get(`/candidates/${candidateId}/transcripts`);
            
            if (!transcripts || transcripts.length === 0) {
                modal.element.querySelector('.modal-body').innerHTML = `
                    <div style="text-align: center; padding: 3rem; color: var(--text-muted);">
                        <i class="fas fa-comment-slash" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                        <p style="font-size: 1.1rem; font-weight: 500;">
                            ${isAr ? 'لا توجد مقابلات مسجلة أو نصوص مفرغة لهذا المرشح بعد.' : 'No recorded interviews or transcripts found for this candidate.'}
                        </p>
                    </div>
                `;
                return;
            }
            
            const groups = {};
            transcripts.forEach(t => {
                const type = t.session_type || 'other';
                if (!groups[type]) groups[type] = [];
                groups[type].push(t);
            });
            
            const typeLabels = {
                screening: isAr ? 'مقابلة تصفية (Screening)' : 'Screening Interview',
                technical: isAr ? 'مقابلة تقنية (Technical)' : 'Technical Interview',
                cultural_fit: isAr ? 'مقابلة توافق ثنائي (Cultural Fit)' : 'Cultural Fit Interview',
                final: isAr ? 'مقابلة نهائية (Final)' : 'Final Interview',
                other: isAr ? 'أخرى' : 'Other'
            };
            
            const typeIcons = {
                screening: 'fa-user-check',
                technical: 'fa-laptop-code',
                cultural_fit: 'fa-handshake',
                final: 'fa-award',
                other: 'fa-comments'
            };

            const statusColors = {
                pending: 'var(--warning)',
                running: 'var(--info)',
                completed: 'var(--success)',
                failed: 'var(--danger)'
            };

            const renderMaster = () => {
                let html = `<div style="display: flex; flex-direction: column; gap: 1rem; padding-right: 0.5rem;">`;
                
                for (const [type, sessions] of Object.entries(groups)) {
                    const label = typeLabels[type] || type;
                    const icon = typeIcons[type] || 'fa-comments';
                    
                    html += `
                        <div style="border: 1px solid var(--border-color); border-radius: 10px; overflow: hidden; background: var(--bg-card);">
                            <div style="background: var(--bg-secondary); padding: 0.75rem 1rem; border-bottom: 1px solid var(--border-color); display: flex; align-items: center; gap: 0.75rem;">
                                <i class="fas ${icon}" style="font-size: 1.1rem; color: var(--primary-color);"></i>
                                <h4 style="margin: 0; font-size: 1.05rem; color: var(--text-color);">${label}</h4>
                                <span class="badge badge-primary-subtle" style="margin-left: auto; border-radius: 12px; padding: 0.2rem 0.6rem;">
                                    ${sessions.length} ${sessions.length > 1 ? (isAr ? 'مقابلات' : 'Interviews') : (isAr ? 'مقابلة' : 'Interview')}
                                </span>
                            </div>
                            <div style="padding: 0;">
                    `;
                    
                    sessions.forEach((s, idx) => {
                        const dateStr = s.created_at ? new Date(s.created_at).toLocaleString(isAr ? 'ar-EG' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '-';
                        const safeStatus = (s.pipeline_status && s.pipeline_status !== 'None') ? s.pipeline_status : 'pending';
                        const statusColor = statusColors[safeStatus] || 'var(--text-muted)';
                        const borderBottom = idx < sessions.length - 1 ? 'border-bottom: 1px solid var(--border-color);' : '';
                        const hasEvaluationScore = s.overall_score !== null && s.overall_score !== undefined;
                        const scoreSummary = hasEvaluationScore
                            ? `<span style="font-size:0.75rem; color:var(--text-color); margin-top:0.35rem; display:inline-flex; align-items:center; gap:0.3rem;"><i class="fas fa-chart-line" style="color: var(--primary-color);"></i> ${Math.round(s.overall_score)}% ${isAr ? 'تقييم' : 'Score'}</span>`
                            : '';
                        
                        html += `
                            <div style="padding: 1rem; display: flex; justify-content: space-between; align-items: center; gap: 1rem; ${borderBottom} cursor: pointer; transition: background 0.2s;" 
                                 class="master-session-row" data-session-id="${s.session_id}" onmouseover="this.style.background='var(--bg-secondary)'" onmouseout="this.style.background='transparent'">
                                <div style="flex: 1;">
                                    <strong style="color: var(--text-color); font-size: 0.95rem; display: block; margin-bottom: 0.25rem;">
                                        ${label} #${sessions.length - idx}
                                    </strong>
                                    <div style="font-size: 0.8rem; color: var(--text-muted); display:flex; flex-wrap:wrap; gap:0.5rem; align-items:center;">
                                        <span><i class="fas fa-briefcase"></i> ${s.job_title || 'Unknown Job'} (v${s.version_number || '1'})</span>
                                        <span><i class="fas fa-calendar-alt"></i> ${dateStr}</span>
                                        ${scoreSummary}
                                    </div>
                                </div>
                                <div style="display: flex; align-items: center; gap: 0.75rem;">
                                    <span style="background:${statusColor}; color:white; padding:0.15rem 0.5rem; border-radius:12px; font-size:0.75rem; font-weight:600; text-transform: capitalize;">
                                        ${safeStatus}
                                    </span>
                                    <i class="fas ${isAr ? 'fa-chevron-left' : 'fa-chevron-right'}" style="color: var(--text-muted);"></i>
                                </div>
                            </div>
                        `;
                    });
                    
                    html += `</div></div>`;
                }
                html += `</div>`;
                
                const body = modal.element.querySelector('.modal-body');
                body.innerHTML = html;
                
                body.querySelectorAll('.master-session-row').forEach(row => {
                    row.addEventListener('click', () => {
                        const sid = row.dataset.sessionId;
                        const session = transcripts.find(x => x.session_id == sid);
                        if (session) renderDetail(session);
                    });
                });
            };

            const renderDetail = (s) => {
                const type = s.session_type || 'other';
                const label = typeLabels[type] || type;
                const safeStatus = (s.pipeline_status && s.pipeline_status !== 'None') ? s.pipeline_status : 'pending';
                const dateStr = s.created_at ? new Date(s.created_at).toLocaleString(isAr ? 'ar-EG' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '-';
                const statusColor = statusColors[safeStatus] || 'var(--text-muted)';
                const formattedTranscript = this._formatTranscript(s.full_transcript);
                
                let transcriptHtml = '';
                if (safeStatus === 'completed') {
                    transcriptHtml = `
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 0.75rem;">
                            <strong style="color:var(--text-color); font-size:0.9rem;">${isAr ? 'النص المفرغ:' : 'Transcript Content:'}</strong>
                            <button class="btn btn-outline copy-transcript-btn" data-session-id="${s.session_id}" style="padding: 0.2rem 0.6rem; font-size: 0.75rem; display:inline-flex; align-items:center; gap:0.25rem;">
                                <i class="fas fa-copy"></i> ${isAr ? 'نسخ' : 'Copy'}
                            </button>
                        </div>
                        <div class="transcript-text-container" style="max-height: 40vh; overflow-y: auto; background: var(--bg-secondary); padding: 1rem; border-radius: 6px; border: 1px solid var(--border-color);">
                            ${formattedTranscript}
                        </div>
                    `;
                } else if (safeStatus === 'running') {
                    transcriptHtml = `
                        <div style="text-align:center; padding: 2rem; color: var(--info); background: var(--bg-secondary); border-radius: 6px; border: 1px dashed var(--border-color);">
                            <i class="fas fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                            <p>${isAr ? 'جاري التفريغ...' : 'AI pipeline is running transcription...'}</p>
                        </div>
                    `;
                } else if (safeStatus === 'pending') {
                    transcriptHtml = `
                        <div style="text-align:center; padding: 2rem; color: var(--warning); background: var(--bg-secondary); border-radius: 6px; border: 1px dashed var(--border-color);">
                            <i class="fas fa-clock" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                            <p>${isAr ? 'قيد الانتظار...' : 'Pending transcription...'}</p>
                        </div>
                    `;
                } else {
                    transcriptHtml = `
                        <div style="text-align:center; padding: 2rem; color: var(--danger); background: var(--bg-secondary); border-radius: 6px; border: 1px dashed var(--border-color);">
                            <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                            <p>${isAr ? 'فشلت العملية.' : 'Transcription failed.'}</p>
                        </div>
                    `;
                }
                
                const evalScore = (s.overall_score !== null && s.overall_score !== undefined) ? Math.round(s.overall_score) : null;
                const evalConfidence = (s.confidence_score !== null && s.confidence_score !== undefined)
                    ? (s.confidence_score > 1 ? Math.round(s.confidence_score) : Math.round(s.confidence_score * 100))
                    : null;
                const recommendationText = s.hiring_recommendation ? s.hiring_recommendation : null;
                const summaryText = s.executive_summary ? s.executive_summary : null;

                const evaluationOverview = `
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.75rem; margin-bottom: 1rem;">
                        ${evalScore !== null ? `<div style="background: rgba(16, 185, 129, 0.08); padding: 0.9rem; border-radius: 10px;"><strong>${isAr ? 'التقييم الكلي' : 'Overall Score'}</strong><div style="font-size: 1.5rem; font-weight: 700; margin-top: 0.4rem;">${evalScore}%</div></div>` : ''}
                        ${evalConfidence !== null ? `<div style="background: rgba(59, 130, 246, 0.08); padding: 0.9rem; border-radius: 10px;"><strong>${isAr ? 'ثقة الذكاء الاصطناعي' : 'AI Confidence'}</strong><div style="font-size: 1.5rem; font-weight: 700; margin-top: 0.4rem;">${evalConfidence}%</div></div>` : ''}
                        ${recommendationText ? `<div style="background: rgba(245, 158, 11, 0.08); padding: 0.9rem; border-radius: 10px;"><strong>${isAr ? 'التوصية' : 'Recommendation'}</strong><div style="margin-top: 0.4rem;">${recommendationText}</div></div>` : ''}
                    </div>
                `;

                const summarySection = summaryText ? `
                    <div style="margin-bottom: 1rem; padding: 1rem; border-radius: 10px; background: rgba(79, 70, 229, 0.05); border: 1px solid rgba(79, 70, 229, 0.12);">
                        <strong style="display:block; margin-bottom:0.5rem;">${isAr ? 'ملخص التقييم التنفيذي' : 'Evaluation Summary'}</strong>
                        <p style="margin:0; line-height:1.6; color: var(--text-color);">${summaryText}</p>
                    </div>
                ` : '';

                const html = `
                    <div>
                        <button class="btn btn-outline back-to-list-btn" style="margin-bottom: 1rem; padding: 0.25rem 0.75rem; font-size: 0.85rem;">
                            <i class="fas ${isAr ? 'fa-arrow-right' : 'fa-arrow-left'}"></i> ${isAr ? 'الرجوع للقائمة' : 'Back to List'}
                        </button>
                        
                        <div style="border: 1px solid var(--border-color); border-radius: 8px; padding: 1.25rem; background: var(--bg-primary);">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid rgba(0,0,0,0.05); gap: 1rem;">
                                <div style="flex: 1; min-width: 0;">
                                    <h4 style="margin: 0 0 0.5rem 0; color: var(--text-color);">${label}</h4>
                                    <div style="font-size: 0.85rem; color: var(--text-muted); display:flex; flex-direction:column; gap:0.25rem;">
                                        <span><i class="fas fa-briefcase"></i> ${s.job_title || 'Unknown Job'} (v${s.version_number || '1'})</span>
                                        <span><i class="fas fa-calendar-alt"></i> ${dateStr}</span>
                                    </div>
                                </div>
                                <div style="display:flex; flex-direction:column; gap:0.5rem; align-items:flex-end;">
                                    <span style="background:${statusColor}; color:white; padding:0.25rem 0.75rem; border-radius:12px; font-size:0.8rem; font-weight:600; text-transform: capitalize;">
                                        ${safeStatus}
                                    </span>
                                    <button class="btn btn-primary view-evaluation-btn" style="padding: 0.6rem 0.9rem; font-size: 0.85rem; white-space:nowrap;">
                                        <i class="fas fa-eye"></i> ${isAr ? 'عرض التقييم' : 'View Evaluation'}
                                    </button>
                                </div>
                            </div>
                            ${evaluationOverview}
                            ${summarySection}
                            ${transcriptHtml}
                        </div>
                    </div>
                `;
                
                const body = modal.element.querySelector('.modal-body');
                body.innerHTML = html;
                
                body.querySelector('.back-to-list-btn').addEventListener('click', () => {
                    renderMaster();
                });
                
                const viewEvalBtn = body.querySelector('.view-evaluation-btn');
                if (viewEvalBtn) {
                    viewEvalBtn.addEventListener('click', () => {
                        sessionStorage.setItem('candidate_eval_return', window.location.hash || '/candidates');
                        modal.close();
                        window.location.hash = `/sessions/${s.session_id}/evaluation`;
                    });
                }

                const copyBtn = body.querySelector('.copy-transcript-btn');
                if (copyBtn) {
                    copyBtn.addEventListener('click', async () => {
                        const txt = s.full_transcript || '';
                        try {
                            await navigator.clipboard.writeText(txt);
                            Toast.show(isAr ? 'تم نسخ النص بنجاح!' : 'Transcript copied to clipboard!', 'success');
                        } catch (err) {
                            Toast.show(isAr ? 'فشل نسخ النص' : 'Failed to copy', 'error');
                        }
                    });
                }
            };
            
            renderMaster();
            
        } catch (error) {
            console.error(error);
            modal.element.querySelector('.modal-body').innerHTML = `
                <div style="text-align: center; padding: 2rem; color: var(--danger);">
                    <i class="fas fa-exclamation-circle" style="font-size: 2.5rem; margin-bottom: 1rem;"></i>
                    <p>${isAr ? 'فشل تحميل سجلات المقابلات.' : 'Failed to load transcripts.'}</p>
                </div>
            `;
        }
    }

    async refresh() {
        await this.fetchData();
        const contentArea = document.getElementById('app-content');
        if (contentArea) {
            contentArea.innerHTML = this.render();
            this.mount();
        }
    }

    _downloadTemplate() {
        const csvContent = [
            'full_name,email,phone,linkedin_url,github_url,source',
            'Ahmed Mohamed,ahmed@example.com,+201001234567,https://linkedin.com/in/ahmed,,LinkedIn',
            'Sara Ali,sara@example.com,+201112345678,,,Job Board'
        ].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'candidates_import_template.csv';
        a.click();
        URL.revokeObjectURL(url);
    }

    openImportModal() {
        const isAr = getLang() === 'ar';

        const content = `
            <div style="display:flex; flex-direction:column; gap:1.25rem;">

                <div style="background:rgba(var(--primary-color-rgb,79,70,229),0.06); border:1px solid rgba(var(--primary-color-rgb,79,70,229),0.15); border-radius:10px; padding:1rem;">
                    <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.75rem;">
                        <i class="fas fa-info-circle" style="color:var(--primary-color);"></i>
                        <strong style="color:var(--primary-color);">${isAr ? 'صيغة الملف المطلوبة' : 'Required File Format'}</strong>
                    </div>
                    <div style="font-size:0.85rem; color:var(--text-muted); line-height:1.7;">
                        <p style="margin:0 0 0.5rem 0;">${isAr ? 'الأعمدة المطلوبة (يدعم الأسماء بالعربي والإنجليزي):' : 'Required columns (Arabic & English headers supported):'}</p>
                        <div style="display:flex; flex-wrap:wrap; gap:0.4rem;">
                            <span style="background:var(--danger-color,#ef4444); color:#fff; padding:0.2rem 0.5rem; border-radius:4px; font-size:0.78rem; font-weight:600;">full_name *</span>
                            <span style="background:var(--danger-color,#ef4444); color:#fff; padding:0.2rem 0.5rem; border-radius:4px; font-size:0.78rem; font-weight:600;">email *</span>
                            <span style="background:rgba(0,0,0,0.08); color:var(--text-muted); padding:0.2rem 0.5rem; border-radius:4px; font-size:0.78rem;">phone</span>
                            <span style="background:rgba(0,0,0,0.08); color:var(--text-muted); padding:0.2rem 0.5rem; border-radius:4px; font-size:0.78rem;">linkedin_url</span>
                            <span style="background:rgba(0,0,0,0.08); color:var(--text-muted); padding:0.2rem 0.5rem; border-radius:4px; font-size:0.78rem;">github_url</span>
                            <span style="background:rgba(0,0,0,0.08); color:var(--text-muted); padding:0.2rem 0.5rem; border-radius:4px; font-size:0.78rem;">source</span>
                        </div>
                        <p style="margin:0.6rem 0 0 0;">${isAr ? 'الصيغ المدعومة: Excel (.xlsx, .xls) · CSV · TSV' : 'Supported formats: Excel (.xlsx, .xls) · CSV · TSV'}</p>
                    </div>
                    <button id="dl-template-btn" class="btn btn-outline" style="margin-top:0.75rem; padding:0.35rem 0.8rem; font-size:0.82rem;">
                        <i class="fas fa-download"></i> ${isAr ? 'تحميل نموذج CSV' : 'Download CSV Template'}
                    </button>
                </div>

                <div>
                    <label class="form-label" style="font-weight:600;">${isAr ? 'اختر الملفات للاستيراد' : 'Select files to import'}</label>
                    <label for="import-file-input" id="import-drop-zone"
                        style="display:flex; flex-direction:column; align-items:center; justify-content:center; gap:0.5rem;
                               border:2px dashed var(--border-color); border-radius:12px; padding:2rem 1rem;
                               cursor:pointer; transition:all 0.2s; background:var(--bg-secondary);
                               text-align:center;">
                        <i class="fas fa-cloud-upload-alt" style="font-size:2rem; color:var(--primary-color);"></i>
                        <span style="font-size:0.9rem; color:var(--text-muted);">${isAr ? 'اسحب الملفات هنا أو اضغط للاختيار' : 'Drag & drop files or click to select'}</span>
                        <span id="import-file-names" style="font-size:0.8rem; color:var(--text-color); font-weight:600; margin-top:0.5rem;"></span>
                    </label>
                    <input type="file" id="import-file-input" accept=".xlsx,.xls,.csv,.tsv,.txt"
                        multiple style="display:none;">
                </div>

                <div id="import-results" style="display:none;"></div>
            </div>
        `;

        const modal = new Modal({
            title: `<i class="fas fa-file-import" style="color:var(--primary-color);margin-right:0.5rem;"></i> ${isAr ? 'استيراد مرشحين من ملفات' : 'Import Candidates from Files'}`,
            content,
            saveText: isAr ? 'استيراد الآن' : 'Import Now',
            onSave: async (modalEl) => {
                const fileInput = modalEl.querySelector('#import-file-input');
                const resultsEl = modalEl.querySelector('#import-results');
                if (!fileInput || !fileInput.files.length) {
                    Toast.show(isAr ? 'الرجاء اختيار ملف واحد أو أكثر' : 'Please select one or more files', 'error');
                    return false;
                }

                resultsEl.style.display = 'none';
                resultsEl.innerHTML = '';

                const formData = new FormData();
                Array.from(fileInput.files).forEach(file => {
                    formData.append('files', file);
                });

                let result;
                try {
                    result = await api.post('/candidates/bulk-import', formData);
                } catch (err) {
                    const message = err?.message || (isAr ? 'فشل الاستيراد' : 'Import failed');
                    Toast.show(message, 'error');
                    return false;
                }

                const created = result.created || [];
                const skipped = result.skipped || [];
                const errors  = result.errors  || [];
                const filesProcessed = result.files_processed || 0;
                const filesErrors = result.files_errors || [];
                const total   = result.total_rows || (created.length + skipped.length + errors.length);

                const summaryText = isAr
                    ? `تم استيراد ${created.length} مرشح${created.length === 1 ? '' : 'ين'} بنجاح من أصل ${total}`
                    : `${created.length} candidate(s) imported successfully out of ${total}`;

                if (created.length > 0) {
                    Toast.show(summaryText, 'success');
                    await this.refresh();
                } else if (!errors.length && skipped.length > 0) {
                    Toast.show(isAr ? 'تم تخطي جميع الصفوف لوجودها مسبقاً' : 'All rows skipped because candidates already exist', 'warning');
                }

                let html = `
                    <div style="border-radius:10px; overflow:hidden; border:1px solid var(--border-color);">
                        <div style="display:grid; grid-template-columns:repeat(3,1fr); text-align:center; background:var(--bg-secondary);">
                            <div style="padding:0.9rem; border-right:1px solid var(--border-color);">
                                <div style="font-size:1.6rem; font-weight:800; color:#10b981;">${created.length}</div>
                                <div style="font-size:0.78rem; color:var(--text-muted);">${isAr ? 'تم الإضافة' : 'Created'}</div>
                            </div>
                            <div style="padding:0.9rem; border-right:1px solid var(--border-color);">
                                <div style="font-size:1.6rem; font-weight:800; color:#f59e0b;">${skipped.length}</div>
                                <div style="font-size:0.78rem; color:var(--text-muted);">${isAr ? 'تم تخطيه' : 'Skipped'}</div>
                            </div>
                            <div style="padding:0.9rem;">
                                <div style="font-size:1.6rem; font-weight:800; color:#ef4444;">${errors.length}</div>
                                <div style="font-size:0.78rem; color:var(--text-muted);">${isAr ? 'أخطاء' : 'Errors'}</div>
                            </div>
                        </div>
                        <div style="border-top:1px solid var(--border-color); padding:0.75rem 1rem; background:rgba(0,0,0,0.01);">
                            <div style="font-size:0.85rem; color:var(--text-muted);">
                                <i class="fas fa-info-circle"></i> ${isAr ? 'تمت معالجة' : 'Processed'} ${filesProcessed} ${isAr ? 'ملف' : 'file(s)'} • ${isAr ? 'إجمالي الصفوف' : 'Total rows'}: ${total}
                            </div>
                        </div>
                `;

                if (filesErrors.length > 0) {
                    html += `
                        <div style="border-top:1px solid var(--border-color); padding:0.75rem 1rem;">
                            <div style="font-weight:600; color:#ef4444; margin-bottom:0.5rem; display:flex; align-items:center; gap:0.4rem;">
                                <i class="fas fa-warning"></i> ${isAr ? 'ملفات بها مشاكل' : 'Files with Issues'} (${filesErrors.length})
                            </div>
                            <ul style="margin:0; padding:0 0 0 1.2rem; font-size:0.82rem; color:var(--text-color); max-height:80px; overflow-y:auto;">
                                ${filesErrors.map(fe => `<li><strong>${fe.file}</strong>: ${fe.error}</li>`).join('')}
                            </ul>
                        </div>
                    `;
                }

                const renderSection = (items, color, icon, titleEn, titleAr, rowRenderer) => {
                    if (!items.length) return '';
                    return `
                        <div style="border-top:1px solid var(--border-color); padding:0.75rem 1rem;">
                            <div style="font-weight:600; color:${color}; margin-bottom:0.5rem; display:flex; align-items:center; gap:0.4rem;">
                                <i class="fas ${icon}"></i> ${isAr ? titleAr : titleEn} (${items.length})
                            </div>
                            <ul style="margin:0; padding:0 0 0 1.2rem; font-size:0.82rem; color:var(--text-color); max-height:120px; overflow-y:auto;">
                                ${items.map(rowRenderer).join('')}
                            </ul>
                        </div>`;
                };

                html += renderSection(created, '#10b981', 'fa-check-circle',
                    'Successfully Created', 'تم إضافتهم بنجاح',
                    r => `<li><strong>${r.full_name}</strong> &lt;${r.email}&gt; ${r.source_file ? `<span style="font-size:0.75rem; color:var(--text-muted);">(${r.source_file})</span>` : ''}</li>`);

                html += renderSection(skipped, '#f59e0b', 'fa-exclamation-circle',
                    'Skipped (duplicates)', 'تم تخطيهم (مكررون)',
                    r => `<li><strong>${r.full_name || r.email || ''}</strong> &lt;${r.email || ''}&gt; — ${r.reason} ${r.source_file ? `<span style="font-size:0.75rem; color:var(--text-muted);">(${r.source_file})</span>` : ''}</li>`);

                html += renderSection(errors, '#ef4444', 'fa-times-circle',
                    'Errors', 'أخطاء',
                    r => `<li>${isAr ? 'صف' : 'Row'} ${r.row}: ${r.reason} ${r.source_file ? `<span style="font-size:0.75rem; color:var(--text-muted);">(${r.source_file})</span>` : ''}</li>`);

                html += `</div>`;
                resultsEl.innerHTML = html;
                resultsEl.style.display = 'block';

                return skipped.length > 0 || errors.length > 0 || filesErrors.length > 0 ? false : true;
            }
        });

        modal.show();

        // Bind template download
        setTimeout(() => {
            const dlBtn = modal.element.querySelector('#dl-template-btn');
            if (dlBtn) dlBtn.addEventListener('click', (e) => { e.preventDefault(); this._downloadTemplate(); });

            const fileInput = modal.element.querySelector('#import-file-input');
            const fileNames  = modal.element.querySelector('#import-file-names');
            const dropZone  = modal.element.querySelector('#import-drop-zone');

            if (fileInput && fileNames) {
                fileInput.addEventListener('change', () => {
                    if (fileInput.files.length) {
                        const names = Array.from(fileInput.files).map(f => f.name).join(', ');
                        fileNames.textContent = `📁 ${fileInput.files.length} ${isAr ? 'ملف' : 'file(s)'}: ${names}`;
                        dropZone.style.borderColor = 'var(--primary-color)';
                        dropZone.style.background  = 'rgba(var(--primary-color-rgb,79,70,229),0.05)';
                    }
                });
            }

            // Drag & drop support
            if (dropZone && fileInput) {
                dropZone.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    dropZone.style.borderColor = 'var(--primary-color)';
                });
                dropZone.addEventListener('dragleave', () => {
                    dropZone.style.borderColor = 'var(--border-color)';
                });
                dropZone.addEventListener('drop', (e) => {
                    e.preventDefault();
                    const dt = e.dataTransfer;
                    if (dt && dt.files.length) {
                        const dataTransfer = new DataTransfer();
                        Array.from(dt.files).forEach(file => {
                            dataTransfer.items.add(file);
                        });
                        fileInput.files = dataTransfer.files;
                        const names = Array.from(fileInput.files).map(f => f.name).join(', ');
                        fileNames.textContent = `📁 ${fileInput.files.length} ${isAr ? 'ملف' : 'file(s)'}: ${names}`;
                        dropZone.style.borderColor = 'var(--primary-color)';
                        dropZone.style.background  = 'rgba(var(--primary-color-rgb,79,70,229),0.05)';
                    }
                });
            }
        }, 50);
    }
}