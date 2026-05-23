import { t } from '../core/i18n.js';
import { api } from '../core/api.js';
import { Toast } from '../components/Toast.js';

const activePipelinePolls = new Map();
const PIPELINE_POLL_MS = 10000;
const ACTIVE_PIPELINE_STATUSES = new Set(['running', 'pending']);

export class PipelineSection {
    constructor(params) {
        this.runId = params.runId;
        this.pipelineData = null;
        this.sessionData = null;
        this.pollingInterval = null;
        this.disposed = false;
    }

    async fetchData(options = {}) {
        const includeSession = options.includeSession ?? !this.sessionData;
        try {
            if (includeSession) {
                const [pipelineData, sessionData] = await Promise.all([
                    api.get(`/sessions/${this.runId}/status`),
                    api.get(`/sessions/${this.runId}`)
                ]);
                this.pipelineData = pipelineData;
                this.sessionData = sessionData;
            } else {
                this.pipelineData = await api.get(`/sessions/${this.runId}/status`);
            }
        } catch (error) {
            Toast.show(t('error'), 'error');
            this.pipelineData = null;
            if (includeSession) {
                this.sessionData = null;
            }
        }
    }

    render() {
        if (!this.pipelineData) {
            return `<div style="text-align: center; padding: 2rem;">No Pipeline Data Found.</div>`;
        }

        const data = this.pipelineData;
        const statusColor = data.status === 'completed' ? 'var(--success)' : (data.status === 'failed' ? 'var(--danger)' : 'var(--info)');

        const stepOrder = {
            'audio_extract': 1,
            'stt': 2,
            'qa_extraction': 3,
            'scoring': 4,
            'insight_generation': 5
        };

        let stepsHtml = '';
        if (data.steps && data.steps.length > 0) {
            const sortedSteps = [...data.steps].sort((a, b) => {
                return (stepOrder[a.step_name] || 99) - (stepOrder[b.step_name] || 99);
            });
            stepsHtml = sortedSteps.map(step => {
                let stepColor = 'var(--text-muted)';
                let statusBadge = '';
                let cardClass = '';

                if (step.status === 'success') {
                    stepColor = 'var(--success)';
                    statusBadge = `<span style="color: var(--success); font-weight: bold; font-size: 0.85rem; display: flex; align-items: center; gap: 0.4rem;"><i class="fas fa-check-circle"></i> SUCCESS</span>`;
                } else if (step.status === 'failed') {
                    stepColor = 'var(--danger)';
                    statusBadge = `<span style="color: var(--danger); font-weight: bold; font-size: 0.85rem; display: flex; align-items: center; gap: 0.4rem;"><i class="fas fa-exclamation-circle"></i> FAILED</span>`;
                } else if (step.status === 'running') {
                    stepColor = 'var(--info)';
                    statusBadge = `<span style="color: var(--info); font-weight: bold; font-size: 0.85rem; display: flex; align-items: center; gap: 0.4rem;"><i class="fas fa-circle-notch fa-spin"></i> RUNNING</span>`;
                    cardClass = 'pulse-active';
                } else {
                    stepColor = '#ccc';
                    statusBadge = `<span style="color: var(--text-muted); font-weight: bold; font-size: 0.85rem; display: flex; align-items: center; gap: 0.4rem;"><i class="far fa-clock"></i> PENDING</span>`;
                }

                const friendlyNames = {
                    audio_extract: '1. Audio Extraction (استخراج الصوت)',
                    stt: '2. Speech to Text (تحويل الصوت إلى نص)',
                    qa_extraction: '3. Q&A Extraction (استخراج الأسئلة والأجوبة)',
                    scoring: '4. Scoring & Assessment (التقييم والدرجات)',
                    insight_generation: '5. Executive Summary & Recommendations (ملخص الأداء والتقارير)'
                };
                const displayName = friendlyNames[step.step_name] || step.step_name;

                return `
                    <div class="card ${cardClass}" style="border-left: 5px solid ${stepColor}; padding: 1.2rem; margin-bottom: 1.2rem; border-radius: 0 var(--radius-md) var(--radius-md) 0; transition: all 0.3s ease;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <strong>${displayName}</strong>
                            ${statusBadge}
                        </div>
                        <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.5rem;">
                            Tokens Used: ${step.tokens_used || 0} | Latency: ${step.latency_ms ? (step.latency_ms / 1000).toFixed(1) : 0}s <br>
                            ${step.error_message ? `<div style="background: #ffebee; color: var(--danger); padding: 0.5rem 0.8rem; border-radius: var(--radius-sm); margin-top: 0.5rem; font-weight: 500;"><i class="fas fa-exclamation-triangle"></i> ${step.error_message}</div>` : ''}
                        </div>
                        ${step.status === 'failed' ? `<button class="btn btn-outline retry-btn" data-step="${step.step_name}" style="margin-top: 0.75rem; padding: 0.3rem 0.6rem; font-size: 0.8rem;"><i class="fas fa-redo"></i> Retry Step</button>` : ''}
                    </div>
                `;
            }).join('');
        } else {
            stepsHtml = `<p style="color: var(--text-muted);">Steps will appear here once pipeline begins...</p>`;
        }

        const appId = this.sessionData?.application_id || data.application_id || '';

        return `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                <div>
                    <h1 style="color: var(--primary-color);">Pipeline Monitor</h1>
                    <p style="color: var(--text-muted);">Session ID: ${data.session_id} | Run ID: ${data.id}</p>
                </div>
                <button class="btn btn-primary" onclick="window.location.hash='/applications/${appId}/sessions'"><i class="fas fa-arrow-left"></i> Back to Sessions</button>
            </div>
            
            <div class="card" style="margin-bottom: 2rem; border-top: 4px solid ${statusColor}; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                <div>
                    <h3>Overall Status: <span style="color: ${statusColor};">${data.status.toUpperCase()}</span></h3>
                    <p style="font-size: 0.9rem; color: var(--text-muted); margin-top: 0.5rem;">
                        Started: ${data.started_at ? new Date(data.started_at).toLocaleString() : 'N/A'}<br>
                        Completed: ${data.completed_at ? new Date(data.completed_at).toLocaleString() : 'N/A'}
                    </p>
                    ${data.error_message ? `<div style="background: #ffebee; color: var(--danger); padding: 1rem; border-radius: var(--radius-md); margin-top: 1rem;">${data.error_message}</div>` : ''}
                </div>
                ${(data.status === 'running' || data.status === 'pending') ? `
                    <button class="btn btn-outline stop-pipeline-btn" style="color: var(--danger); border-color: var(--danger); font-weight: 600; padding: 0.5rem 1rem;">
                        <i class="fas fa-stop" style="margin-right: 0.25rem;"></i> Stop Pipeline (إيقاف المعالجة)
                    </button>
                ` : ''}
            </div>

            ${data.status === 'completed' ? `
                <div class="card" style="background: var(--primary-light); border: 1px solid var(--primary-color); margin-bottom: 2rem; display: flex; justify-content: space-between; align-items: center; padding: 1.5rem; flex-wrap: wrap; gap: 1rem;">
                    <div>
                        <h4 style="color: var(--primary-color); margin-bottom: 0.2rem;"><i class="fas fa-magic"></i> AI Evaluation Ready!</h4>
                        <p style="font-size: 0.9rem; color: var(--text-main);">The AI has successfully completed the assessment and generated the final scores, feedback, and questions.</p>
                    </div>
                    <button class="btn btn-primary" onclick="window.location.hash='/sessions/${data.session_id}/evaluation'" style="box-shadow: 0 4px 12px rgba(0, 180, 136, 0.25);">
                        View Evaluation (عرض التقييم) <i class="fas fa-arrow-right" style="margin-left: 0.5rem;"></i>
                    </button>
                </div>
            ` : ''}

            <div style="max-width: 800px;">
                <h3 style="margin-bottom: 1rem; color: var(--primary-color);">Pipeline Steps</h3>
                ${stepsHtml}
            </div>
        `;
    }

    mount() {
        this._schedulePolling();

        // Handle retry clicks
        const container = document.getElementById('app-content');
        if (!container) return;

        const stopBtn = container.querySelector('.stop-pipeline-btn');
        if (stopBtn) {
            stopBtn.addEventListener('click', async () => {
                const isAr = localStorage.getItem('lang') === 'ar';
                if (!confirm(isAr ? 'هل أنت متأكد من إيقاف معالجة الـ AI لهذا الملف؟' : 'Are you sure you want to stop AI processing for this session?')) return;

                try {
                    await api.post(`/sessions/${this.runId}/stop`, {});
                    Toast.show(isAr ? 'تم إيقاف معالجة الـ AI بنجاح' : 'AI processing stopped successfully', 'success');
                    await this.refresh();
                } catch (err) {
                    Toast.show(err.message || 'Error stopping pipeline', 'error');
                }
            });
        }

        const retryBtns = container.querySelectorAll('.retry-btn');
        retryBtns.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const stepName = e.currentTarget.dataset.step;
                if (!confirm(`Retry step: ${stepName}?`)) return;

                try {
                    await api.post(`/pipeline/runs/${this.pipelineData.id}/steps/${stepName}/retry`, {});
                    Toast.show('Step retry triggered', 'success');
                    await this.refresh();
                } catch (err) {
                    Toast.show(err.message || 'Error retrying step', 'error');
                }
            });
        });
    }

    _schedulePolling() {
        this._clearPolling();
        if (!this.pipelineData || !ACTIVE_PIPELINE_STATUSES.has(this.pipelineData.status)) {
            return;
        }

        const existingTimer = activePipelinePolls.get(this.runId);
        if (existingTimer) {
            clearTimeout(existingTimer);
        }

        this.pollingInterval = setTimeout(async () => {
            activePipelinePolls.delete(this.runId);
            await this.refresh();
        }, PIPELINE_POLL_MS);
        activePipelinePolls.set(this.runId, this.pollingInterval);
    }

    _clearPolling() {
        if (this.pollingInterval) {
            clearTimeout(this.pollingInterval);
            this.pollingInterval = null;
        }

        const activeTimer = activePipelinePolls.get(this.runId);
        if (activeTimer) {
            clearTimeout(activeTimer);
            activePipelinePolls.delete(this.runId);
        }
    }

    destroy() {
        this.disposed = true;
        this._clearPolling();
    }

    async refresh() {
        if (this.disposed || window.location.hash !== `#/pipeline/runs/${this.runId}`) {
            this.destroy();
            return;
        }
        await this.fetchData({ includeSession: false });
        if (this.disposed || window.location.hash !== `#/pipeline/runs/${this.runId}`) {
            this.destroy();
            return;
        }
        document.getElementById('app-content').innerHTML = this.render();
        this.mount();
    }
}
