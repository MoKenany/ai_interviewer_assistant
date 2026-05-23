import { t, getLang } from '../core/i18n.js';
import { api } from '../core/api.js';
import { Modal } from '../components/Modal.js';
import { Toast } from '../components/Toast.js';

export class EvaluationsSection {
    constructor() {
        this.sessions = [];
    }

    async fetchData() {
        try {
            this.sessions = await api.get('/sessions');
        } catch (error) {
            Toast.show(t('error'), 'error');
            this.sessions = [];
        }
    }

    render() {
        const isAr = getLang() === 'ar';
        
        const labels = {
            title: isAr ? "إدارة التقييمات والجلسات" : "Evaluations & Sessions",
            session: isAr ? "رقم الجلسة" : "Session ID",
            type: isAr ? "نوع الجلسة" : "Type",
            status: isAr ? "الحالة" : "Status",
            scheduled: isAr ? "تاريخ الجدولة" : "Scheduled Date",
            actions: isAr ? "الإجراءات" : "Actions",
            view: isAr ? "عرض" : "View",
            notScheduled: isAr ? "غير مجدول" : "Not scheduled",
            evaluationDetails: isAr ? "تفاصيل التقييم" : "Evaluation Details",
            appId: isAr ? "رقم التقديم" : "Application ID",
            scheduledAt: isAr ? "تاريخ الجدولة" : "Scheduled At",
            completedAt: isAr ? "تاريخ الاكتمال" : "Completed At"
        };

        let tableRows = '';
        if (this.sessions.length === 0) {
            tableRows = `<tr><td colspan="5" style="text-align: center; padding: 2rem;">${t('noData')}</td></tr>`;
        } else {
            tableRows = this.sessions.map(s => `
                <tr>
                    <td><strong>Session #${s.id}</strong></td>
                    <td>${s.session_type}</td>
                    <td><span style="background: var(--info); color: white; padding: 0.2rem 0.5rem; border-radius: var(--radius-md); font-size: 0.85rem;">${s.pipeline_status}</span></td>
                    <td>${s.scheduled_at ? new Date(s.scheduled_at).toLocaleDateString() : labels.notScheduled}</td>
                    <td>
                        <button class="btn btn-outline view-session-btn" data-id="${s.id}" style="padding: 0.3rem 0.6rem; font-size: 0.85rem;"><i class="fas fa-eye"></i> ${labels.view}</button>
                    </td>
                </tr>
            `).join('');
        }

        return `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                <h1 style="color: var(--primary-color);">${labels.title}</h1>
            </div>
            
            <div class="card table-responsive">
                <table class="table">
                    <thead>
                        <tr>
                            <th>${labels.session}</th>
                            <th>${labels.type}</th>
                            <th>${labels.status}</th>
                            <th>${labels.scheduled}</th>
                            <th>${labels.actions}</th>
                        </tr>
                    </thead>
                    <tbody id="eval-tbody">
                        ${tableRows}
                    </tbody>
                </table>
            </div>
        `;
    }

    mount() {
        document.getElementById('eval-tbody').addEventListener('click', (e) => {
            const viewBtn = e.target.closest('.view-session-btn');
            if (viewBtn) {
                const session = this.sessions.find(s => s.id == viewBtn.dataset.id);
                if (session) {
                    this.showSessionDetails(session);
                }
            }
        });
    }

    showSessionDetails(session) {
        const isAr = getLang() === 'ar';
        
        const labels = {
            session: isAr ? "رقم الجلسة" : "Session ID",
            appId: isAr ? "رقم التقديم" : "Application ID",
            type: isAr ? "نوع الجلسة" : "Type",
            status: isAr ? "الحالة" : "Status",
            scheduledAt: isAr ? "تاريخ الجدولة" : "Scheduled At",
            completedAt: isAr ? "تاريخ الاكتمال" : "Completed At",
            evaluationDetails: isAr ? "تفاصيل التقييم" : "Evaluation Details",
            n_a: isAr ? "غير متوفر" : "N/A"
        };

        const content = `
            <div style="margin-bottom: 1rem; line-height: 1.8;">
                <strong>${labels.session}:</strong> ${session.id} <br>
                <strong>${labels.appId}:</strong> ${session.application_id} <br>
                <strong>${labels.type}:</strong> ${session.session_type} <br>
                <strong>${labels.status}:</strong> <span style="background: var(--info); color: white; padding: 0.2rem 0.5rem; border-radius: var(--radius-md); font-size: 0.85rem;">${session.pipeline_status}</span> <br>
                <strong>${labels.scheduledAt}:</strong> ${session.scheduled_at ? new Date(session.scheduled_at).toLocaleString() : labels.n_a} <br>
                <strong>${labels.completedAt}:</strong> ${session.completed_at ? new Date(session.completed_at).toLocaleString() : labels.n_a}
            </div>
        `;
        const modal = new Modal({
            title: labels.evaluationDetails,
            content: content
        });
        modal.show();
    }
}
