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
        const addBtn = document.getElementById('add-job-btn');
        if (addBtn) {
            // إزالة المستمع القديم قبل إضافة جديد
            if (addBtn._clickHandler) {
                addBtn.removeEventListener('click', addBtn._clickHandler);
            }
            addBtn._clickHandler = () => this.openJobForm();
            addBtn.addEventListener('click', addBtn._clickHandler);
        }

        // 2. Reactive Search Input
        const searchInput = document.getElementById('jobs-search-input');
        if (searchInput) {
            // إزالة المستمع القديم قبل إضافة جديد
            if (searchInput._inputHandler) {
                searchInput.removeEventListener('input', searchInput._inputHandler);
            }
            searchInput._inputHandler = (e) => {
                this.searchQuery = e.target.value.trim();
                this.applyFilters();
            };
            searchInput.addEventListener('input', searchInput._inputHandler);
        }

        // 3. Reactive Dept Filter Select
        const deptSelect = document.getElementById('jobs-dept-filter');
        if (deptSelect) {
            // إزالة المستمع القديم قبل إضافة جديد
            if (deptSelect._changeHandler) {
                deptSelect.removeEventListener('change', deptSelect._changeHandler);
            }
            deptSelect._changeHandler = (e) => {
                this.selectedDept = e.target.value;
                this.applyFilters();
            };
            deptSelect.addEventListener('change', deptSelect._changeHandler);
        }

        // 4. Reactive Status Filter Select
        const statusSelect = document.getElementById('jobs-status-filter');
        if (statusSelect) {
            // إزالة المستمع القديم قبل إضافة جديد
            if (statusSelect._changeHandler) {
                statusSelect.removeEventListener('change', statusSelect._changeHandler);
            }
            statusSelect._changeHandler = (e) => {
                this.selectedStatus = e.target.value;
                this.applyFilters();
            };
            statusSelect.addEventListener('change', statusSelect._changeHandler);
        }

        // 5. Grid Actions Delegation
        const gridContainer = document.getElementById('jobs-grid-container');
        if (gridContainer) {
            // إزالة المستمع القديم قبل إضافة جديد
            if (gridContainer._clickHandler) {
                gridContainer.removeEventListener('click', gridContainer._clickHandler);
            }
            gridContainer._clickHandler = (e) => {
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
            };
            gridContainer.addEventListener('click', gridContainer._clickHandler);
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
        const isAr = getLang() === 'ar';
        
        try {
            // Try normal delete first
            await api.fetch(`/jobs/${id}`, { method: 'DELETE' });
            Toast.show(isAr ? 'تم حذف الوظيفة بنجاح' : 'Job deleted successfully', 'success');
            await this.refresh();
        } catch (e) {
            // If blocked due to applications, show detailed preview
            if (e.message && e.message.includes('active job applications')) {
                await this._showForceDeleteModal(id);
            } else {
                Toast.show(e.message || (isAr ? 'خطأ في حذف الوظيفة' : 'Error deleting job'), 'error');
            }
        }
    }

    async _showForceDeleteModal(jobId) {
        const isAr = getLang() === 'ar';
        
        let preview;
        try {
            preview = await api.get(`/jobs/${jobId}/delete-preview`);
        } catch (e) {
            Toast.show(isAr ? 'فشل تحميل بيانات المرشحين' : 'Failed to load candidate data', 'error');
            return;
        }

        const statusColors = {
            applied: { bg: 'rgba(59,130,246,0.1)', color: '#3b82f6', label: isAr ? 'تم التقديم' : 'Applied' },
            screening: { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b', label: isAr ? 'فحص' : 'Screening' },
            interview: { bg: 'rgba(139,92,246,0.1)', color: '#8b5cf6', label: isAr ? 'مقابلة' : 'Interview' },
            offer: { bg: 'rgba(16,185,129,0.1)', color: '#10b981', label: isAr ? 'عرض' : 'Offer' },
            hired: { bg: 'rgba(16,185,129,0.15)', color: '#059669', label: isAr ? 'تم التوظيف' : 'Hired' },
            rejected: { bg: 'rgba(239,68,68,0.1)', color: '#ef4444', label: isAr ? 'مرفوض' : 'Rejected' }
        };
        const defaultStatus = { bg: 'rgba(100,116,139,0.1)', color: '#64748b', label: '' };

        let versionsHtml = '';
        for (const ver of preview.versions) {
            if (ver.candidates.length === 0) continue;
            const candidateRows = ver.candidates.map(c => {
                const st = statusColors[c.application_status] || { ...defaultStatus, label: c.application_status };
                return `
                    <tr style="border-bottom:1px solid var(--border-color);">
                        <td style="padding:0.6rem 0.75rem; font-weight:600; font-size:0.9rem;">${c.candidate_name}</td>
                        <td style="padding:0.6rem 0.75rem; font-size:0.85rem; color:var(--text-muted);">${c.candidate_email}</td>
                        <td style="padding:0.6rem 0.75rem;">
                            <span style="background:${st.bg}; color:${st.color}; padding:0.2rem 0.55rem; border-radius:6px; font-size:0.78rem; font-weight:600;">${st.label}</span>
                        </td>
                    </tr>`;
            }).join('');

            versionsHtml += `
                <div style="margin-bottom:1.25rem;">
                    <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.5rem;">
                        <i class="fas fa-code-branch" style="color:var(--primary-color);"></i>
                        <span style="font-weight:700; font-size:0.95rem;">${isAr ? 'الإصدار' : 'Version'} #${ver.version_number}</span>
                        <span style="color:var(--text-muted); font-size:0.8rem;">(${ver.candidates.length} ${isAr ? 'مرشحين' : 'candidates'})</span>
                    </div>
                    <div style="border:1px solid var(--border-color); border-radius:8px; overflow:hidden;">
                        <table style="width:100%; border-collapse:collapse;">
                            <thead>
                                <tr style="background:var(--bg-secondary);">
                                    <th style="padding:0.55rem 0.75rem; text-align:start; font-size:0.78rem; font-weight:700; color:var(--text-muted); text-transform:uppercase;">${isAr ? 'الاسم' : 'Name'}</th>
                                    <th style="padding:0.55rem 0.75rem; text-align:start; font-size:0.78rem; font-weight:700; color:var(--text-muted); text-transform:uppercase;">${isAr ? 'البريد' : 'Email'}</th>
                                    <th style="padding:0.55rem 0.75rem; text-align:start; font-size:0.78rem; font-weight:700; color:var(--text-muted); text-transform:uppercase;">${isAr ? 'الحالة' : 'Status'}</th>
                                </tr>
                            </thead>
                            <tbody>${candidateRows}</tbody>
                        </table>
                    </div>
                </div>`;
        }

        if (!versionsHtml) {
            // No candidates found despite the error — just force-delete directly
            try {
                await api.fetch(`/jobs/${jobId}?force=true`, { method: 'DELETE' });
                Toast.show(isAr ? 'تم حذف الوظيفة بنجاح' : 'Job deleted successfully', 'success');
                await this.refresh();
            } catch (err) {
                Toast.show(err.message || 'Error deleting job', 'error');
            }
            return;
        }

        const content = `
            <div style="margin-bottom:1rem;">
                <div style="background:rgba(239,68,68,0.07); border:1px solid rgba(239,68,68,0.2); border-radius:10px; padding:1rem 1.25rem; margin-bottom:1.25rem;">
                    <div style="display:flex; align-items:center; gap:0.6rem; margin-bottom:0.5rem;">
                        <i class="fas fa-exclamation-triangle" style="color:#ef4444; font-size:1.1rem;"></i>
                        <span style="font-weight:700; color:#ef4444; font-size:1rem;">${isAr ? 'تحذير: هذه الوظيفة مرتبطة بمرشحين' : 'Warning: This job has linked candidates'}</span>
                    </div>
                    <p style="margin:0; color:var(--text-muted); font-size:0.9rem; line-height:1.5;">
                        ${isAr 
                            ? `حذف الوظيفة "<strong>${preview.job_title}</strong>" سيؤدي إلى فصل <strong>${preview.total_affected_candidates}</strong> مرشح/مرشحين عن هذه الوظيفة نهائياً. ستُحذف جميع التقديمات (Applications) المرتبطة.`
                            : `Deleting "<strong>${preview.job_title}</strong>" will permanently detach <strong>${preview.total_affected_candidates}</strong> candidate(s) from this job. All related applications will be removed.`}
                    </p>
                </div>
                <div style="max-height:350px; overflow-y:auto; padding-inline-end:0.25rem;">
                    ${versionsHtml}
                </div>
            </div>`;

        const modal = new Modal({
            title: isAr ? 'تأكيد حذف الوظيفة' : 'Confirm Job Deletion',
            content: content,
            saveText: isAr ? 'حذف نهائي' : 'Force Delete',
            saveClass: 'btn btn-danger',
            onSave: async () => {
                try {
                    await api.fetch(`/jobs/${jobId}?force=true`, { method: 'DELETE' });
                    Toast.show(isAr ? 'تم حذف الوظيفة وجميع التقديمات المرتبطة' : 'Job and all linked applications deleted', 'success');
                    await this.refresh();
                } catch (err) {
                    Toast.show(err.message || 'Error deleting job', 'error');
                    throw err;
                }
            }
        });
        modal.show();
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
