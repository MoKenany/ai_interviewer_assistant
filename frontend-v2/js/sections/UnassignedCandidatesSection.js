import { t } from '../core/i18n.js';

export function renderUnassignedCandidatesSection(unassigned, unassignedSearch, unassignedDisplayLimit, selectedUnassigned, unassignedSourceFilter, unassignedActiveFilter, labels, isAr) {
    const query = (unassignedSearch || '').toLowerCase().trim();
    let filteredUnassigned = Array.isArray(unassigned) ? unassigned.slice() : [];

    if (unassignedSourceFilter) {
        filteredUnassigned = filteredUnassigned.filter(c => (c.source || '').toLowerCase() === unassignedSourceFilter.toLowerCase());
    }
    if (unassignedActiveFilter) {
        filteredUnassigned = filteredUnassigned.filter(c => {
            if (unassignedActiveFilter === 'active') return c.is_active;
            if (unassignedActiveFilter === 'inactive') return !c.is_active;
            return true;
        });
    }
    if (query) {
        filteredUnassigned = filteredUnassigned.filter(c => (`${c.full_name || ''} ${c.email || ''} ${c.phone || ''} ${c.source || ''}`).toLowerCase().includes(query));
    }

    const visibleUnassigned = filteredUnassigned.slice(0, unassignedDisplayLimit);
    const selectedCount = selectedUnassigned.size;
    const allVisibleSelected = visibleUnassigned.length > 0 && visibleUnassigned.every(c => selectedUnassigned.has(c.candidate_id));
    const hasMoreToShow = filteredUnassigned.length > visibleUnassigned.length;

    const unassignedRowsHtml = visibleUnassigned.length === 0
        ? `<tr><td colspan="7" class="text-center text-muted" style="padding: 2rem;">${labels.noUnassigned}</td></tr>`
        : visibleUnassigned.map(c => {
            const resumeBtn = c.resume_file_path
                ? `<button class="btn-action btn-delete-resume del-resume-btn" data-id="${c.candidate_id}" title="Delete Resume"><i class="fas fa-file-pdf" style="color:var(--danger-color);"></i> ×</button>`
                : `<button class="btn-action btn-upload-resume upload-resume-btn" data-id="${c.candidate_id}" title="Upload Resume"><i class="fas fa-upload"></i></button>`;

            return `
                <tr>
                    <td class="text-center"><input type="checkbox" class="unassigned-select-checkbox" data-id="${c.candidate_id}" ${selectedUnassigned.has(c.candidate_id) ? 'checked' : ''}></td>
                    <td><strong>${c.full_name}</strong></td>
                    <td>${c.email}</td>
                    <td>${c.phone || '-'}</td>
                    <td>${c.source || '-'}</td>
                    <td class="text-center">${resumeBtn}</td>
                    <td>
                        <div class="actions-group">
                            <button class="btn btn-outline-info link-job-btn" data-id="${c.candidate_id}" style="padding: 0.3rem 0.6rem; font-size: 0.8rem;"><i class="fas fa-link"></i> ${labels.linkJob}</button>
                            <button class="btn-action view-transcripts-btn" data-id="${c.candidate_id}" title="${isAr ? 'سجلات المقابلات' : 'Interview Transcripts'}"><i class="fas fa-comments" style="color:var(--primary-color);"></i></button>
                            <button class="btn-action edit-cand-btn" data-id="${c.candidate_id}" title="Edit"><i class="fas fa-edit"></i></button>
                            <button class="btn-action delete-cand-btn" data-id="${c.candidate_id}" style="color:var(--danger-color);" title="Delete"><i class="fas fa-trash-alt"></i></button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

    return `
        <div class="card" style="box-shadow: 0 4px 20px rgba(0,0,0,0.03); border-radius: 12px; background: var(--bg-card);">
            <div style="padding: 1.5rem; border-bottom: 1px solid var(--border-color);">
                <h2 style="margin: 0; color: var(--text-color); font-size: 1.4rem; font-weight: 700;">${labels.unassignedTitle}</h2>
                <p style="margin: 0.2rem 0 0 0; font-size: 0.85rem; color: var(--text-muted);">${labels.unassignedSubtitle}</p>
            </div>
            <div class="table-responsive" style="padding: 0 1.5rem 1.5rem 1.5rem;">
                <div class="unassigned-toolbar" style="display:flex; flex-wrap:wrap; justify-content:space-between; gap:0.75rem; align-items:center; margin-bottom:1rem;">
                    <div style="display:flex; flex-wrap:wrap; gap:0.5rem; align-items:center;">
                        <input id="unassigned-search" type="search" placeholder="${isAr ? 'ابحث باسم، بريد أو مصدر...' : 'Search by name, email or source...'}" value="${unassignedSearch}" class="form-control" style="min-width:220px; padding:0.7rem 0.85rem;" />
                        <select id="unassigned-source-filter" class="form-control" style="min-width:180px; padding:0.7rem 0.85rem;">
                            <option value="">${isAr ? 'كل المصادر' : 'All Sources'}</option>
                            ${[...new Set((unassigned || []).filter(c => c.source).map(c => c.source))].map(src => `<option value="${src}" ${unassignedSourceFilter === src ? 'selected' : ''}>${src}</option>`).join('')}
                        </select>
                        <select id="unassigned-active-filter" class="form-control" style="min-width:180px; padding:0.7rem 0.85rem;">
                            <option value="">${isAr ? 'كل الحالات' : 'All Statuses'}</option>
                            <option value="active" ${unassignedActiveFilter === 'active' ? 'selected' : ''}>${isAr ? 'نشط' : 'Active'}</option>
                            <option value="inactive" ${unassignedActiveFilter === 'inactive' ? 'selected' : ''}>${isAr ? 'غير نشط' : 'Inactive'}</option>
                        </select>
                    </div>
                    <div style="display:flex; flex-wrap:wrap; gap:0.5rem; align-items:center;">
                        <span style="font-size:0.9rem; color:var(--text-muted);">${isAr ? 'المحددون:' : 'Selected:'} ${selectedCount}</span>
                        <button id="bulk-link-selected-btn" class="btn btn-primary" style="padding:0.6rem 0.9rem;">${isAr ? 'ربط المحددين بوظيفة' : 'Link Selected'}</button>
                        <button id="delete-all-unassigned-btn" class="btn btn-danger" style="padding:0.6rem 0.9rem;">${isAr ? 'حذف الكل' : 'Delete All'}</button>
                        <button id="bulk-delete-selected-btn" class="btn btn-outline-danger" style="padding:0.6rem 0.9rem;">${isAr ? 'حذف المحدد' : 'Delete Selected'}</button>
                    </div>
                </div>
                <table class="table">
                    <thead>
                        <tr>
                            <th class="text-center" style="width: 40px;"><input type="checkbox" id="select-all-unassigned" ${allVisibleSelected ? 'checked' : ''}></th>
                            <th>${isAr ? 'الاسم' : 'Name'}</th>
                            <th>${isAr ? 'البريد الإلكتروني' : 'Email'}</th>
                            <th>${isAr ? 'الهاتف' : 'Phone'}</th>
                            <th>${isAr ? 'المصدر' : 'Source'}</th>
                            <th class="text-center" style="width: 100px;">${labels.resume}</th>
                            <th style="width: 250px;">${labels.actions}</th>
                        </tr>
                    </thead>
                    <tbody id="unassigned-tbody">
                        ${unassignedRowsHtml}
                    </tbody>
                </table>
                ${hasMoreToShow ? `<div class="unassigned-footer" style="display:flex; justify-content:space-between; align-items:center; margin-top:1rem; gap:0.75rem;"><span style="color:var(--text-muted);">${isAr ? 'عرض' : 'Showing'} ${visibleUnassigned.length} ${isAr ? 'من' : 'of'} ${filteredUnassigned.length} ${isAr ? 'مرشحاً' : 'candidates'}</span><button id="show-more-unassigned-btn" class="btn btn-outline" style="padding:0.55rem 0.9rem;">${isAr ? 'عرض المزيد' : 'Load More'}</button></div>` : ''}
            </div>
        </div>
    `;
}
