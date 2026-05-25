import { t, getLang } from '../core/i18n.js';
import { api } from '../core/api.js';
import { Toast } from '../components/Toast.js';

export class AuditSection {
    constructor() {
        this.logs = [];
        this.filteredLogs = [];
        
        // Pagination
        this.page = 1;
        this.pageSize = 25;
        this.totalCount = 0;
        this.totalPages = 1;
        this.isLoading = false;
        
        // Filters
        this.searchQuery = '';
        this.actionFilter = 'all';
        this.resourceFilter = 'all';
        this._searchTimeout = null;
        
        // Available filter options (populated from data)
        this.availableActions = [];
        this.availableResources = [];
    }

    // ─── Data Fetching ────────────────────────────────────────────────────────
    async fetchData() {
        if (this.isLoading) return;
        try {
            this.isLoading = true;
            const params = {
                limit: this.pageSize,
                skip: (this.page - 1) * this.pageSize,
            };

            if (this.searchQuery.trim()) params.search = this.searchQuery.trim();
            if (this.actionFilter !== 'all') params.action = this.actionFilter;
            if (this.resourceFilter !== 'all') params.resource_type = this.resourceFilter;

            const data = await api.get('/audit/logs', params);
            
            if (Array.isArray(data)) {
                this.logs = data;
                this.totalCount = data.length;
            } else {
                this.logs = data.items || data.logs || [];
                this.totalCount = data.total_count ?? data.total ?? this.logs.length;
            }

            this.totalPages = Math.max(1, Math.ceil(this.totalCount / this.pageSize));
            this.filteredLogs = this.logs;

            // Collect unique actions & resources for filter dropdowns if not already populated
            if (this.availableActions.length === 0 && this.logs.length > 0) {
                this.availableActions = [...new Set(this.logs.map(l => l.action).filter(Boolean))].sort();
                this.availableResources = [...new Set(this.logs.map(l => l.resource_type).filter(Boolean))].sort();
            }
        } catch (error) {
            console.error('AuditSection fetchData error:', error);
            Toast.show(getLang() === 'ar' ? 'فشل في تحميل سجلات التدقيق' : 'Failed to load audit logs', 'error');
            this.logs = [];
            this.filteredLogs = [];
        } finally {
            this.isLoading = false;
        }
    }

    // ─── Action Color Mapping ─────────────────────────────────────────────────
    _getActionStyle(action) {
        const a = (action || '').toLowerCase();
        if (a.includes('delete') || a.includes('remove') || a.includes('drop'))
            return { bg: 'rgba(239,68,68,0.1)', color: '#ef4444', icon: 'fa-trash-alt' };
        if (a.includes('create') || a.includes('add') || a.includes('insert') || a.includes('register'))
            return { bg: 'rgba(16,185,129,0.1)', color: '#10b981', icon: 'fa-plus-circle' };
        if (a.includes('update') || a.includes('edit') || a.includes('patch') || a.includes('modify'))
            return { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b', icon: 'fa-edit' };
        if (a.includes('login') || a.includes('auth') || a.includes('logout') || a.includes('token'))
            return { bg: 'rgba(139,92,246,0.1)', color: '#8b5cf6', icon: 'fa-key' };
        if (a.includes('export') || a.includes('download') || a.includes('import') || a.includes('upload'))
            return { bg: 'rgba(59,130,246,0.1)', color: '#3b82f6', icon: 'fa-exchange-alt' };
        if (a.includes('view') || a.includes('read') || a.includes('get') || a.includes('list'))
            return { bg: 'rgba(100,116,139,0.1)', color: '#64748b', icon: 'fa-eye' };
        return { bg: 'rgba(100,116,139,0.08)', color: '#64748b', icon: 'fa-circle' };
    }

    _formatTimestamp(ts) {
        if (!ts) return '—';
        try {
            const d = new Date(ts);
            const isAr = getLang() === 'ar';
            return d.toLocaleString(isAr ? 'ar-EG' : 'en-GB', {
                year: 'numeric', month: 'short', day: '2-digit',
                hour: '2-digit', minute: '2-digit', second: '2-digit'
            });
        } catch { return ts; }
    }

    _formatDetails(details) {
        if (!details) return '—';
        try {
            const obj = typeof details === 'string' ? JSON.parse(details) : details;
            return Object.keys(obj).map(k => `${k}: ${obj[k]}`).join(', ');
        } catch {
            return String(details);
        }
    }

    // ─── Export & Print PDF ──────────────────────────────────────────────────
    _exportPDF() {
        const isAr = getLang() === 'ar';
        if (!this.filteredLogs.length) {
            Toast.show(isAr ? 'لا توجد بيانات لتصديرها' : 'No data to export', 'warning');
            return;
        }

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            Toast.show(isAr ? 'برجاء السماح بالنوافذ المنبثقة لتوليد الـ PDF' : 'Please allow popups to generate PDF', 'error');
            return;
        }

        // Generate Rows dynamically
        const rowsHtml = this.filteredLogs.map(log => {
            const userName = log.user_full_name || log.user_email || (isAr ? 'النظام' : 'System');
            return `
                <tr>
                    <td style="font-family: monospace;">${log.id}</td>
                    <td><b>${userName}</b>${log.user_email && log.user_full_name ? `<br><small style="color:#666">${log.user_email}</small>` : ''}</td>
                    <td><span class="action-badge">${log.action || '—'}</span></td>
                    <td>${log.resource_type || '—'} ${log.resource_id ? `<small style="color:#666">#${log.resource_id}</small>` : ''}</td>
                    <td style="max-width: 200px; word-break: break-all; font-size: 11px;">${this._formatDetails(log.details)}</td>
                    <td style="font-family: monospace;">${log.ip_address || '—'}</td>
                    <td>${this._formatTimestamp(log.created_at)}</td>
                </tr>
            `;
        }).join('');

        // Build Clean Printing Page Template
        const htmlContent = `
            <!DOCTYPE html>
            <html lang="${getLang()}" dir="${isAr ? 'rtl' : 'ltr'}">
            <head>
                <meta charset="UTF-8">
                <title>${isAr ? 'تقرير سجلات التدقيق والمراقبة' : 'Audit Logs Report'}</title>
                <style>
                    body { font-family: system-ui, -apple-system, sans-serif; padding: 30px; color: #1e293b; background: #fff; line-height: 1.5; }
                    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 25px; }
                    .header h1 { font-size: 24px; margin: 0; color: #4f46e5; }
                    .header p { margin: 5px 0 0; font-size: 13px; color: #64748b; }
                    .meta-info { text-align: ${isAr ? 'left' : 'right'}; font-size: 12px; color: #64748b; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
                    th { background-color: #f8fafc; color: #475569; font-weight: 700; text-transform: uppercase; padding: 12px 10px; border-bottom: 2px solid #cbd5e1; text-align: ${isAr ? 'right' : 'left'}; }
                    td { padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: ${isAr ? 'right' : 'left'}; vertical-align: top; }
                    tr:nth-child(even) td { background-color: #f8fafc; }
                    .action-badge { font-weight: 600; color: #334155; }
                    @media print {
                        body { padding: 0; margin: 0; font-size: 11px; }
                        th { background-color: #f1f5f9 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        tr:nth-child(even) td { background-color: #f8fafc !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>
                        <h1>${isAr ? 'سجلات التدقيق والمراقبة' : 'Audit & System Logs'}</h1>
                        <p>${isAr ? 'تقرير تلقائي بنشاط النظام والعمليات' : 'Automated system activity and operations report.'}</p>
                    </div>
                    <div class="meta-info">
                        <div>${isAr ? 'تاريخ الاستخراج:' : 'Generated on:'} ${new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-GB')}</div>
                        <div>${isAr ? 'إجمالي السجلات:' : 'Total Records:'} ${this.filteredLogs.length}</div>
                    </div>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th style="width: 5%;">${isAr ? 'الرقم' : 'ID'}</th>
                            <th style="width: 20%;">${isAr ? 'المستخدم' : 'User'}</th>
                            <th style="width: 15%;">${isAr ? 'الإجراء' : 'Action'}</th>
                            <th style="width: 15%;">${isAr ? 'المورد' : 'Resource'}</th>
                            <th style="width: 25%;">${isAr ? 'التفاصيل' : 'Details'}</th>
                            <th style="width: 10%;">${isAr ? 'IP' : 'IP'}</th>
                            <th style="width: 15%;">${isAr ? 'الوقت والتاريخ' : 'Timestamp'}</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>
                <script>
                    window.onload = function() {
                        setTimeout(() => {
                            window.print();
                            window.onafterprint = function() { window.close(); };
                        }, 300);
                    };
                </script>
            </body>
            </html>
        `;

        printWindow.document.write(htmlContent);
        printWindow.document.close();
        Toast.show(isAr ? 'تم تجهيز ملف PDF للطباعة' : 'PDF generated for printing', 'success');
    }

    // ─── Render ───────────────────────────────────────────────────────────────
    render() {
        return `<div id="audit-section-container" style="width:100%;">${this._renderInner()}</div>`;
    }

    _renderInner() {
        const isAr = getLang() === 'ar';
        const labels = {
            title: isAr ? "سجلات التدقيق والمراقبة" : "Audit & System Logs",
            subtitle: isAr ? "تتبع نشاط النظام وإجراءات المستخدمين لتعزيز الأمان والامتثال." : "Track system activity and user actions for security and compliance monitoring.",
            logId: isAr ? "الرقم" : "ID",
            user: isAr ? "المستخدم" : "User",
            action: isAr ? "الإجراء" : "Action",
            resource: isAr ? "المورد" : "Resource",
            details: isAr ? "التفاصيل" : "Details",
            ip: isAr ? "IP" : "IP Address",
            timestamp: isAr ? "الوقت" : "Timestamp",
            search: isAr ? "ابحث في السجلات..." : "Search logs...",
            filterAction: isAr ? "كل الإجراءات" : "All Actions",
            filterResource: isAr ? "كل الموارد" : "All Resources",
            export: isAr ? "تصدير PDF" : "Export PDF",
            refresh: isAr ? "تحديث" : "Refresh",
            showing: isAr ? "عرض" : "Showing",
            of: isAr ? "من" : "of",
            entries: isAr ? "سجل" : "entries",
            prev: isAr ? "السابق" : "Prev",
            next: isAr ? "التالي" : "Next",
            noLogs: isAr ? "لا توجد سجلات مطابقة" : "No matching logs found",
            totalEntries: isAr ? "إجمالي السجلات" : "Total Entries",
            page: isAr ? "صفحة" : "Page",
        };

        // ── Toolbar Filter Options ────────────────────────────────────────────
        const actionOptions = this.availableActions.map(a =>
            `<option value="${a}" ${this.actionFilter === a ? 'selected' : ''}>${a}</option>`
        ).join('');

        const resourceOptions = this.availableResources.map(r =>
            `<option value="${r}" ${this.resourceFilter === r ? 'selected' : ''}>${r}</option>`
        ).join('');

        // ── Table Rows ────────────────────────────────────────────────────────
        let tableRows = '';
        if (this.isLoading) {
            tableRows = Array(5).fill(0).map(() => `
                <tr>
                    ${Array(7).fill(0).map(() => `
                        <td style="padding:0.9rem;">
                            <div style="height:14px; background:linear-gradient(90deg,var(--bg-secondary) 25%,rgba(0,0,0,0.04) 50%,var(--bg-secondary) 75%); background-size:200% 100%; animation:shimmer 1.5s infinite; border-radius:4px;"></div>
                        </td>
                    `).join('')}
                </tr>
            `).join('');
        } else if (this.filteredLogs.length === 0) {
            tableRows = `
                <tr>
                    <td colspan="7" style="text-align:center; padding:4rem 2rem; color:var(--text-muted);">
                        <i class="fas fa-clipboard-list" style="font-size:2.5rem; display:block; margin-bottom:1rem; opacity:0.25;"></i>
                        <div style="font-size:1rem; font-weight:500;">${labels.noLogs}</div>
                        ${this.searchQuery || this.actionFilter !== 'all' || this.resourceFilter !== 'all'
                            ? `<div style="font-size:0.85rem; margin-top:0.4rem; opacity:0.7;">${isAr ? 'جرب تغيير معايير البحث أو الفلترة' : 'Try changing your search or filter criteria'}</div>`
                            : ''}
                    </td>
                </tr>
            `;
        } else {
            tableRows = this.filteredLogs.map((log, idx) => {
                const userName = log.user_full_name || log.user_email || (log.user_id ? `#${log.user_id}` : (isAr ? 'النظام' : 'System'));
                const isSystem = !log.user_full_name && !log.user_email;
                const userExtra = log.user_email && log.user_full_name
                    ? `<div style="font-size:0.8rem; color:var(--text-muted); margin-top:0.1rem;">${log.user_email}</div>`
                    : '';
                
                const resourceLabel = log.resource_type || '—';
                const resourceIdBadge = log.resource_id
                    ? `<span style="background:rgba(0,0,0,0.06); padding:0.1rem 0.4rem; border-radius:4px; font-size:0.75rem; margin-inline-start:0.35rem; color:var(--text-muted);">#${log.resource_id}</span>`
                    : '';

                const { bg, color, icon } = this._getActionStyle(log.action);
                const rowBg = idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.012)';

                return `
                    <tr class="audit-row" style="background:${rowBg}; border-bottom:1px solid var(--border-color);">
                        <td style="padding:0.85rem 1rem; font-size:0.82rem; color:var(--text-muted); font-family:monospace;">
                            ${log.id}
                        </td>
                        <td style="padding:0.85rem 1rem;">
                            <div style="display:flex; align-items:center; gap:0.55rem;">
                                <div style="width:30px; height:30px; border-radius:50%; background:${isSystem ? 'rgba(100,116,139,0.15)' : 'rgba(var(--primary-color-rgb,79,70,229),0.12)'}; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                                    <i class="fas ${isSystem ? 'fa-cog' : 'fa-user'}" style="font-size:0.75rem; color:${isSystem ? '#64748b' : 'var(--primary-color)'};"></i>
                                </div>
                                <div>
                                    <div style="font-weight:600; font-size:0.9rem; color:var(--text-color);">${userName}</div>
                                    ${userExtra}
                                </div>
                            </div>
                        </td>
                        <td style="padding:0.85rem 1rem;">
                            <span style="background:${bg}; color:${color}; padding:0.25rem 0.6rem; border-radius:6px; font-size:0.8rem; font-weight:600; display:inline-flex; align-items:center; gap:0.35rem; white-space:nowrap;">
                                <i class="fas ${icon}" style="font-size:0.7rem;"></i>
                                ${log.action || '—'}
                            </span>
                        </td>
                        <td style="padding:0.85rem 1rem; font-size:0.88rem;">
                            <span style="color:var(--text-color);">${resourceLabel}</span>${resourceIdBadge}
                        </td>
                        <td style="padding:0.85rem 1rem; max-width:220px;">
                            ${this._formatDetails(log.details)}
                        </td>
                        <td style="padding:0.85rem 1rem;">
                            <span style="font-size:0.82rem; color:var(--text-muted); font-family:monospace; white-space:nowrap;">${log.ip_address || '—'}</span>
                        </td>
                        <td style="padding:0.85rem 1rem;">
                            <span style="font-size:0.82rem; color:var(--text-muted); white-space:nowrap;">${this._formatTimestamp(log.created_at)}</span>
                        </td>
                    </tr>
                `;
            }).join('');
        }

        // ── Pagination Generation ─────────────────────────────────────────────
        const startEntry = this.filteredLogs.length === 0 ? 0 : (this.page - 1) * this.pageSize + 1;
        const endEntry = Math.min(this.page * this.pageSize, this.totalCount);
        
        const pageButtons = (() => {
            const btns = [];
            const range = 2;
            for (let p = 1; p <= this.totalPages; p++) {
                if (p === 1 || p === this.totalPages || (p >= this.page - range && p <= this.page + range)) {
                    btns.push({ page: p, label: String(p), active: p === this.page });
                } else if (btns.length && btns[btns.length - 1].label !== '...') {
                    btns.push({ page: null, label: '...', active: false });
                }
            }
            return btns;
        })();

        const paginationHtml = this.totalPages > 1 ? `
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.75rem; padding:1rem 1.5rem; border-top:1px solid var(--border-color); background:var(--bg-secondary);">
                <span style="font-size:0.85rem; color:var(--text-muted);">
                    ${labels.showing} <strong>${startEntry}–${endEntry}</strong> ${labels.of} <strong>${this.totalCount}</strong> ${labels.entries}
                </span>
                <div style="display:flex; gap:0.3rem; align-items:center; flex-wrap:wrap;">
                    <button id="audit-prev-btn" class="audit-page-btn" data-page="${this.page - 1}" ${this.page <= 1 ? 'disabled' : ''}>
                        <i class="fas fa-chevron-${isAr ? 'right' : 'left'}"></i> ${labels.prev}
                    </button>
                    ${pageButtons.map(b => b.label === '...'
                        ? `<span style="padding:0.3rem 0.5rem; color:var(--text-muted);">…</span>`
                        : `<button class="audit-page-btn ${b.active ? 'active' : ''}" data-page="${b.page}">${b.label}</button>`
                    ).join('')}
                    <button id="audit-next-btn" class="audit-page-btn" data-page="${this.page + 1}" ${this.page >= this.totalPages ? 'disabled' : ''}>
                        ${labels.next} <i class="fas fa-chevron-${isAr ? 'left' : 'right'}"></i>
                    </button>
                </div>
            </div>
        ` : (this.filteredLogs.length > 0 ? `
            <div style="padding:0.75rem 1.5rem; border-top:1px solid var(--border-color); background:var(--bg-secondary); font-size:0.85rem; color:var(--text-muted); text-align:${isAr ? 'right' : 'left'};">
                ${this.totalCount} ${labels.entries}
            </div>
        ` : '');

        return `
            <style>
                @keyframes shimmer {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }
                .audit-row { transition: background 0.15s; }
                .audit-row:hover { background: rgba(var(--primary-color-rgb,79,70,229), 0.03) !important; }
                .audit-toolbar-input {
                    padding: 0.6rem 0.85rem;
                    border-radius: 7px;
                    border: 1px solid var(--border-color);
                    background: var(--bg-primary);
                    color: var(--text-color);
                    font-size: 0.9rem;
                    transition: border-color 0.2s, box-shadow 0.2s;
                    min-width: 0;
                }
                .audit-toolbar-input:focus {
                    outline: none;
                    border-color: var(--primary-color);
                    box-shadow: 0 0 0 3px rgba(var(--primary-color-rgb,79,70,229), 0.12);
                }
                .audit-page-btn {
                    padding: 0.35rem 0.7 flex;
                    border-radius: 6px;
                    border: 1px solid var(--border-color);
                    background: var(--bg-primary);
                    color: var(--text-color);
                    font-size: 0.82rem;
                    cursor: pointer;
                    transition: all 0.15s;
                    display: inline-flex; align-items: center; gap: 0.3rem;
                }
                .audit-page-btn:hover:not(:disabled) {
                    border-color: var(--primary-color);
                    color: var(--primary-color);
                }
                .audit-page-btn.active {
                    background: var(--primary-color);
                    border-color: var(--primary-color);
                    color: #fff;
                    font-weight: 600;
                }
                .audit-page-btn:disabled {
                    opacity: 0.35;
                    cursor: not-allowed;
                }
                .audit-table thead th {
                    background: var(--bg-secondary);
                    color: var(--text-muted);
                    font-size: 0.78rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.6px;
                    padding: 0.85rem 1rem;
                    border-bottom: 2px solid var(--border-color);
                    white-space: nowrap;
                    text-align: inherit;
                }
                .audit-stat-card {
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    border-radius: 10px;
                    padding: 1rem 1.25rem;
                    display: flex;
                    align-items: center;
                    gap: 0.85rem;
                    flex: 1;
                    min-width: 160px;
                }
            </style>

            <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:1rem; margin-bottom:2rem;">
                <div>
                    <h1 style="color:var(--primary-color); font-size:2rem; font-weight:800; margin:0;">
                        <i class="fas fa-shield-alt" style="margin-inline-end:0.5rem; opacity:0.8;"></i>${labels.title}
                    </h1>
                    <p style="color:var(--text-muted); margin:0.3rem 0 0; font-size:1rem;">${labels.subtitle}</p>
                </div>
                <div style="display:flex; gap:0.6rem; flex-wrap:wrap; align-items:center;">
                    <button id="audit-refresh-btn" class="btn btn-outline" style="display:inline-flex; align-items:center; gap:0.4rem; padding:0.55rem 1rem;">
                        <i class="fas fa-sync-alt" id="audit-refresh-icon"></i> ${labels.refresh}
                    </button>
                    <button id="audit-export-btn" class="btn btn-outline" style="display:inline-flex; align-items:center; gap:0.4rem; padding:0.55rem 1rem;">
                        <i class="fas fa-file-pdf"></i> ${labels.export}
                    </button>
                </div>
            </div>

            <div style="display:flex; flex-wrap:wrap; gap:0.75rem; margin-bottom:1.5rem;">
                <div class="audit-stat-card">
                    <div style="width:38px; height:38px; border-radius:9px; background:rgba(var(--primary-color-rgb,79,70,229),0.1); display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                        <i class="fas fa-list" style="color:var(--primary-color);"></i>
                    </div>
                    <div>
                        <div style="font-size:1.4rem; font-weight:800; line-height:1;">${this.totalCount.toLocaleString()}</div>
                        <div style="font-size:0.78rem; color:var(--text-muted); margin-top:0.15rem;">${labels.totalEntries}</div>
                    </div>
                </div>
                <div class="audit-stat-card">
                    <div style="width:38px; height:38px; border-radius:9px; background:rgba(16,185,129,0.1); display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                        <i class="fas fa-bolt" style="color:#10b981;"></i>
                    </div>
                    <div>
                        <div style="font-size:1.4rem; font-weight:800; line-height:1;">${this.availableActions.length}</div>
                        <div style="font-size:0.78rem; color:var(--text-muted); margin-top:0.15rem;">${isAr ? 'أنواع الإجراءات' : 'Action Types'}</div>
                    </div>
                </div>
                <div class="audit-stat-card">
                    <div style="width:38px; height:38px; border-radius:9px; background:rgba(245,158,11,0.1); display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                        <i class="fas fa-layer-group" style="color:#f59e0b;"></i>
                    </div>
                    <div>
                        <div style="font-size:1.4rem; font-weight:800; line-height:1;">${this.availableResources.length}</div>
                        <div style="font-size:0.78rem; color:var(--text-muted); margin-top:0.15rem;">${isAr ? 'أنواع الموارد' : 'Resource Types'}</div>
                    </div>
                </div>
                <div class="audit-stat-card">
                    <div style="width:38px; height:38px; border-radius:9px; background:rgba(59,130,246,0.1); display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                        <i class="fas fa-file-alt" style="color:#3b82f6;"></i>
                    </div>
                    <div>
                        <div style="font-size:1.4rem; font-weight:800; line-height:1;">${labels.page} ${this.page}/${this.totalPages}</div>
                        <div style="font-size:0.78rem; color:var(--text-muted); margin-top:0.15rem;">${isAr ? 'الصفحة الحالية' : 'Current Page'}</div>
                    </div>
                </div>
            </div>

            <div class="card" style="border-radius:12px; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,0.04); background:var(--bg-card); border:1px solid var(--border-color);">
                <div style="padding:1rem 1.5rem; border-bottom:1px solid var(--border-color); display:flex; flex-wrap:wrap; gap:0.75rem; align-items:center; background:var(--bg-secondary);">
                    <div style="position:relative; flex:1; min-width:220px;">
                        <i class="fas fa-search" style="position:absolute; ${isAr ? 'right:0.75rem' : 'left:0.75rem'}; top:50%; transform:translateY(-50%); color:var(--text-muted); font-size:0.85rem; pointer-events:none;"></i>
                        <input
                            id="audit-search"
                            type="search"
                            class="audit-toolbar-input"
                            placeholder="${labels.search}"
                            value="${this.searchQuery}"
                            autocomplete="off"
                            style="padding-${isAr ? 'right' : 'left'}:2.25rem; width:100%; box-sizing:border-box;"
                        />
                    </div>
                    <select id="audit-action-filter" class="audit-toolbar-input" style="min-width:160px;">
                        <option value="all">${labels.filterAction}</option>
                        ${actionOptions}
                    </select>
                    <select id="audit-resource-filter" class="audit-toolbar-input" style="min-width:160px;">
                        <option value="all">${labels.filterResource}</option>
                        ${resourceOptions}
                    </select>
                    <select id="audit-pagesize" class="audit-toolbar-input" style="min-width:110px;">
                        ${[10, 25, 50, 100].map(n => `<option value="${n}" ${this.pageSize === n ? 'selected' : ''}>${n} / ${isAr ? 'صفحة' : 'page'}</option>`).join('')}
                    </select>
                </div>

                <div class="table-responsive" style="overflow-x:auto; width:100%;">
                    <table class="table audit-table" style="width:100%; border-collapse:collapse; text-align:start;">
                        <thead>
                            <tr>
                                <th style="width:70px;">${labels.logId}</th>
                                <th style="min-width:160px;">${labels.user}</th>
                                <th style="min-width:140px;">${labels.action}</th>
                                <th style="min-width:140px;">${labels.resource}</th>
                                <th style="min-width:200px;">${labels.details}</th>
                                <th style="min-width:120px;">${labels.ip}</th>
                                <th style="min-width:170px;">${labels.timestamp}</th>
                            </tr>
                        </thead>
                        <tbody id="audit-tbody">
                            ${tableRows}
                        </tbody>
                    </table>
                </div>

                <div id="audit-pagination">
                    ${paginationHtml}
                </div>
            </div>
        `;
    }

    // ─── Mount & Event Listeners ──────────────────────────────────────────────
    mount() {
        // Refresh Button
        const refreshBtn = document.getElementById('audit-refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', async () => {
                const icon = document.getElementById('audit-refresh-icon');
                if (icon) icon.classList.add('fa-spin');
                this.page = 1;
                await this.fetchData();
                this._updateDOM();
            });
        }

        // PDF Export Button (Updated to trigger PDF generation)
        const exportBtn = document.getElementById('audit-export-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this._exportPDF());
        }

        // Search Input with Debounce
        const searchInput = document.getElementById('audit-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                clearTimeout(this._searchTimeout);
                this.searchQuery = e.target.value;
                this._searchTimeout = setTimeout(async () => {
                    this.page = 1;
                    await this.fetchData();
                    this._updateDOM();
                    
                    // Restore focus and cursor positioning cleanly after partial re-render
                    const newSearch = document.getElementById('audit-search');
                    if (newSearch) {
                        newSearch.focus();
                        newSearch.setSelectionRange(this.searchQuery.length, this.searchQuery.length);
                    }
                }, 300);
            });

            searchInput.addEventListener('search', async (e) => {
                this.searchQuery = e.target.value;
                this.page = 1;
                await this.fetchData();
                this._updateDOM();
            });
        }

        // Action Filter Select
        const actionFilter = document.getElementById('audit-action-filter');
        if (actionFilter) {
            actionFilter.addEventListener('change', async (e) => {
                this.actionFilter = e.target.value;
                this.page = 1;
                await this.fetchData();
                this._updateDOM();
            });
        }

        // Resource Filter Select
        const resourceFilter = document.getElementById('audit-resource-filter');
        if (resourceFilter) {
            resourceFilter.addEventListener('change', async (e) => {
                this.resourceFilter = e.target.value;
                this.page = 1;
                await this.fetchData();
                this._updateDOM();
            });
        }

        // Page Size Select
        const pageSizeSelect = document.getElementById('audit-pagesize');
        if (pageSizeSelect) {
            pageSizeSelect.addEventListener('change', async (e) => {
                this.pageSize = parseInt(e.target.value, 10);
                this.page = 1;
                await this.fetchData();
                this._updateDOM();
            });
        }

        // Pagination Click Delegation
        const paginationContainer = document.getElementById('audit-pagination');
        if (paginationContainer) {
            paginationContainer.addEventListener('click', async (e) => {
                const btn = e.target.closest('.audit-page-btn');
                if (!btn || btn.disabled || btn.classList.contains('active')) return;

                const targetPage = parseInt(btn.getAttribute('data-page'), 10);
                if (targetPage && targetPage >= 1 && targetPage <= this.totalPages) {
                    this.page = targetPage;
                    await this.fetchData();
                    this._updateDOM();
                    
                    // Scroll back to the top of table smoothly if needed
                    const tableCard = document.querySelector('.card');
                    if (tableCard) tableCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            });
        }
    }

    // ─── DOM Partial Re-render ────────────────────────────────────────────────
    _updateDOM() {
        const container = document.getElementById('audit-section-container');
        if (container) {
            container.innerHTML = this._renderInner();
            this.mount();
        }
    }
}