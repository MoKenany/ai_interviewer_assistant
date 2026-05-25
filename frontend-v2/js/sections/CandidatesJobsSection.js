import { t } from '../core/i18n.js';

function formatRankBadge(idx) {
    if (idx === 0) return `<span class="rank-badge rank-1" title="Top Performer">🥇 1</span>`;
    if (idx === 1) return `<span class="rank-badge rank-2">🥈 2</span>`;
    if (idx === 2) return `<span class="rank-badge rank-3">🥉 3</span>`;
    return `<span class="rank-badge rank-other">${idx + 1}</span>`;
}

function buildScoreHtml(c) {
    if (c.overall_score === null || c.overall_score === undefined) {
        return `<span class="text-muted" style="font-size: 0.85rem;">Pending Evaluation</span>`;
    }
    const score = Math.round(c.overall_score);
    let progressColor = 'var(--danger-color, #ef4444)';
    if (score >= 80) progressColor = '#10b981';
    else if (score >= 50) progressColor = '#f59e0b';

    return `
        <div class="score-container" style="display: flex; align-items: center; gap: 0.5rem; min-width: 120px;">
            <div class="score-progress-bg" style="flex: 1; background: rgba(0,0,0,0.05); height: 8px; border-radius: 4px; overflow: hidden;">
                <div style="background: ${progressColor}; width: ${score}%; height: 100%; border-radius: 4px; transition: width 0.5s ease;"></div>
            </div>
            <strong style="font-size: 0.9rem; color: ${progressColor};">${score}%</strong>
        </div>
    `;
}

function buildConfidenceBadge(c, isAr) {
    if (c.confidence_score === null || c.confidence_score === undefined) return '';
    const confidence = c.confidence_score > 1 ? Math.round(c.confidence_score) : Math.round(c.confidence_score * 100);
    return `<span class="badge badge-outline-info" style="font-size:0.75rem; margin-top:0.25rem;"><i class="fas fa-brain"></i> ${confidence}% ${isAr ? 'ثقة' : 'Confidence'}</span>`;
}

function buildRecommendationBadge(c, isAr) {
    const recommendation = c.hiring_recommendation || '';
    if (!recommendation) return `<span class="badge badge-secondary">-</span>`;
    const rec = String(recommendation).toLowerCase();
    if (rec.includes('strongly_recommend') || rec.includes('strong_hire')) {
        return `<span class="badge badge-success" style="background:#10b981; color:white;"><i class="fas fa-star"></i> ${isAr ? 'توظيف مؤكد' : 'Strong Hire'}</span>`;
    }
    if (rec.includes('do_not_recommend') || rec.includes('no_hire') || rec.includes('strong_no_hire')) {
        const isStrongNo = rec.includes('strong_no_hire') || rec.includes('do_not_recommend');
        return `<span class="badge badge-danger" style="background:#f43f5e; color:white;"><i class="fas fa-thumbs-down"></i> ${isStrongNo ? (isAr ? 'رفض قاطع' : 'Strong No Hire') : (isAr ? 'استبعاد' : 'No Hire')}</span>`;
    }
    if (rec.includes('recommend') || rec.includes('hire')) {
        return `<span class="badge badge-info" style="background:#00b488; color:white;"><i class="fas fa-thumbs-up"></i> ${isAr ? 'توظيف' : 'Hire'}</span>`;
    }
    if (rec.includes('neutral')) {
        return `<span class="badge badge-warning" style="background:#f59e0b; color:white;"><i class="fas fa-minus-circle"></i> ${isAr ? 'محايد' : 'Neutral'}</span>`;
    }
    return `<span class="badge badge-secondary">${recommendation}</span>`;
}

function buildStatusPill(c) {
    const status = c.app_status || 'applied';
    return `<span class="status-pill status-${status}">${status}</span>`;
}

function buildResumeButton(c) {
    if (!c.resume_file_path) {
        return `<button class="btn-action btn-upload-resume upload-resume-btn" data-id="${c.candidate_id}" title="Upload Resume"><i class="fas fa-upload"></i></button>`;
    }
    return `<button class="btn-action btn-delete-resume del-resume-btn" data-id="${c.candidate_id}" title="Delete Resume"><i class="fas fa-file-pdf" style="color:var(--danger-color);"></i> ×</button>`;
}

export function renderJobsSection(jobs, labels, isAr) {
    if (!Array.isArray(jobs) || jobs.length === 0) {
        return `<div class="empty-state">${labels.noJobs}</div>`;
    }

    return jobs.map((job, jobIndex) => {
        const versionsHtml = (job.versions || []).map(v => {
            const candRowsHtml = (v.candidates || []).length === 0
                ? `<tr><td colspan="7" class="text-center">${t('noData')}</td></tr>`
                : v.candidates.map((c, idx) => {
                    const rankBadge = formatRankBadge(idx);
                    const scoreHtml = buildScoreHtml(c);
                    const confidenceBadge = buildConfidenceBadge(c, isAr);
                    const recBadge = buildRecommendationBadge(c, isAr);
                    const statusPill = buildStatusPill(c);
                    const resumeBtn = buildResumeButton(c);

                    return `
                        <tr class="leaderboard-row">
                            <td>${rankBadge}</td>
                            <td>
                                <div class="candidate-meta">
                                    <strong>${c.full_name}</strong>
                                    <div style="font-size:0.8rem; color:var(--text-muted);">${c.email} | <span style="font-style:italic;">${c.source || 'Direct'}</span></div>
                                </div>
                            </td>
                            <td>
                                ${scoreHtml}
                                ${confidenceBadge}
                            </td>
                            <td>${recBadge}</td>
                            <td>${statusPill}</td>
                            <td class="text-center">${resumeBtn}</td>
                            <td>
                                <div class="actions-group">
                                    <button class="btn-action view-transcripts-btn" data-id="${c.candidate_id}" title="${isAr ? 'سجلات المقابلات' : 'Interview Transcripts'}"><i class="fas fa-comments" style="color:var(--primary-color);"></i></button>
                                    <button class="btn-action edit-cand-btn" data-id="${c.candidate_id}" title="Edit"><i class="fas fa-edit"></i></button>
                                    <button class="btn-action delete-app-btn" data-app-id="${c.app_id}" title="${labels.unlinkJob}"><i class="fas fa-unlink" style="color:var(--warning-color);"></i></button>
                                    <button class="btn-action delete-cand-btn" data-id="${c.candidate_id}" style="color:var(--danger-color);" title="Delete Candidate"><i class="fas fa-trash-alt"></i></button>
                                </div>
                            </td>
                        </tr>
                    `;
                }).join('');

            return `
                <div class="version-segment" style="margin-top: 1.5rem; background: var(--bg-primary); border-radius: 8px; padding: 1.2rem; border: 1px solid var(--border-color);">
                    <div class="version-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; border-bottom: 2px solid var(--border-color); padding-bottom: 0.5rem;">
                        <h4 style="margin:0; color:var(--primary-color); display:flex; align-items:center; gap:0.5rem;">
                            <i class="fas fa-code-branch" style="color: var(--secondary-color);"></i>
                            Version ${v.version_number}
                            <span style="font-size:0.85rem; font-weight:normal; color:var(--text-muted);">(${v.candidate_count} ${labels.totalCandidates})</span>
                        </h4>
                    </div>
                    <div class="table-responsive">
                        <table class="table premium-table">
                            <thead>
                                <tr>
                                    <th style="width: 80px;">${labels.rank}</th>
                                    <th>${labels.candidateInfo}</th>
                                    <th style="width: 200px;">${labels.overallScore}</th>
                                    <th>${labels.recBadge}</th>
                                    <th>${labels.status}</th>
                                    <th style="width: 100px;" class="text-center">${labels.resume}</th>
                                    <th style="width: 150px;">${labels.actions}</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${candRowsHtml}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }).join('');

        const totalCandCount = (job.versions || []).reduce((sum, v) => sum + (v.candidate_count || 0), 0);

        return `
            <div class="job-accordion-card card" style="margin-bottom:1rem; border-left: 4px solid var(--primary-color);">
                <div class="job-card-header accordion-toggle" data-target="job-body-${jobIndex}" style="padding:1.5rem; display:flex; justify-content:space-between; align-items:center; cursor:pointer;">
                    <div>
                        <h3 style="margin:0; font-size:1.3rem; color:var(--text-color);">${job.job_title}</h3>
                        <div style="font-size:0.85rem; color:var(--text-muted); margin-top:0.25rem;">
                            <i class="fas fa-building"></i> ${job.department} | <i class="fas fa-users"></i> ${totalCandCount} ${labels.totalCandidates}
                        </div>
                    </div>
                    <div style="display:flex; align-items:center; gap:1rem;">
                        <span class="badge badge-primary-subtle" style="padding: 0.5rem 0.8rem; border-radius: 20px;">${(job.versions || []).length} Versions</span>
                        <i class="fas fa-chevron-down toggle-icon" style="transition: transform 0.3s ease;"></i>
                    </div>
                </div>
                <div id="job-body-${jobIndex}" class="job-card-body" style="display: none; padding: 0 1.5rem 1.5rem 1.5rem; border-top:1px solid var(--border-color);">
                    ${versionsHtml}
                </div>
            </div>
        `;
    }).join('');
}
