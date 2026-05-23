import { t, getLang } from '../core/i18n.js';
import { api } from '../core/api.js';
import { Modal } from '../components/Modal.js';
import { Toast } from '../components/Toast.js';

export class JobsSection {
    constructor() {
        this.jobs = [];
        this.filteredJobs = [];
        this.searchQuery = '';
        this.selectedDept = 'all';
        this.selectedStatus = 'all';
    }

    async fetchData() {
        try {
            this.jobs = await api.get('/jobs/summary');
            this.filteredJobs = [...this.jobs];
        } catch (error) {
            Toast.show(t('error'), 'error');
            this.jobs = [];
            this.filteredJobs = [];
        }
    }

    getDepartments() {
        const depts = new Set(this.jobs.map(j => j.department).filter(Boolean));
        return Array.from(depts);
    }

    applyFilters() {
        this.filteredJobs = this.jobs.filter(job => {
            const matchesSearch = job.title.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                                 (job.department && job.department.toLowerCase().includes(this.searchQuery.toLowerCase()));
            
            const matchesDept = this.selectedDept === 'all' || job.department === this.selectedDept;
            
            const matchesStatus = this.selectedStatus === 'all' || job.status === this.selectedStatus;
            
            return matchesSearch && matchesDept && matchesStatus;
        });

        this.renderGridOnly();
    }

    renderGridOnly() {
        const isAr = getLang() === 'ar';
        const gridContainer = document.getElementById('jobs-grid-container');
        if (!gridContainer) return;

        const labels = {
            noJobs: isAr ? "لم يتم العثور على أي وظائف تطابق البحث." : "No jobs found matching the search criteria.",
            versions: isAr ? "الإصدارات" : "Versions",
            candidates: isAr ? "المرشحين" : "Candidates",
            viewDetails: isAr ? "التفاصيل" : "Details",
            edit: isAr ? "تعديل" : "Edit",
            delete: isAr ? "حذف" : "Delete"
        };

        if (this.filteredJobs.length === 0) {
            gridContainer.innerHTML = `<div class="empty-state" style="grid-column: 1/-1;">${labels.noJobs}</div>`;
            return;
        }

        gridContainer.innerHTML = this.filteredJobs.map(job => {
            // Status pill with custom glow
            let statusClass = 'status-draft';
            let pulsingDot = '';
            if (job.status === 'open') {
                statusClass = 'status-open';
                pulsingDot = `<span class="pulsing-dot"></span>`;
            } else if (job.status === 'closed') {
                statusClass = 'status-closed';
            }

            return `
                <div class="job-card card">
                    <div class="job-card-header">
                        <div class="job-badge-row">
                            <span class="dept-badge"><i class="fas fa-users-cog"></i> ${job.department || 'General'}</span>
                            <span class="status-badge ${statusClass}">${pulsingDot} ${job.status.toUpperCase()}</span>
                        </div>
                        <h3 class="job-title-text" title="${job.title}">${job.title}</h3>
                    </div>
                    
                    <div class="job-card-body">
                        <div class="job-meta-item"><i class="fas fa-map-marker-alt"></i> ${job.location || 'Remote'}</div>
                        <div class="job-meta-item"><i class="fas fa-briefcase"></i> ${job.employment_type || 'Full-time'}</div>
                        
                        <div class="job-stats-container">
                            <div class="job-stat-box job-stat-box-versions" data-id="${job.id}" title="Manage Job Versions">
                                <span class="stat-num">${job.version_count}</span>
                                <span class="stat-label">${labels.versions}</span>
                            </div>
                            <div class="job-stat-box job-stat-box-candidates" title="View Candidates">
                                <span class="stat-num">${job.candidate_count}</span>
                                <span class="stat-label">${labels.candidates}</span>
                            </div>
                        </div>
                    </div>

                    <div class="job-card-footer">
                        <button class="btn btn-outline manage-versions-btn" data-id="${job.id}" style="flex:1.2; padding: 0.4rem; font-size: 0.85rem;"><i class="fas fa-code-branch"></i> ${labels.versions}</button>
                        <button class="btn btn-outline-info view-job-btn" data-id="${job.id}" style="flex:1; padding: 0.4rem; font-size: 0.85rem;"><i class="fas fa-info-circle"></i> ${labels.viewDetails}</button>
                        <button class="btn btn-outline edit-job-btn" data-id="${job.id}" style="padding: 0.4rem 0.6rem; font-size: 0.85rem;" title="Edit Job"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-outline-danger delete-job-btn" data-id="${job.id}" style="padding: 0.4rem 0.6rem; font-size: 0.85rem;" title="Delete Job"><i class="fas fa-trash-alt"></i></button>
                    </div>
                </div>
            `;
        }).join('');
    }

    render() {
        const isAr = getLang() === 'ar';
        
        const labels = {
            title: isAr ? "لوحة إدارة الوظائف" : "Job Positions Dashboard",
            subtitle: isAr ? "إدارة وتعديل وإنشاء بطاقات الوظائف وإصدارات التقييم الذكي الخاصة بها." : "Manage, edit, and create job profiles along with their smart AI evaluation criteria versions.",
            newJob: isAr ? "إضافة وظيفة جديدة" : "New Job Position",
            searchPlaceholder: isAr ? "البحث عن وظيفة بالاسم..." : "Search jobs by title...",
            allDepts: isAr ? "كل الأقسام" : "All Departments",
            allStatuses: isAr ? "كل الحالات" : "All Statuses",
            statusDraft: isAr ? "مسودة" : "Draft",
            statusOpen: isAr ? "مفتوحة" : "Open",
            statusClosed: isAr ? "مغلقة" : "Closed"
        };

        const deptOptions = this.getDepartments().map(dept => {
            return `<option value="${dept}" ${this.selectedDept === dept ? 'selected' : ''}>${dept}</option>`;
        }).join('');

        return `
            <style>
                .jobs-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
                    gap: 1.5rem;
                    margin-top: 1.5rem;
                }
                .job-card {
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.03);
                    border-radius: 12px;
                    border: 1px solid var(--border-color);
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    overflow: hidden;
                    background: var(--bg-card);
                }
                .job-card:hover {
                    box-shadow: 0 8px 25px rgba(0,0,0,0.08);
                    transform: translateY(-4px);
                    border-color: var(--primary-color);
                }
                .job-card-header {
                    padding: 1.25rem 1.25rem 0.5rem 1.25rem;
                    border-bottom: 1px solid rgba(0,0,0,0.03);
                }
                .job-badge-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 0.75rem;
                }
                .dept-badge {
                    font-size: 0.75rem;
                    background: rgba(var(--primary-color-rgb, 79, 70, 229), 0.08);
                    color: var(--primary-color);
                    padding: 0.25rem 0.6rem;
                    border-radius: 50px;
                    font-weight: 600;
                }
                .status-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.3rem;
                    font-size: 0.7rem;
                    padding: 0.2rem 0.5rem;
                    border-radius: 50px;
                    font-weight: 700;
                    letter-spacing: 0.5px;
                }
                .status-draft { background: rgba(100, 116, 139, 0.1); color: #64748b; }
                .status-open { background: rgba(16, 185, 129, 0.1); color: #10b981; }
                .status-closed { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
                
                .pulsing-dot {
                    width: 6px;
                    height: 6px;
                    background: #10b981;
                    border-radius: 50%;
                    display: inline-block;
                    animation: pulse-glow 1.5s infinite;
                }
                @keyframes pulse-glow {
                    0% { transform: scale(0.9); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
                    70% { transform: scale(1.1); box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
                    100% { transform: scale(0.9); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
                }

                .job-title-text {
                    font-size: 1.25rem;
                    font-weight: 700;
                    margin: 0;
                    color: var(--text-color);
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .job-card-body {
                    padding: 1.25rem;
                    flex-grow: 1;
                }
                .job-meta-item {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    color: var(--text-muted);
                    font-size: 0.85rem;
                    margin-bottom: 0.5rem;
                }
                .job-meta-item i {
                    width: 16px;
                    color: var(--primary-color);
                }
                .job-stats-container {
                    display: flex;
                    gap: 1rem;
                    margin-top: 1.25rem;
                    border-top: 1px solid var(--border-color);
                    padding-top: 1rem;
                }
                .job-stat-box {
                    flex: 1;
                    text-align: center;
                    background: var(--bg-secondary);
                    padding: 0.6rem;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    border: 1px solid transparent;
                }
                .job-stat-box:hover {
                    background: rgba(var(--primary-color-rgb), 0.03);
                    border-color: var(--primary-color);
                }
                .stat-num {
                    display: block;
                    font-size: 1.4rem;
                    font-weight: 800;
                    color: var(--text-color);
                }
                .stat-label {
                    font-size: 0.75rem;
                    color: var(--text-muted);
                    font-weight: 600;
                }
                .job-card-footer {
                    padding: 1rem 1.25rem 1.25rem 1.25rem;
                    border-top: 1px solid var(--border-color);
                    display: flex;
                    gap: 0.5rem;
                }
                .search-filter-panel {
                    background: var(--bg-card);
                    border-radius: 12px;
                    border: 1px solid var(--border-color);
                    padding: 1rem;
                    margin-bottom: 2rem;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.02);
                }
                .filter-inputs-row {
                    display: flex;
                    gap: 1rem;
                    flex-wrap: wrap;
                }
                .filter-input-wrapper {
                    flex: 1;
                    min-width: 200px;
                }
            </style>

            <div class="jobs-container">
                <!-- Header -->
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2.5rem; flex-wrap: wrap; gap:1.5rem;">
                    <div>
                        <h1 style="color: var(--primary-color); font-size: 2.2rem; font-weight: 800; margin: 0;">${labels.title}</h1>
                        <p style="color: var(--text-muted); margin: 0.3rem 0 0 0; font-size: 1.05rem;">${labels.subtitle}</p>
                    </div>
                    <button id="add-job-btn" class="btn btn-primary" style="box-shadow: 0 4px 12px rgba(var(--primary-color-rgb), 0.2);"><i class="fas fa-plus"></i> ${labels.newJob}</button>
                </div>

                <!-- Filters Panel -->
                <div class="search-filter-panel">
                    <div class="filter-inputs-row">
                        <div class="filter-input-wrapper" style="flex: 2;">
                            <input type="text" id="jobs-search-input" class="form-control" placeholder="${labels.searchPlaceholder}" value="${this.searchQuery}">
                        </div>
                        <div class="filter-input-wrapper">
                            <select id="jobs-dept-filter" class="form-control">
                                <option value="all">${labels.allDepts}</option>
                                ${deptOptions}
                            </select>
                        </div>
                        <div class="filter-input-wrapper">
                            <select id="jobs-status-filter" class="form-control">
                                <option value="all" ${this.selectedStatus === 'all' ? 'selected' : ''}>${labels.allStatuses}</option>
                                <option value="draft" ${this.selectedStatus === 'draft' ? 'selected' : ''}>${labels.statusDraft}</option>
                                <option value="open" ${this.selectedStatus === 'open' ? 'selected' : ''}>${labels.statusOpen}</option>
                                <option value="closed" ${this.selectedStatus === 'closed' ? 'selected' : ''}>${labels.statusClosed}</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Jobs Grid -->
                <div id="jobs-grid-container" class="jobs-grid">
                    <!-- Cards will be injected dynamically -->
                </div>
            </div>
        `;
    }

    mount() {
        // Initial Grid Render
        this.renderGridOnly();

        // 1. Add Job Button
        document.getElementById('add-job-btn').addEventListener('click', () => {
            this.openJobForm();
        });

        // 2. Reactive Search Input
        const searchInput = document.getElementById('jobs-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value.trim();
                this.applyFilters();
            });
        }

        // 3. Reactive Dept Filter Select
        const deptSelect = document.getElementById('jobs-dept-filter');
        if (deptSelect) {
            deptSelect.addEventListener('change', (e) => {
                this.selectedDept = e.target.value;
                this.applyFilters();
            });
        }

        // 4. Reactive Status Filter Select
        const statusSelect = document.getElementById('jobs-status-filter');
        if (statusSelect) {
            statusSelect.addEventListener('change', (e) => {
                this.selectedStatus = e.target.value;
                this.applyFilters();
            });
        }

        // 5. Grid Actions Delegation
        const gridContainer = document.getElementById('jobs-grid-container');
        if (gridContainer) {
            gridContainer.addEventListener('click', (e) => {
                const editBtn = e.target.closest('.edit-job-btn');
                const delBtn = e.target.closest('.delete-job-btn');
                const viewBtn = e.target.closest('.view-job-btn');
                const versionsBtn = e.target.closest('.manage-versions-btn');
                const statVersions = e.target.closest('.job-stat-box-versions');
                const statCandidates = e.target.closest('.job-stat-box-candidates');

                if (editBtn) {
                    const job = this.jobs.find(j => j.id == editBtn.dataset.id);
                    if (job) this.openJobForm(job);
                }
                if (delBtn) {
                    this.deleteJob(delBtn.dataset.id);
                }
                if (viewBtn) {
                    const job = this.jobs.find(j => j.id == viewBtn.dataset.id);
                    if (job) this.showJobDetails(job);
                }
                if (versionsBtn) {
                    window.location.hash = `/jobs/${versionsBtn.dataset.id}/versions`;
                }
                if (statVersions) {
                    window.location.hash = `/jobs/${statVersions.dataset.id}/versions`;
                }
                if (statCandidates) {
                    window.location.hash = `/candidates`;
                }
            });
        }
    }

    showJobDetails(job) {
        const isAr = getLang() === 'ar';
        const labels = {
            title: isAr ? "تفاصيل الوظيفة" : "Job Profile Details",
            jobTitle: isAr ? "المسمى الوظيفي" : "Title",
            dept: isAr ? "القسم" : "Department",
            loc: isAr ? "الموقع" : "Location",
            type: isAr ? "نوع التوظيف" : "Employment Type",
            status: isAr ? "حالة الوظيفة" : "Status",
            versions: isAr ? "إصدارات التقييم" : "Active AI Versions",
            candidates: isAr ? "عدد المتقدمين الكلي" : "Total Applicants"
        };

        const content = `
            <div style="font-size: 1.05rem; line-height: 1.8;">
                <div style="margin-bottom: 0.8rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">
                    <strong><i class="fas fa-heading"></i> ${labels.jobTitle}:</strong> ${job.title}
                </div>
                <div style="margin-bottom: 0.8rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">
                    <strong><i class="fas fa-users-cog"></i> ${labels.dept}:</strong> ${job.department || '-'}
                </div>
                <div style="margin-bottom: 0.8rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">
                    <strong><i class="fas fa-map-marker-alt"></i> ${labels.loc}:</strong> ${job.location || '-'}
                </div>
                <div style="margin-bottom: 0.8rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">
                    <strong><i class="fas fa-briefcase"></i> ${labels.type}:</strong> ${job.employment_type || '-'}
                </div>
                <div style="margin-bottom: 0.8rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">
                    <strong><i class="fas fa-toggle-on"></i> ${labels.status}:</strong> 
                    <span class="status-badge ${job.status === 'open' ? 'status-open' : job.status === 'closed' ? 'status-closed' : 'status-draft'}">${job.status.toUpperCase()}</span>
                </div>
                <div style="margin-bottom: 0.8rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">
                    <strong><i class="fas fa-code-branch"></i> ${labels.versions}:</strong> ${job.version_count} ${isAr ? 'إصدارات' : 'versions'}
                </div>
                <div style="margin-bottom: 0.5rem;">
                    <strong><i class="fas fa-user-friends"></i> ${labels.candidates}:</strong> ${job.candidate_count} ${isAr ? 'مرشحاً' : 'candidates'}
                </div>
            </div>
        `;
        const modal = new Modal({
            title: labels.title,
            content: content
        });
        modal.show();
    }

    openJobForm(job = null) {
        const isEdit = !!job;
        const content = `
            <div class="form-group">
                <label class="form-label">Title</label>
                <input type="text" id="job-title" class="form-control" value="${job ? job.title : ''}" required>
            </div>
            <div class="form-group">
                <label class="form-label">Department</label>
                <input type="text" id="job-dept" class="form-control" value="${job ? job.department : ''}" required>
            </div>
            <div class="form-group">
                <label class="form-label">Location</label>
                <input type="text" id="job-loc" class="form-control" value="${job ? job.location : ''}" required>
            </div>
            <div class="form-group">
                <label class="form-label">Employment Type</label>
                <input type="text" id="job-type" class="form-control" value="${job ? job.employment_type : 'Full-time'}" required>
            </div>
            <div class="form-group">
                <label class="form-label">Status</label>
                <select id="job-status" class="form-control">
                    <option value="draft" ${job && job.status === 'draft' ? 'selected' : ''}>Draft</option>
                    <option value="open" ${job && job.status === 'open' ? 'selected' : ''}>Open</option>
                    <option value="closed" ${job && job.status === 'closed' ? 'selected' : ''}>Closed</option>
                </select>
            </div>
        `;

        const modal = new Modal({
            title: isEdit ? 'Edit Job' : 'Create Job',
            content: content,
            saveText: isEdit ? 'Update' : 'Create',
            onSave: async (modalEl) => {
                const title = modalEl.querySelector('#job-title').value.trim();
                const department = modalEl.querySelector('#job-dept').value.trim();
                const location = modalEl.querySelector('#job-loc').value.trim();
                const employmentType = modalEl.querySelector('#job-type').value.trim();
                const status = modalEl.querySelector('#job-status').value;

                if (!title) {
                    Toast.show('Job title is required', 'error');
                    throw new Error('Validation failed');
                }
                if (!department) {
                    Toast.show('Department is required', 'error');
                    throw new Error('Validation failed');
                }
                if (!location) {
                    Toast.show('Location is required', 'error');
                    throw new Error('Validation failed');
                }
                if (!employmentType) {
                    Toast.show('Employment type is required', 'error');
                    throw new Error('Validation failed');
                }

                const payload = {
                    title,
                    department,
                    location,
                    employment_type: employmentType,
                    status
                };

                try {
                    if (isEdit) {
                        await api.fetch(`/jobs/${job.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
                        Toast.show('Job updated successfully', 'success');
                    } else {
                        await api.post('/jobs', payload);
                        Toast.show('Job created successfully', 'success');
                    }
                    await this.refresh();
                } catch (e) {
                    Toast.show(e.message || 'Error saving job', 'error');
                    throw e; 
                }
            }
        });
        modal.show();
    }

    async deleteJob(id) {
        if (!confirm('Are you sure you want to delete this job?')) return;
        try {
            await api.fetch(`/jobs/${id}`, { method: 'DELETE' });
            Toast.show('Job deleted successfully', 'success');
            await this.refresh();
        } catch (e) {
            Toast.show(e.message || 'Error deleting job', 'error');
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
}
