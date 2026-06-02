
function buildScoreProgressBar(score, isAr) {
    if (score === null || score === undefined) {
        return `<span class="text-muted" style="font-size:0.8rem;">${isAr ? 'بدون تقييم' : 'No score'}</span>`;
    }
    const roundedScore = Math.round(score);
    const color = roundedScore >= 80 ? '#10b981' : roundedScore >= 50 ? '#f59e0b' : 'var(--danger-color, #ef4444)';
    return `<div style="display:flex; align-items:center; gap:0.4rem;">
        <div style="flex:1; background: rgba(0,0,0,0.05); height: 6px; border-radius:3px; overflow:hidden; min-width:80px;">
            <div style="background: ${color}; width:${roundedScore}%; height:100%; border-radius:3px;"></div>
        </div>
        <strong style="font-size:0.8rem; color:${color}; min-width:30px;">${roundedScore}%</strong>
    </div>`;
}

function buildAllScoresHtml(applications, isAr) {
    if (!Array.isArray(applications) || applications.length === 0) {
        return `<span class="text-muted" style="font-size:0.85rem;">${isAr ? 'بدون تقييمات' : 'No evaluations'}</span>`;
    }
    
    // Sort by score descending (null scores go to bottom)
    const sorted = [...applications].sort((a, b) => {
        const scoreA = a.overall_score ?? -1;
        const scoreB = b.overall_score ?? -1;
        return scoreB - scoreA;
    });
    
    const scoresHtml = sorted.map((app, idx) => {
        const scoreBar = buildScoreProgressBar(app.overall_score, isAr);
        const confidence = app.confidence_score !== null && app.confidence_score !== undefined
            ? `${app.confidence_score > 1 ? Math.round(app.confidence_score) : Math.round(app.confidence_score * 100)}% ${isAr ? 'ثقة' : 'Conf.'}`
            : '';
        return `<div style="padding:0.5rem 0.75rem; border-radius:8px; background:rgba(15,23,42,0.02); border-left:3px solid ${app.overall_score !== null ? '#0f766e' : '#d1d5db'};">
            <div style="font-size:0.75rem; font-weight:600; color:var(--text-muted); margin-bottom:0.3rem;">${app.job_title} ${isAr ? 'الإصدار' : 'v'} ${app.version_number}</div>
            ${scoreBar}
            ${confidence ? `<div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.2rem;"><i class="fas fa-brain"></i> ${confidence}</div>` : ''}
        </div>`;
    }).join('');
    
    return `<div style="display:flex; flex-direction:column; gap:0.5rem;">${scoresHtml}</div>`;
}

function buildAssignedCandidatesRows(assignedCandidates, selectedAssigned, labels, isAr) {
    if (!Array.isArray(assignedCandidates) || assignedCandidates.length === 0) {
        return `<tr><td colspan="8" class="text-center text-muted" style="padding: 2rem;">${labels.noAssignedCandidates || 'No assigned candidates found.'}</td></tr>`;
    }

    return assignedCandidates.map(c => {
        const firstApp = (c.applications || [])[0] || {};
        const scoresHtml = buildAllScoresHtml(c.applications || [], isAr);

        const jobsHtml = (c.applications || []).map(app => {
            const status = app.app_status || '-';
            return `
                <div style="display:flex; justify-content:space-between; align-items:center; gap:0.75rem; padding:0.65rem 0.75rem; border-radius:10px; background: rgba(15, 23, 42, 0.04);">
                    <div>
                        <div style="font-weight:600; font-size:0.92rem;">${app.job_title}</div>
                        <div style="font-size:0.8rem; color:var(--text-muted);">${isAr ? 'الإصدار' : 'Version'} ${app.version_number} · ${status}</div>
                    </div>
                    <button class="btn-action delete-app-btn" data-app-id="${app.app_id}" title="${labels.unlinkJob}" style="padding:0.25rem 0.4rem;"><i class="fas fa-unlink" style="color:var(--warning-color);"></i></button>
                </div>
            `;
        }).join('');

        const statusSummary = [...new Set((c.applications || []).map(app => app.app_status || '-'))].join(', ');
        const versionSummary = (c.applications || []).map(app => app.version_number).join(', ');

        return `
            <tr>
                <td class="text-center"><input type="checkbox" class="assigned-select-checkbox" data-id="${c.candidate_id}" ${selectedAssigned.has(c.candidate_id) ? 'checked' : ''}></td>
                <td><strong>${c.full_name}</strong><div style="font-size:0.8rem; color:var(--text-muted);">${c.email}</div></td>
                <td style="min-width:280px; max-width:320px;">
                    <div style="max-height: 170px; overflow-y:auto; display:flex; flex-direction:column; gap:0.55rem; padding-right:0.2rem;">
                        ${jobsHtml}
                    </div>
                </td>
                <td>${versionSummary || '-'}</td>
                <td>${statusSummary || '-'}</td>
                <td style="min-width:260px; max-width:300px;">
                    <div style="max-height:160px; overflow-y:auto; padding-right:0.2rem;">
                        ${scoresHtml}
                    </div>
                </td>
                <td class="text-center">
                    <button class="btn-action view-transcripts-btn" data-id="${c.candidate_id}" title="${isAr ? 'سجلات المقابلات' : 'Interview Transcripts'}"><i class="fas fa-comments" style="color:var(--primary-color);"></i></button>
                    <button class="btn-action edit-cand-btn" data-id="${c.candidate_id}" title="Edit"><i class="fas fa-edit"></i></button>
                    <button class="btn-action link-job-btn" data-id="${c.candidate_id}" title="${isAr ? 'ربط بوظيفة أخرى' : 'Link to another job'}"><i class="fas fa-link" style="color:var(--primary-color);"></i></button>
                    <button class="btn-action delete-cand-btn" data-id="${c.candidate_id}" style="color:var(--danger-color);" title="Delete Candidate"><i class="fas fa-trash-alt"></i></button>
                </td>
            </tr>
        `;
    }).join('');
}

export function renderAssignedCandidatesSection(assignedCandidates, assignedSearch, assignedDisplayLimit, assignedJobFilter, assignedVersionFilter, assignedStatusFilter, selectedAssigned, jobs, labels, isAr) {
    const query = (assignedSearch || '').toLowerCase().trim();
    let filtered = Array.isArray(assignedCandidates) ? assignedCandidates.slice() : [];

    if (assignedJobFilter) {
        filtered = filtered.filter(c => (c.applications || []).some(app => app.job_id === assignedJobFilter));
    }
    if (assignedVersionFilter) {
        filtered = filtered.filter(c => (c.applications || []).some(app => app.version_id === assignedVersionFilter));
    }
    if (assignedStatusFilter) {
        filtered = filtered.filter(c => (c.applications || []).some(app => (app.app_status || '').toLowerCase() === assignedStatusFilter));
    }
    if (query) {
        filtered = filtered.filter(c => {
            const jobText = (c.applications || []).map(app => `${app.job_title || ''} ${app.version_number || ''} ${app.app_status || ''}`).join(' ');
            return (`${c.full_name || ''} ${c.email || ''} ${c.source || ''} ${jobText}`).toLowerCase().includes(query);
        });
    }

    const visible = filtered.slice(0, assignedDisplayLimit);
    const hasMore = filtered.length > visible.length;
    const selectedCount = selectedAssigned.size;
    const allVisibleSelected = visible.length > 0 && visible.every(c => selectedAssigned.has(c.candidate_id));

    const jobOptions = jobs.map(job => `<option value="${job.job_id}" ${assignedJobFilter === job.job_id ? 'selected' : ''}>${job.job_title}</option>`).join('');
    const versionEntries = jobs.reduce((list, job) => {
        return list.concat((job.versions || []).map(v => ({
            job_id: job.job_id,
            version_id: v.version_id,
            label: `${job.job_title} - ${isAr ? 'الإصدار' : 'Version'} ${v.version_number}`,
            version_number: v.version_number
        })));
    }, []);
    const versionOptions = versionEntries
        .filter(item => !assignedJobFilter || item.job_id === assignedJobFilter)
        .map(item => `<option value="${item.version_id}" ${assignedVersionFilter === item.version_id ? 'selected' : ''}>${item.label}</option>`)
        .join('');

    const statusOptions = [
        { value: '', label: isAr ? 'كل الحالات' : 'All Statuses' },
        { value: 'applied', label: isAr ? 'متقدم' : 'Applied' },
        { value: 'screening', label: isAr ? 'في الفحص' : 'Screening' },
        { value: 'interviewing', label: isAr ? 'في المقابلة' : 'Interviewing' },
        { value: 'accepted', label: isAr ? 'مقبول' : 'Accepted' },
        { value: 'rejected', label: isAr ? 'مرفوض' : 'Rejected' }
    ];
    const statusOptionsHtml = statusOptions.map(opt => `<option value="${opt.value}" ${assignedStatusFilter === opt.value ? 'selected' : ''}>${opt.label}</option>`).join('');

    const rowsHtml = buildAssignedCandidatesRows(visible, selectedAssigned, labels, isAr);

    return `
        <div class="card" style="box-shadow: 0 4px 20px rgba(0,0,0,0.03); border-radius: 12px; background: var(--bg-card);">
            <div style="padding: 1.5rem; border-bottom: 1px solid var(--border-color);">
                <h2 style="margin: 0; color: var(--text-color); font-size: 1.4rem; font-weight: 700;">${labels.assignedTitle}</h2>
                <p style="margin: 0.2rem 0 0 0; font-size: 0.85rem; color: var(--text-muted);">${labels.assignedSubtitle}</p>
            </div>
            <div class="table-responsive" style="padding: 0 1.5rem 1.5rem 1.5rem;">
                <div class="unassigned-toolbar" style="display:flex; flex-wrap:wrap; justify-content:space-between; gap:0.75rem; align-items:center; margin-bottom:1rem;">
                    <div style="display:flex; flex-wrap:wrap; gap:0.75rem; align-items:center; min-width:260px;">
                        <input id="assigned-search" type="search" placeholder="${isAr ? 'بحث باسم المرشح، البريد، الوظيفة...' : 'Search by name, email or job...'}" value="${assignedSearch}" class="form-control" style="min-width:220px; padding:0.7rem 0.85rem;" />
                        <select id="assigned-job-filter" class="form-control" style="min-width:180px; padding:0.7rem 0.85rem;">
                            <option value="">${isAr ? 'كل الوظائف' : 'All Jobs'}</option>
                            ${jobOptions}
                        </select>
                        <select id="assigned-version-filter" class="form-control" style="min-width:180px; padding:0.7rem 0.85rem;">
                            <option value="">${isAr ? 'كل الإصدارات' : 'All Versions'}</option>
                            ${versionOptions}
                        </select>
                        <select id="assigned-status-filter" class="form-control" style="min-width:180px; padding:0.7rem 0.85rem;">
                            ${statusOptionsHtml}
                        </select>
                    </div>
                    <div style="display:flex; flex-wrap:wrap; gap:0.5rem; align-items:center;">
                        <span style="font-size:0.9rem; color:var(--text-muted);">${isAr ? 'المحددون:' : 'Selected:'} ${selectedCount}</span>
                        <button id="bulk-link-assigned-btn" class="btn btn-primary" style="padding:0.6rem 0.9rem;">${isAr ? 'ربط المحددين بوظيفة' : 'Link Selected'}</button>
                        <button id="bulk-delete-assigned-btn" class="btn btn-outline-danger" style="padding:0.6rem 0.9rem;">${isAr ? 'حذف المحددين' : 'Delete Selected'}</button>
                        <button id="delete-all-assigned-btn" class="btn btn-danger" style="padding:0.6rem 0.9rem;">${isAr ? 'حذف الكل' : 'Delete All Assigned'}</button>
                    </div>
                </div>
                <table class="table">
                    <thead>
                        <tr>
                            <th class="text-center" style="width: 40px;"><input type="checkbox" id="select-all-assigned" ${allVisibleSelected ? 'checked' : ''}></th>
                            <th>${labels.candidateInfo}</th>
                            <th>${isAr ? 'الوظيفة' : 'Job'}</th>
                            <th>${isAr ? 'الإصدار' : 'Version'}</th>
                            <th>${labels.status}</th>
                            <th>${labels.overallScore}</th>
                            <th style="width: 220px;">${labels.actions}</th>
                        </tr>
                    </thead>
                    <tbody id="assigned-tbody">
                        ${rowsHtml}
                    </tbody>
                </table>
                ${hasMore ? `<div class="unassigned-footer" style="display:flex; justify-content:space-between; align-items:center; margin-top:1rem; gap:0.75rem;"><span style="color:var(--text-muted);">${isAr ? 'عرض' : 'Showing'} ${visible.length} ${isAr ? 'من' : 'of'} ${filtered.length} ${isAr ? 'مرشحاً' : 'candidates'}</span><button id="show-more-assigned-btn" class="btn btn-outline" style="padding:0.55rem 0.9rem;">${isAr ? 'عرض المزيد' : 'Load More'}</button></div>` : ''}
            </div>
        </div>
    `;
}
