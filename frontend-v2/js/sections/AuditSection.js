import { t, getLang } from '../core/i18n.js';
import { api } from '../core/api.js';
import { Toast } from '../components/Toast.js';

export class AuditSection {
    constructor() {
        this.logs = [];
    }

    async fetchData() {
        try {
            const data = await api.get('/audit/logs?limit=50');
            // Check if backend returns array or paginated object
            this.logs = Array.isArray(data) ? data : (data.items || []);
        } catch (error) {
            Toast.show(t('error'), 'error');
            this.logs = [];
        }
    }

    render() {
        const isAr = getLang() === 'ar';
        
        const labels = {
            title: isAr ? "سجلات التدقيق والمراقبة" : "Audit & System Logs",
            subtitle: isAr ? "تتبع نشاط النظام وإجراءات المستخدمين لتعزيز الأمان والامتثال." : "Track system activity and user actions for security and compliance monitoring.",
            logId: isAr ? "رمز السجل" : "Log ID",
            user: isAr ? "المستخدم" : "User",
            action: isAr ? "الإجراء" : "Action",
            resource: isAr ? "المورد" : "Resource",
            details: isAr ? "التفاصيل" : "Details",
            ip: isAr ? "عنوان IP" : "IP Address",
            timestamp: isAr ? "طابع الوقت" : "Timestamp",
        };

        let tableRows = '';
        if (this.logs.length === 0) {
            tableRows = `<tr><td colspan="7" style="text-align: center; padding: 2rem;">${t('noData')}</td></tr>`;
        } else {
            tableRows = this.logs.map(log => {
                const userName = log.user_full_name || log.user_email || (log.user_id ? `#${log.user_id}` : (isAr ? 'النظام' : 'System'));
                const userExtra = log.user_email ? `<div style="font-size:0.85rem;color:var(--text-muted);">${log.user_email}</div>` : '';
                const resourceLabel = log.resource_id ? `${log.resource_type} (#${log.resource_id})` : log.resource_type;
                const detailsText = log.details ? JSON.stringify(log.details, null, 0) : '';

                return `
                    <tr>
                        <td>${log.id}</td>
                        <td>
                            <div style="font-weight: 600; color: var(--primary-color);">${userName}</div>
                            ${userExtra}
                        </td>
                        <td>${log.action}</td>
                        <td>${resourceLabel}</td>
                        <td>${detailsText}</td>
                        <td><span style="font-size: 0.85rem; color: var(--text-muted);">${log.ip_address || '—'}</span></td>
                        <td>${new Date(log.created_at).toLocaleString()}</td>
                    </tr>
                `;
            }).join('');
        }

        return `
            <div style="margin-bottom: 2rem;">
                <h1 style="color: var(--primary-color);">${labels.title}</h1>
                <p style="color: var(--text-muted);">${labels.subtitle}</p>
            </div>
            
            <div class="card table-responsive">
                <table class="table">
                    <thead>
                        <tr>
                            <th>${labels.logId}</th>
                            <th>${labels.user}</th>
                            <th>${labels.action}</th>
                            <th>${labels.resource}</th>
                            <th>${labels.details}</th>
                            <th>${labels.ip}</th>
                            <th>${labels.timestamp}</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            </div>
        `;
    }

    mount() {
        // Read-only logs, nothing to mount
    }
}
