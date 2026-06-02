import { t, getLang, setLang } from '../core/i18n.js';
import { api } from '../core/api.js';

export class Navbar {
    static _escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    static render() {
        if (window.location.hash === '#/auth') {
            document.getElementById('navbar').style.display = 'none';
            return;
        }
        const lang = getLang();
        let user = {};
        try {
            user = JSON.parse(localStorage.getItem('user_info') || '{}');
        } catch {
            user = {};
        }
        const safeFullName = this._escapeHtml(user.full_name || '');
        const safeRole = this._escapeHtml(user.role || '');
        const safeInitial = this._escapeHtml((user.full_name || '').charAt(0).toUpperCase());
        const roleBadgeColor = { admin: 'var(--danger)', hr: 'var(--primary-color)', recruiter: 'var(--info)' };
        const roleColor = roleBadgeColor[user.role] || 'var(--text-muted)';

        const activeTheme = document.documentElement.dataset.theme || 'light';
        const themeIcon = activeTheme === 'dark' ? 'fa-sun' : 'fa-moon';
        const navHtml = `
            <a href="#/" class="nav-brand">
                <i class="fas fa-brain"></i> AI Platform
            </a>
            <ul class="nav-links">
                <li><a href="#/dashboard" class="${this._isActive('/dashboard') || this._isActive('/') ? 'active' : ''}">${t('dashboard')}</a></li>
                <li><a href="#/jobs" class="${this._isActive('/jobs') ? 'active' : ''}">${t('jobs')}</a></li>
                <li><a href="#/candidates" class="${this._isActive('/candidates') ? 'active' : ''}">${t('candidates')}</a></li>
                ${user.role === 'admin' ? `<li><a href="#/audit-logs" class="${this._isActive('/audit-logs') ? 'active' : ''}"><i class="fas fa-shield-alt"></i> Audit</a></li>` : ''}
            </ul>
            <div class="nav-controls">
                <button id="btn-theme-toggle" class="btn btn-outline" style="padding:0.4rem 0.8rem;border-radius:50%;" title="Toggle Theme">
                    <i class="fas ${themeIcon}"></i>
                </button>
                <button id="btn-lang-toggle" class="btn btn-outline" title="Switch Language">
                    <i class="fas fa-globe"></i> ${t('switchLang')}
                </button>
                ${user.full_name ? `
                <div style="display:flex;align-items:center;gap:0.5rem;padding:0.3rem 0.8rem;background:var(--bg-color);border-radius:var(--radius-md);">
                    <div style="width:30px;height:30px;border-radius:50%;background:var(--primary-color);color:white;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.85rem;">
                        ${safeInitial}
                    </div>
                    <div style="line-height:1.2;">
                        <div style="font-size:0.85rem;font-weight:600;">${safeFullName}</div>
                        <div style="font-size:0.75rem;color:${roleColor};font-weight:600;">${safeRole}</div>
                    </div>
                </div>` : ''}
                <button id="btn-logout" class="btn btn-outline" style="color:var(--danger);border-color:var(--danger);">
                    <i class="fas fa-sign-out-alt"></i> ${t('logout')}
                </button>
            </div>
        `;

        const navEl = document.getElementById('navbar');
        navEl.innerHTML = navHtml;
        navEl.style.display = 'flex';
        this._mount();
    }

    static _isActive(route) {
        const hash = window.location.hash.replace('#', '') || '/';
        return hash === route || hash.startsWith(route + '/');
    }

    static _mount() {
        document.getElementById('btn-lang-toggle')?.addEventListener('click', () => {
            const current = getLang();
            setLang(current === 'ar' ? 'en' : 'ar');
            this.render();
        });

        document.getElementById('btn-theme-toggle')?.addEventListener('click', () => {
            const currentTheme = document.documentElement.dataset.theme || 'light';
            const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.dataset.theme = nextTheme;
            document.documentElement.classList.toggle('dark-mode', nextTheme === 'dark');
            localStorage.setItem('theme', nextTheme);
            this.render();
        });

        document.getElementById('btn-logout')?.addEventListener('click', async () => {
            try {
                // Optional: call logout endpoint
                const token = localStorage.getItem('access_token');
                if (token) {
                    await api.post('/auth/logout', {}).catch(() => {});
                }
            } finally {
                localStorage.removeItem('access_token');
                localStorage.removeItem('user_info');
                window.location.hash = '/auth';
            }
        });
    }

    // Backward compat
    static mount() { this._mount(); }
}
