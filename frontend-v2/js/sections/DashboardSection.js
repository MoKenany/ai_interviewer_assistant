import { getLang } from '../core/i18n.js';
import { api } from '../core/api.js';

export class DashboardSection {
    constructor() {
        this.metrics = null;
        this.charts = [];
        this.filters = {
            job_title: 'all',
            department: 'all',
            from_date: '',
            to_date: ''
        };
    }

    async fetchData() {
        try {
            const params = [];
            if (this.filters.job_title && this.filters.job_title !== 'all') {
                params.push(`job_title=${encodeURIComponent(this.filters.job_title)}`);
            }
            if (this.filters.department && this.filters.department !== 'all') {
                params.push(`department=${encodeURIComponent(this.filters.department)}`);
            }
            if (this.filters.from_date) {
                params.push(`from_date=${encodeURIComponent(this.filters.from_date)}`);
            }
            if (this.filters.to_date) {
                params.push(`to_date=${encodeURIComponent(this.filters.to_date)}`);
            }
            const query = params.length ? `?${params.join('&')}` : '';
            this.metrics = await api.get(`/dashboard/metrics${query}`);
        } catch (e) {
            console.error('Failed to fetch dashboard metrics', e);
            this.metrics = null;
        }
    }

    render() {
        const isAr = getLang() === 'ar';
        if (!this.metrics) {
            const errMsg = isAr
                ? 'فشل في تحميل بيانات لوحة القيادة. يرجى التأكد من تشغيل الخادم.'
                : 'Failed to load dashboard metrics. Please make sure the backend server is running.';
            return `<div class="alert alert-error" style="margin: 2rem; border-radius:12px; font-weight:600; text-align:center;">${errMsg}</div>`;
        }

        const { pulse, quality_matrix, quality_summary, funnel, department_workload, skill_gaps } = this.metrics;
        const avgOverallScore = pulse?.average_overall_score ?? 0;
        const avgConfidenceScore = pulse?.average_confidence_score ?? 0;
        const reviewRiskCount = quality_summary?.review_risk_count ?? 0;
        const recommendationCounts = quality_summary?.recommendation_counts ?? {};
        const user = JSON.parse(localStorage.getItem('user_info') || '{}');
        const userName = user.full_name || (isAr ? 'مدير الموارد البشرية' : 'HR Executive');

        const labels = {
            welcome: isAr ? `مرحبا بك مجددا ${userName} 👋` : `Welcome back, ${userName} 👋`,
            subtitle: isAr ? 'إليك نظرة عامة على نشاط التوظيف الآني ومؤشرات الأداء الاستراتيجية.' : 'Here is a real-time strategic overview of your recruiting and pipeline performance.',
            qualityTitle: isAr ? 'مصفوفة جودة المرشحين وثقة الذكاء الاصطناعي' : 'Candidate Quality vs AI Confidence',
            qualitySubtitle: isAr ? 'يساعدك على التركيز على المرشحين الذين يحتاجون مراجعة بشرية (تقييم عالي + ثقة منخفضة).' : 'Pinpoints cases requiring human review (high overall score + low AI confidence).',
            skillsTitle: isAr ? 'تحليل فجوات المهارات' : 'Skills Gap Analysis',
            skillsSubtitle: isAr ? 'أكثر أسباب الرفض شيوعا ونقاط الضعف بناء على تحليل الذكاء الاصطناعي.' : 'Top rejection reasons and candidate skill gaps identified by AI evaluations.',
            funnelTitle: isAr ? 'مسار التوظيف' : 'Recruitment Funnel',
            funnelSubtitle: isAr ? 'اكتشف كيف تتقلص المجموعة عبر المراحل الرئيسة.' : 'See how candidates drop through each stage of the hiring funnel.',
            deptTitle: isAr ? 'التقسيم التنظيمي' : 'Organizational Breakdown',
            deptSubtitle: isAr ? 'التوزيع التنظيمي لحجم العمل عبر الأقسام.' : 'The current distribution of hiring effort across departments.',
            totalCandidates: isAr ? 'إجمالي المرشحين المحللين' : 'Total Candidates Analyzed',
            aiConfidence: isAr ? 'متوسط ثقة الذكاء الاصطناعي' : 'AI Avg. Confidence',
            humanReview: isAr ? 'يحتاج مراجعة بشرية' : 'Human Review Required',
            timeToHire: isAr ? 'متوسط الوقت للتوظيف (أيام)' : 'Average Time-to-Hire (days)',
            filterJobTitle: isAr ? 'كل المسميات الوظيفية' : 'All Job Titles',
            filterDepartment: isAr ? 'كل الأقسام' : 'All Departments',
            recommendationTitle: isAr ? 'توزيع التوصيات' : 'Recommendation Breakdown',
            recommendationSubtitle: isAr ? 'نظرة على توقّعات الذكاء الاصطناعي للتعيين.' : 'See how AI is recommending candidates.',
            scoreDistributionTitle: isAr ? 'توزيع درجات التقييم' : 'Score Distribution',
            scoreDistributionSubtitle: isAr ? 'توزيع درجات المرشحين عبر المجموعة.' : 'How candidate overall scores spread across the pipeline.',
            confidenceDistributionTitle: isAr ? 'توزيع ثقة الذكاء الاصطناعي' : 'AI Confidence Distribution',
            confidenceDistributionSubtitle: isAr ? 'نطاق مستويات الثقة للتوصيات الآلية.' : 'Confidence score spread for AI evaluations.',
            reviewRiskTitle: isAr ? 'ملف مخاطر المراجعة' : 'Review Risk Profile',
            reviewRiskSubtitle: isAr ? 'حالات تحتاج إلى إعادة فحص بشري.' : 'Cases flagged for manual review risk.',
            pulseOverviewTitle: isAr ? 'نبض سير العمل' : 'Workflow Pulse Overview',
            pulseOverviewSubtitle: isAr ? 'معدلات الجلسات والتقييمات والأداء العام.' : 'Core pipeline metrics in one view.',
            applicationStatusTitle: isAr ? 'حالة الطلبات' : 'Application Status Summary',
            applicationStatusSubtitle: isAr ? 'توزيع حالة الطلب عبر القناة.' : 'Where applications currently sit in the funnel.'
        };

        const selectedJobTitle = this.filters.job_title || 'all';
        const selectedDepartment = this.filters.department || 'all';

        const dropdownJobs = (this.metrics.options?.job_titles || []).map(title => `
            <option value="${title}" ${selectedJobTitle === title ? 'selected' : ''}>${title}</option>
        `).join('');
        const dropdownDepartments = (this.metrics.options?.departments || []).map(dept => `
            <option value="${dept}" ${selectedDepartment === dept ? 'selected' : ''}>${dept}</option>
        `).join('');

        return `
            <style>
                :root {
                    --bg: #f8fafc;
                    --card: #ffffff;
                    --border: rgba(148,163,184,0.16);
                    --text: #0f172a;
                    --muted: #64748b;
                    --success: #16a34a;
                    --warning: #f59e0b;
                    --danger: #ef4444;
                    --primary: #4f46e5;
                }
                .dashboard-shell {
                    padding: 1.5rem 1.25rem 2rem;
                    background: var(--bg);
                }
                .dashboard-topbar {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 1.5rem;
                    margin-bottom: 1.5rem;
                }
                .dashboard-hero {
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                }
                .dashboard-hero h1 {
                    margin: 0;
                    font-size: 1.75rem;
                    font-weight: 800;
                    color: var(--text);
                }
                .dashboard-hero p {
                    margin: 0;
                    color: var(--muted);
                    max-width: 100%;
                    line-height: 1.6;
                }
                .dashboard-filters {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
                    gap: 0.85rem;
                    align-items: stretch;
                }
                .dashboard-filters select,
                .dashboard-filters input {
                    width: 100%;
                    min-height: 46px;
                    border-radius: 12px;
                    border: 1px solid var(--border);
                    padding: 0 0.9rem;
                    font-size: 0.95rem;
                    color: var(--text);
                    background: #ffffff;
                    transition: border-color 0.2s ease, box-shadow 0.2s ease;
                }
                .dashboard-filters select:focus,
                .dashboard-filters input:focus {
                    outline: none;
                    border-color: rgba(79,70,229,0.35);
                    box-shadow: 0 0 0 4px rgba(79,70,229,0.12);
                }
                .dashboard-kpis {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
                    gap: 1rem;
                    margin-bottom: 1.5rem;
                }
                .kpi-card {
                    background: var(--card);
                    border: 1px solid var(--border);
                    min-width: 0;
                    border-radius: 18px;
                    padding: 1.4rem 1.5rem;
                    box-shadow: 0 18px 55px rgba(15,23,42,0.04);
                    transition: transform 0.2s ease, box-shadow 0.2s ease;
                }
                .kpi-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 24px 65px rgba(15,23,42,0.06);
                }
                .kpi-title {
                    margin: 0 0 0.75rem;
                    font-size: 0.95rem;
                    font-weight: 700;
                    color: var(--muted);
                    text-transform: uppercase;
                    letter-spacing: 0.04em;
                }
                .kpi-value {
                    margin: 0;
                    font-size: 2.4rem;
                    font-weight: 800;
                    color: var(--text);
                }
                .kpi-subtext {
                    margin: 0.75rem 0 0;
                    color: var(--muted);
                    font-size: 0.95rem;
                    line-height: 1.5;
                }
                .kpi-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.4rem;
                    margin-top: 0.85rem;
                    padding: 0.45rem 0.8rem;
                    border-radius: 999px;
                    font-size: 0.84rem;
                    font-weight: 700;
                }
                .kpi-good { background: rgba(16,185,129,0.12); color: #047857; }
                .kpi-warn { background: rgba(245,158,11,0.14); color: #92400e; }
                .dashboard-grid {
                    display: grid;
                    grid-template-columns: repeat(12, minmax(0, 1fr));
                    grid-auto-rows: minmax(360px, auto);
                    gap: 1.5rem;
                }
                .card {
                    background: var(--card);
                    border: 1px solid var(--border);
                    border-radius: 24px;
                    padding: 1.5rem;
                    box-shadow: 0 18px 55px rgba(15,23,42,0.04);
                    min-width: 0;
                    min-height: 360px;
                }
                .chart-wrapper {
                    min-height: 360px;
                    position: relative;
                }
                .card-title h3 {
                    color: var(--text);
                }
                .legend-item {
                    min-width: 120px;
                }
                .dashboard-filters select,
                .dashboard-filters input {
                    min-height: 50px;
                    font-size: 0.98rem;
                }
                .card-title {
                    display: flex;
                    flex-wrap: wrap;
                    justify-content: space-between;
                    gap: 0.75rem;
                    margin-bottom: 1rem;
                }
                .card-title h3 {
                    margin: 0;
                    font-size: 1.1rem;
                    font-weight: 700;
                    color: var(--text);
                }
                .card-title p {
                    margin: 0;
                    color: var(--muted);
                    font-size: 0.92rem;
                    line-height: 1.6;
                    flex: 1 1 100%;
                }
                .chart-wrapper {
                    min-height: 320px;
                    position: relative;
                    flex: 1 1 auto;
                }
                .chart-canvas {
                    width: 100% !important;
                    height: 100% !important;
                }
                .metric-list {
                    display: grid;
                    gap: 0.85rem;
                    margin-top: 1rem;
                }
                .metric-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 1rem;
                    background: rgba(79,70,229,0.06);
                    border-radius: 14px;
                    padding: 0.85rem 1rem;
                    color: var(--text);
                }
                .metric-item span {
                    color: var(--muted);
                    font-size: 0.92rem;
                }
                .dashboard-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
                    gap: 1.5rem;
                    align-items: stretch;
                }
                .card {
                    background: var(--card);
                    border: 1px solid var(--border);
                    border-radius: 24px;
                    padding: 1.5rem;
                    box-shadow: 0 18px 55px rgba(15,23,42,0.04);
                    min-width: 0;
                    min-height: 360px;
                    display: flex;
                    flex-direction: column;
                }
                .wide-card { grid-column: span 2; }
                .half-card { grid-column: span 1; }
                .empty-state-card {
                    height: 320px;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    color: var(--muted);
                    border: 1px dashed rgba(148,163,184,0.5);
                    border-radius: 18px;
                    text-align: center;
                    padding: 1.5rem;
                    background: #f8fafc;
                }
                .empty-state-card strong {
                    display: block;
                    margin-top: 0.75rem;
                    color: var(--text);
                    font-size: 1rem;
                }
                .legend-row {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 1rem;
                    margin-top: 1rem;
                }
                .legend-item {
                    display: flex;
                    align-items: center;
                    gap: 0.6rem;
                    color: var(--muted);
                    font-size: 0.9rem;
                }
                .legend-mark {
                    width: 12px;
                    height: 12px;
                    border-radius: 4px;
                }
                @media (max-width: 1024px) {
                    .dashboard-grid { grid-template-columns: 1fr; }
                    .wide-card, .half-card { grid-column: span 12; }
                    .dashboard-filters { grid-template-columns: 1fr; }
                }
                @media (max-width: 720px) {
                    .dashboard-shell {
                        padding: 1rem 0.8rem 1.5rem;
                    }
                    .dashboard-filters,
                    .dashboard-kpis,
                    .dashboard-topbar {
                        gap: 1rem;
                    }
                    .dashboard-filters select,
                    .dashboard-filters input {
                        font-size: 0.92rem;
                    }
                    .kpi-value {
                        font-size: 2rem;
                    }
                }
            </style>

            <div class="dashboard-shell">
                <div class="dashboard-topbar">
                    <div class="dashboard-hero">
                        <h1>${labels.welcome}</h1>
                        <p>${labels.subtitle}</p>
                    </div>
                    <div class="dashboard-filters">
                        <select id="jobTitleFilter">
                            <option value="all" ${selectedJobTitle === 'all' ? 'selected' : ''}>${labels.filterJobTitle}</option>
                            ${dropdownJobs}
                        </select>
                        <select id="departmentFilter">
                            <option value="all" ${selectedDepartment === 'all' ? 'selected' : ''}>${labels.filterDepartment}</option>
                            ${dropdownDepartments}
                        </select>
                        <input id="fromDateFilter" type="date" value="${this.filters.from_date}" />
                        <input id="toDateFilter" type="date" value="${this.filters.to_date}" />
                    </div>
                </div>

                <div class="dashboard-kpis">
                    <div class="kpi-card">
                        <div class="kpi-title">${labels.totalCandidates}</div>
                        <p class="kpi-value">${pulse.total_candidates_analyzed ?? 0}</p>
                        <p class="kpi-subtext">${isAr ? 'عدد المرشحين الذين تم تحليلهم عبر تقييمات الذكاء الاصطناعي.' : 'Number of candidates evaluated by AI across the pipeline.'}</p>
                    </div>
                    <div class="kpi-card">
                        <div class="kpi-title">${labels.aiConfidence}</div>
                        <p class="kpi-value">${avgConfidenceScore}%</p>
                        <span class="kpi-badge kpi-good">${isAr ? '+8% منذ الشهر الماضي' : '+8% from last month'}</span>
                    </div>
                    <div class="kpi-card">
                        <div class="kpi-title">${labels.humanReview}</div>
                        <p class="kpi-value" style="color: ${reviewRiskCount > 0 ? 'var(--danger)' : 'var(--success)'};">${reviewRiskCount}</p>
                        <p class="kpi-subtext">${isAr ? 'الحالات التي يوصى بإعادة المراجعة البشرية بسبب ثقة منخفضة.' : 'Cases flagged for human review due to low AI confidence.'}</p>
                    </div>
                    <div class="kpi-card">
                        <div class="kpi-title">${labels.timeToHire}</div>
                        <p class="kpi-value">${pulse.average_time_to_hire_days ?? '—'}</p>
                        <p class="kpi-subtext">${isAr ? 'متوسط الوقت بين تقديم الطلب وتوليد التقييم.' : 'Average duration from application to completed evaluation.'}</p>
                    </div>
                </div>

                <div class="dashboard-grid">
                    <section class="card wide-card">
                        <div class="card-title">
                            <h3>${labels.funnelTitle}</h3>
                            <p>${labels.funnelSubtitle}</p>
                        </div>
                        <div class="chart-wrapper">
                            ${!funnel || Object.values(funnel).reduce((sum, v) => sum + (v || 0), 0) === 0 ? this.renderEmptyState(isAr ? 'لا توجد بيانات للمسار الحالي.' : 'No funnel data available for the current filter.') : '<canvas id="pipelineFunnelChart" class="chart-canvas"></canvas>'}
                        </div>
                        ${funnel ? this.renderFunnelLegend(funnel, isAr) : ''}
                    </section>

                    <section class="card">
                        <div class="card-title">
                            <h3>${labels.recommendationTitle}</h3>
                            <p>${labels.recommendationSubtitle}</p>
                        </div>
                        <div class="chart-wrapper">
                            ${!recommendationCounts || Object.values(recommendationCounts).reduce((sum, v) => sum + (v || 0), 0) === 0 ? this.renderEmptyState(isAr ? 'لا توجد بيانات للترشيحات.' : 'No recommendation data available for this filter.') : '<canvas id="recommendationChart" class="chart-canvas"></canvas>'}
                        </div>
                    </section>

                    <section class="card">
                        <div class="card-title">
                            <h3>${labels.scoreDistributionTitle}</h3>
                            <p>${labels.scoreDistributionSubtitle}</p>
                        </div>
                        <div class="chart-wrapper">
                            ${!quality_matrix || quality_matrix.length === 0 ? this.renderEmptyState(isAr ? 'لا توجد بيانات لتوزيع الدرجات.' : 'No score distribution data available for this filter.') : '<canvas id="scoreDistChart" class="chart-canvas"></canvas>'}
                        </div>
                    </section>

                    <section class="card">
                        <div class="card-title">
                            <h3>${labels.qualityTitle}</h3>
                            <p>${labels.qualitySubtitle}</p>
                        </div>
                        <div class="chart-wrapper">
                            ${!quality_matrix || quality_matrix.length === 0 ? this.renderEmptyState(isAr ? 'لا توجد تقييمات لعرضها.' : 'No evaluations available for this filter.') : '<canvas id="qualityMatrixChart" class="chart-canvas"></canvas>'}
                        </div>
                    </section>

                    <section class="card">
                        <div class="card-title">
                            <h3>${labels.confidenceDistributionTitle}</h3>
                            <p>${labels.confidenceDistributionSubtitle}</p>
                        </div>
                        <div class="chart-wrapper">
                            ${!quality_matrix || quality_matrix.length === 0 ? this.renderEmptyState(isAr ? 'لا توجد بيانات لتوزيع الثقة.' : 'No confidence distribution data available for this filter.') : '<canvas id="confidenceChart" class="chart-canvas"></canvas>'}
                        </div>
                    </section>

                    <section class="card">
                        <div class="card-title">
                            <h3>${labels.deptTitle}</h3>
                            <p>${labels.deptSubtitle}</p>
                        </div>
                        <div class="chart-wrapper">
                            ${!department_workload || department_workload.length === 0 ? this.renderEmptyState(isAr ? 'لا توجد بيانات أعباء للأقسام.' : 'No department workload data available for this filter.') : '<canvas id="departmentChart" class="chart-canvas"></canvas>'}
                        </div>
                    </section>

                    <section class="card">
                        <div class="card-title">
                            <h3>${labels.reviewRiskTitle}</h3>
                            <p>${labels.reviewRiskSubtitle}</p>
                        </div>
                        <div class="chart-wrapper">
                            ${!quality_matrix || quality_matrix.length === 0 ? this.renderEmptyState(isAr ? 'لا توجد بيانات لمخاطر المراجعة.' : 'No review risk data available for this filter.') : '<canvas id="reviewRiskChart" class="chart-canvas"></canvas>'}
                        </div>
                    </section>

                    <section class="card">
                        <div class="card-title">
                            <h3>${labels.pulseOverviewTitle}</h3>
                            <p>${labels.pulseOverviewSubtitle}</p>
                        </div>
                        <div class="chart-wrapper">
                            <canvas id="pulseOverviewChart" class="chart-canvas"></canvas>
                        </div>
                    </section>

                    <section class="card">
                        <div class="card-title">
                            <h3>${labels.skillsTitle}</h3>
                            <p>${labels.skillsSubtitle}</p>
                        </div>
                        <div class="chart-wrapper">
                            ${!skill_gaps || skill_gaps.length === 0 ? this.renderEmptyState(isAr ? 'لا توجد فجوات مهارات ظاهرة لهذا الفلتر.' : 'No skills gap data available for this filter.') : '<canvas id="skillsGapChart" class="chart-canvas"></canvas>'}
                        </div>
                    </section>

                    <section class="card">
                        <div class="card-title">
                            <h3>${labels.applicationStatusTitle}</h3>
                            <p>${labels.applicationStatusSubtitle}</p>
                        </div>
                        <div class="chart-wrapper">
                            ${!funnel || Object.values(funnel).reduce((sum, v) => sum + (v || 0), 0) === 0 ? this.renderEmptyState(isAr ? 'لا توجد بيانات لحالة الطلب.' : 'No application status data available for this filter.') : '<canvas id="statusBarChart" class="chart-canvas"></canvas>'}
                        </div>
                    </section>
                </div>
            </div>
        `;
    }

    renderFunnelLegend(funnel, isAr) {
        const stageLabels = {
            applied: isAr ? 'متقدم' : 'Applied',
            screening: isAr ? 'تصفية' : 'Screening',
            interview: isAr ? 'مقابلة' : 'Interview',
            offer: isAr ? 'عرض' : 'Offer',
            hired: isAr ? 'تعيين' : 'Hired',
            rejected: isAr ? 'رفض' : 'Rejected'
        };

        return `
            <div class="legend-row">
                ${Object.keys(stageLabels).map(stage => `
                    <div class="legend-item">
                        <span class="legend-mark" style="background:${this.getFunnelColor(stage)}"></span>
                        ${stageLabels[stage]} — ${funnel[stage] || 0}
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderEmptyState(message) {
        return `
            <div class="empty-state-card">
                <div>${message}</div>
                <strong>${getLang() === 'ar' ? 'حاول تغيير الفلاتر أو تاريخ البيانات.' : 'Try adjusting filters or date range.'}</strong>
            </div>
        `;
    }

    async mount() {
        if (!this.metrics) return;

        this.charts.forEach((chart) => chart.destroy());
        this.charts = [];

        if (typeof Chart === 'undefined') {
            console.error('Chart.js is not loaded!');
            return;
        }

        Chart.defaults.font.family = getLang() === 'ar' ? "'Cairo', sans-serif" : "'Inter', sans-serif";
        Chart.defaults.color = 'var(--muted)';
        Chart.defaults.plugins.tooltip.padding = 12;
        Chart.defaults.plugins.tooltip.cornerRadius = 8;
        Chart.defaults.plugins.tooltip.backgroundColor = '#0f172a';

        this.renderPipelineFunnelChart();
        this.renderRecommendationChart();
        this.renderScoreDistributionChart();
        this.renderQualityMatrix();
        this.renderConfidenceDistributionChart();
        this.renderDepartmentChart();
        this.renderReviewRiskChart();
        this.renderPulseOverviewChart();
        this.renderSkillsGapChart();
        this.renderStatusBarChart();
        this.bindFilterEvents();
    }

    bindFilterEvents() {
        document.getElementById('jobTitleFilter')?.addEventListener('change', async (event) => {
            this.filters.job_title = event.target.value;
            await this.applyFilters();
        });
        document.getElementById('departmentFilter')?.addEventListener('change', async (event) => {
            this.filters.department = event.target.value;
            await this.applyFilters();
        });
        document.getElementById('fromDateFilter')?.addEventListener('change', async (event) => {
            this.filters.from_date = event.target.value;
            await this.applyFilters();
        });
        document.getElementById('toDateFilter')?.addEventListener('change', async (event) => {
            this.filters.to_date = event.target.value;
            await this.applyFilters();
        });
    }

    async applyFilters() {
        const appContent = document.getElementById('app-content');
        await this.fetchData();
        appContent.innerHTML = this.render();
        this.mount();
    }

    renderPipelineFunnelChart() {
        const ctx = document.getElementById('pipelineFunnelChart')?.getContext('2d');
        if (!ctx) return;

        const isAr = getLang() === 'ar';
        const funnel = this.metrics.funnel || {};
        const stages = ['applied', 'screening', 'interview', 'offer', 'hired', 'rejected'];
        const labels = {
            applied: isAr ? 'متقدم' : 'Applied',
            screening: isAr ? 'تصفية' : 'Screening',
            interview: isAr ? 'مقابلة' : 'Interview',
            offer: isAr ? 'عرض' : 'Offer',
            hired: isAr ? 'تعيين' : 'Hired',
            rejected: isAr ? 'رفض' : 'Rejected'
        };

        const data = stages.map((stage) => funnel[stage] || 0);
        const colors = stages.map((stage) => this.getFunnelColor(stage));

        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: stages.map((stage) => labels[stage]),
                datasets: [{
                    data,
                    backgroundColor: colors,
                    borderRadius: 14,
                    barThickness: 32
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label(context) {
                                return `${context.label}: ${context.parsed.y}`;
                            }
                        }
                    }
                },
                scales: {
                    x: { grid: { display: false }, ticks: { color: 'var(--muted)' } },
                    y: { beginAtZero: true, grid: { color: 'rgba(148,163,184,0.18)' }, ticks: { precision: 0, color: 'var(--muted)' } }
                }
            }
        });
        this.charts.push(chart);
    }

    renderSkillsGapChart() {
        const ctx = document.getElementById('skillsGapChart')?.getContext('2d');
        if (!ctx) return;

        const skillGaps = this.metrics.skill_gaps || [];
        if (!skillGaps.length) return;

        const fullLabels = skillGaps.map((item) => item.criterion);
        const labels = fullLabels.map((label) => this.truncateLabel(label, 24));
        const data = skillGaps.map((item) => item.count);

        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: getLang() === 'ar' ? 'تكرار الفجوة' : 'Gap Frequency',
                    data,
                    backgroundColor: 'rgba(79,70,229,0.85)',
                    borderRadius: 10,
                    maxBarThickness: 26
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    tooltip: {
                        callbacks: {
                            title(context) {
                                return fullLabels[context[0].dataIndex];
                            }
                        }
                    },
                    legend: { display: false }
                },
                scales: {
                    x: { beginAtZero: true, grid: { color: 'rgba(148,163,184,0.18)' }, ticks: { precision: 0, color: 'var(--muted)' } },
                    y: { grid: { display: false }, ticks: { color: 'var(--text)' } }
                }
            }
        });
        this.charts.push(chart);
    }

    renderQualityMatrix() {
        const ctx = document.getElementById('qualityMatrixChart')?.getContext('2d');
        if (!ctx) return;

        const data = this.metrics.quality_matrix || [];
        if (!data.length) return;

        const datasets = [
            { label: getLang() === 'ar' ? 'توظيف قوي' : 'Strong Hire', data: [], backgroundColor: 'rgba(16,185,129,0.75)', borderColor: '#16a34a' },
            { label: getLang() === 'ar' ? 'توظيف' : 'Hire', data: [], backgroundColor: 'rgba(59,130,246,0.75)', borderColor: '#2563eb' },
            { label: getLang() === 'ar' ? 'محايد' : 'Neutral', data: [], backgroundColor: 'rgba(245,158,11,0.75)', borderColor: '#d97706' },
            { label: getLang() === 'ar' ? 'رفض' : 'Reject', data: [], backgroundColor: 'rgba(239,68,68,0.75)', borderColor: '#dc2626' }
        ];

        data.forEach((item) => {
            const point = { x: item.overall_score, y: item.confidence_score * 100 };
            if (item.recommendation === 'strong_hire') datasets[0].data.push(point);
            else if (item.recommendation === 'hire') datasets[1].data.push(point);
            else if (item.recommendation === 'neutral') datasets[2].data.push(point);
            else datasets[3].data.push(point);
        });

        const chart = new Chart(ctx, {
            type: 'scatter',
            data: { datasets: datasets.filter((set) => set.data.length) },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { title: { display: true, text: getLang() === 'ar' ? 'درجة التقييم (%)' : 'Overall Score (%)', font: { weight: '700' } }, min: 0, max: 100, grid: { color: 'rgba(148,163,184,0.18)' }, ticks: { color: 'var(--muted)' } },
                    y: { title: { display: true, text: getLang() === 'ar' ? 'ثقة الذكاء الاصطناعي (%)' : 'AI Confidence (%)', font: { weight: '700' } }, min: 0, max: 100, grid: { color: 'rgba(148,163,184,0.18)' }, ticks: { color: 'var(--muted)' } }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label(context) {
                                return `${context.dataset.label}: ${context.parsed.x} / ${Math.round(context.parsed.y)}%`;
                            }
                        }
                    },
                    legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 10 } }
                }
            }
        });
        this.charts.push(chart);
    }

    renderDepartmentChart() {
        const ctx = document.getElementById('departmentChart')?.getContext('2d');
        if (!ctx) return;

        const depts = this.metrics.department_workload || [];
        if (!depts.length) return;

        const labels = depts.map((d) => d.department);
        const data = depts.map((d) => d.load);
        const colors = ['#4f46e5', '#0ea5e9', '#14b8a6', '#f59e0b', '#ef4444', '#a855f7'];

        const chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{ data, backgroundColor: colors.slice(0, labels.length), borderColor: '#ffffff', borderWidth: 3 }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '72%',
                plugins: {
                    legend: { position: getLang() === 'ar' ? 'left' : 'right', labels: { usePointStyle: true, boxWidth: 10, color: 'var(--muted)' } }
                }
            }
        });
        this.charts.push(chart);
    }

    renderRecommendationChart() {
        const ctx = document.getElementById('recommendationChart')?.getContext('2d');
        if (!ctx) return;

        const counts = this.metrics.quality_summary?.recommendation_counts || {};
        const labels = [
            getLang() === 'ar' ? 'توظيف قوي' : 'Strong Hire',
            getLang() === 'ar' ? 'توظيف' : 'Hire',
            getLang() === 'ar' ? 'محايد' : 'Neutral',
            getLang() === 'ar' ? 'رفض' : 'Reject'
        ];
        const data = [counts.strong_hire || 0, counts.hire || 0, counts.neutral || 0, (counts.no_hire || 0) + (counts.strong_no_hire || 0)];
        const colors = ['#16a34a', '#2563eb', '#f59e0b', '#ef4444'];

        const chart = new Chart(ctx, {
            type: 'doughnut',
            data: { labels, datasets: [{ data, backgroundColor: colors, borderColor: '#ffffff', borderWidth: 2 }] },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '60%',
                plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 10, color: 'var(--muted)' } } }
            }
        });
        this.charts.push(chart);
    }

    renderScoreDistributionChart() {
        const ctx = document.getElementById('scoreDistChart')?.getContext('2d');
        if (!ctx) return;

        const scores = (this.metrics.quality_matrix || []).map((item) => Math.round(item.overall_score || 0));
        if (!scores.length) return;

        const bins = Array.from({ length: 10 }, (_, index) => ({ label: `${index * 10}-${index * 10 + 9}`, count: 0 }));
        scores.forEach((value) => {
            const bucket = Math.min(Math.floor(value / 10), 9);
            bins[bucket].count += 1;
        });

        const labels = bins.map((bin) => bin.label);
        const data = bins.map((bin) => bin.count);

        const chart = new Chart(ctx, {
            type: 'bar',
            data: { labels, datasets: [{ label: getLang() === 'ar' ? 'عدد المرشحين' : 'Candidates', data, backgroundColor: 'rgba(79,70,229,0.85)', borderRadius: 10, maxBarThickness: 28 }] },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { x: { grid: { display: false }, ticks: { color: 'var(--muted)' } }, y: { beginAtZero: true, grid: { color: 'rgba(148,163,184,0.18)' }, ticks: { precision: 0, color: 'var(--muted)' } } }
            }
        });
        this.charts.push(chart);
    }

    renderConfidenceDistributionChart() {
        const ctx = document.getElementById('confidenceChart')?.getContext('2d');
        if (!ctx) return;

        const confidences = (this.metrics.quality_matrix || []).map((item) => Math.round((item.confidence_score || 0) * 100));
        if (!confidences.length) return;

        const bins = Array.from({ length: 10 }, (_, index) => ({ label: `${index * 10}-${index * 10 + 9}`, count: 0 }));
        confidences.forEach((value) => {
            const bucket = Math.min(Math.floor(value / 10), 9);
            bins[bucket].count += 1;
        });

        const labels = bins.map((bin) => bin.label);
        const data = bins.map((bin) => bin.count);

        const chart = new Chart(ctx, {
            type: 'bar',
            data: { labels, datasets: [{ label: getLang() === 'ar' ? 'عدد المرشحين' : 'Candidates', data, backgroundColor: 'rgba(14,165,233,0.85)', borderRadius: 10, maxBarThickness: 28 }] },
            options: {
                indexAxis: 'x',
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { x: { grid: { display: false }, ticks: { color: 'var(--muted)' } }, y: { beginAtZero: true, grid: { color: 'rgba(148,163,184,0.18)' }, ticks: { precision: 0, color: 'var(--muted)' } } }
            }
        });
        this.charts.push(chart);
    }

    renderReviewRiskChart() {
        const ctx = document.getElementById('reviewRiskChart')?.getContext('2d');
        if (!ctx) return;

        const riskCount = this.metrics.quality_summary?.review_risk_count || 0;
        const total = (this.metrics.quality_matrix || []).length;
        if (!total) return;

        const safeCount = Math.max(total - riskCount, 0);
        const labels = [getLang() === 'ar' ? 'خطر المراجعة' : 'Review Risk', getLang() === 'ar' ? 'آمن' : 'Stable'];
        const data = [riskCount, safeCount];
        const colors = ['#ef4444', '#16a34a'];

        const chart = new Chart(ctx, {
            type: 'doughnut',
            data: { labels, datasets: [{ data, backgroundColor: colors, borderColor: '#ffffff', borderWidth: 2 }] },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '68%',
                plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 10, color: 'var(--muted)' } } }
            }
        });
        this.charts.push(chart);
    }

    renderPulseOverviewChart() {
        const ctx = document.getElementById('pulseOverviewChart')?.getContext('2d');
        if (!ctx) return;

        const pulse = this.metrics.pulse || {};
        const labels = [
            getLang() === 'ar' ? 'جلسات نشطة' : 'Active Sessions',
            getLang() === 'ar' ? 'تقييمات' : 'Evaluations',
            getLang() === 'ar' ? 'متوسط الدرجة' : 'Avg Score',
            getLang() === 'ar' ? 'ثقة الذكاء الاصطناعي' : 'AI Confidence'
        ];
        const data = [pulse.active_sessions || 0, pulse.total_evaluations_saved || 0, pulse.average_overall_score || 0, pulse.average_confidence_score || 0];
        const colors = ['#4f46e5', '#0ea5e9', '#f59e0b', '#14b8a6'];

        const chart = new Chart(ctx, {
            type: 'bar',
            data: { labels, datasets: [{ data, backgroundColor: colors, borderRadius: 14, maxBarThickness: 28 }] },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { x: { grid: { display: false }, ticks: { color: 'var(--muted)' } }, y: { beginAtZero: true, grid: { color: 'rgba(148,163,184,0.18)' }, ticks: { precision: 0, color: 'var(--muted)' } } }
            }
        });
        this.charts.push(chart);
    }

    renderStatusBarChart() {
        const ctx = document.getElementById('statusBarChart')?.getContext('2d');
        if (!ctx) return;

        const funnel = this.metrics.funnel || {};
        const statuses = ['applied', 'screening', 'interview', 'offer', 'hired', 'rejected'];
        const labels = statuses.map((status) => {
            const map = {
                applied: getLang() === 'ar' ? 'متقدم' : 'Applied',
                screening: getLang() === 'ar' ? 'تصفية' : 'Screening',
                interview: getLang() === 'ar' ? 'مقابلة' : 'Interview',
                offer: getLang() === 'ar' ? 'عرض' : 'Offer',
                hired: getLang() === 'ar' ? 'تعيين' : 'Hired',
                rejected: getLang() === 'ar' ? 'رفض' : 'Rejected'
            };
            return map[status];
        });
        const data = statuses.map((status) => funnel[status] || 0);
        const colors = statuses.map((status) => this.getFunnelColor(status));

        const chart = new Chart(ctx, {
            type: 'bar',
            data: { labels, datasets: [{ data, backgroundColor: colors, borderRadius: 12, maxBarThickness: 26 }] },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { x: { beginAtZero: true, grid: { color: 'rgba(148,163,184,0.18)' }, ticks: { precision: 0, color: 'var(--muted)' } }, y: { grid: { display: false }, ticks: { color: 'var(--text)' } } }
            }
        });
        this.charts.push(chart);
    }

    getFunnelColor(stage) {
        const palette = {
            applied: '#60a5fa',
            screening: '#4f46e5',
            interview: '#14b8a6',
            offer: '#f59e0b',
            hired: '#16a34a',
            rejected: '#ef4444'
        };
        return palette[stage] || '#94a3b8';
    }

    truncateLabel(value, maxLength) {
        if (!value) return '';
        return value.length <= maxLength ? value : `${value.slice(0, maxLength - 1)}…`;
    }
}
