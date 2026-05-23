import { api } from './api.js';

/**
 * Pipeline Poller - Real-time pipeline status polling
 * Handles continuous polling of pipeline progress
 */

export class PipelinePoller {
    /**
     * Initialize pipeline poller
     * 
     * @param {number} sessionId - Session ID to poll
     * @param {Object} config - Configuration object
     * @param {number} config.interval - Poll interval in milliseconds (default: 2000)
     * @param {number} config.maxAttempts - Maximum poll attempts (default: 300 = 10 minutes)
     * @param {Function} config.onUpdate - Callback when status updates
     * @param {Function} config.onError - Callback when error occurs
     * @param {Function} config.onComplete - Callback when pipeline completes
     */
    constructor(sessionId, config = {}) {
        this.sessionId = sessionId;
        this.config = {
            interval: 2000,               // Poll every 2 seconds
            maxAttempts: 300,             // Max 10 minutes (300 * 2000ms)
            onUpdate: () => {},
            onError: () => {},
            onComplete: () => {},
            ...config
        };
        
        this.pollInterval = null;
        this.attempts = 0;
        this.isRunning = false;
    }
    
    /**
     * Start polling for pipeline status
     */
    async start() {
        if (this.isRunning) {
            console.warn('Poller already running');
            return;
        }
        
        this.isRunning = true;
        this.attempts = 0;
        
        this.pollInterval = setInterval(async () => {
            this.attempts++;
            
            // Check if max attempts exceeded
            if (this.attempts > this.config.maxAttempts) {
                this.stop();
                this.config.onError(
                    new Error(`Polling timeout after ${this.config.maxAttempts} attempts`)
                );
                return;
            }
            
            try {
                const status = await this.fetchStatus();
                
                // Call update callback
                this.config.onUpdate(status);
                
                // Check if pipeline completed or failed
                if (status.status === 'completed' || status.status === 'failed') {
                    this.stop();
                    this.config.onComplete(status);
                }
                
            } catch (error) {
                console.error('Polling error:', error);
                this.config.onError(error);
            }
        }, this.config.interval);
    }
    
    /**
     * Stop polling
     */
    stop() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
            this.isRunning = false;
        }
    }
    
    /**
     * Fetch current pipeline status
     */
    async fetchStatus() {
        return api.get(`/sessions/${this.sessionId}/status`);
    }
    
    /**
     * Get current polling status
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            attempts: this.attempts,
            maxAttempts: this.config.maxAttempts,
            percentComplete: (this.attempts / this.config.maxAttempts) * 100
        };
    }
}


/**
 * Helper function to update UI with pipeline status
 */
export function updatePipelineUI(status) {
    const stepsContainer = document.getElementById('pipeline-steps');
    if (!stepsContainer) return;
    
    const stepsHtml = (status.steps || []).map(step => `
        <div class="step step-${step.status}">
            <div class="step-header">
                <span class="step-icon">${getStatusIcon(step.status)}</span>
                <span class="step-name">${step.step_name}</span>
                <span class="step-status">${translateStatus(step.status)}</span>
            </div>
            <div class="step-details">
                ${step.latency_ms ? `<span class="step-time">${step.latency_ms}ms</span>` : ''}
                ${step.tokens_used ? `<span class="step-tokens">${step.tokens_used} tokens</span>` : ''}
                ${step.error_message ? `<span class="step-error">${step.error_message}</span>` : ''}
            </div>
        </div>
    `).join('');
    
    stepsContainer.innerHTML = stepsHtml || '<p>No steps available</p>';
}


/**
 * Helper function to update progress bar
 */
export function updateProgressBar(steps) {
    const progressBar = document.getElementById('progress-bar');
    if (!progressBar) return;
    
    const totalSteps = steps?.length || 5;
    const completedSteps = steps?.filter(s => s.status === 'success').length || 0;
    const failedSteps = steps?.filter(s => s.status === 'failed').length || 0;
    
    const percentage = (completedSteps / totalSteps) * 100;
    
    progressBar.style.width = percentage + '%';
    progressBar.textContent = `${Math.round(percentage)}%`;
    
    if (failedSteps > 0) {
        progressBar.classList.add('error');
        progressBar.classList.remove('success');
    } else if (percentage === 100) {
        progressBar.classList.add('success');
        progressBar.classList.remove('error');
    }
}


/**
 * Get emoji icon for status
 */
function getStatusIcon(status) {
    const icons = {
        'pending': '⏳',
        'running': '⚙️',
        'success': '✅',
        'failed': '❌'
    };
    return icons[status] || '❓';
}


/**
 * Translate status to human-readable text (with i18n support)
 */
function translateStatus(status) {
    const translations = {
        'pending': 'قيد الانتظار / Pending',
        'running': 'جاري التنفيذ / Running',
        'success': 'نجاح / Success',
        'failed': 'فشل / Failed'
    };
    return translations[status] || status;
}


/**
 * Format duration from milliseconds to readable string
 */
export function formatDuration(ms) {
    if (!ms) return 'N/A';
    
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
    } else {
        return `${seconds}s`;
    }
}


/**
 * Format token count with thousand separators
 */
export function formatTokens(tokens) {
    return (tokens || 0).toLocaleString();
}


/**
 * Show toast notification
 */
export function showToast(message, type = 'info') {
    // Implementation depends on your toast library
    // This is a placeholder
    console.log(`[${type.toUpperCase()}] ${message}`);
}
