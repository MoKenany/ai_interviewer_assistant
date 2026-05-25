import { t } from './i18n.js';
import { DashboardSection } from '../sections/DashboardSection.js';
import { JobsSection } from '../sections/JobsSection.js';
import { CandidatesSection } from '../sections/CandidatesSection.js';
import { EvaluationsSection } from '../sections/EvaluationsSection.js';
import { AuthSection } from '../sections/AuthSection.js';
import { ApplicationsSection } from '../sections/ApplicationsSection.js';
import { SessionsSection } from '../sections/SessionsSection.js';
import { Navbar } from '../components/Navbar.js';

import { PipelineSection } from '../sections/PipelineSection.js';
import { AuditSection } from '../sections/AuditSection.js';
import { EvaluationDetailSection } from '../sections/EvaluationDetailSection.js';
import { JobVersionsSection } from '../sections/JobVersionsSection.js';
import { JobVersionDetailSection } from '../sections/JobVersionDetailSection.js';

const routes = [
    { path: /^\/$/, view: DashboardSection },
    { path: /^\/dashboard$/, view: DashboardSection },
    { path: /^\/jobs$/, view: JobsSection },
    { path: /^\/jobs\/(?<jobId>\d+)\/versions$/, view: JobVersionsSection },
    { path: /^\/jobs\/(?<jobId>\d+)\/versions\/(?<versionId>\d+)$/, view: JobVersionDetailSection },
    { path: /^\/job-versions\/(?<versionId>\d+)\/applications$/, view: ApplicationsSection },
    { path: /^\/applications\/(?<appId>\d+)\/sessions$/, view: SessionsSection },
    { path: /^\/candidates$/, view: CandidatesSection },
    { path: /^\/evaluations$/, view: EvaluationsSection }, 
    { path: /^\/sessions\/(?<sessionId>\d+)\/evaluation$/, view: EvaluationDetailSection },
    { path: /^\/pipeline\/runs\/(?<runId>\d+)$/, view: PipelineSection },
    { path: /^\/audit-logs$/, view: AuditSection },
    { path: /^\/auth$/, view: AuthSection }
];

export class Router {
    static currentView = null;

    static init() {
        window.addEventListener('hashchange', () => this.handleRoute());
        this.handleRoute(); 
    }

    static async handleRoute() {
        const rawHash = window.location.hash.replace('#', '') || '/';
        const [pathname, queryString] = rawHash.split('?');
        const path = pathname || '/';

        // AUTH GUARD
        const token = localStorage.getItem('access_token');
        if (!token && path !== '/auth') {
            window.location.hash = '/auth';
            return;
        }
        if (token && path === '/auth') {
            window.location.hash = '/dashboard';
            return;
        }

        // Find matching route
        let ViewClass = DashboardSection;
        let match = null;
        for (let route of routes) {
            match = path.match(route.path);
            if (match) {
                ViewClass = route.view;
                break;
            }
        }

        if (path === '/auth') {
            document.getElementById('navbar').style.display = 'none';
        } else {
            document.getElementById('navbar').style.display = 'flex';
            Navbar.render();
        }

        const appContent = document.getElementById('app-content');
        const loader = document.getElementById('global-loader');
        
        loader.style.display = 'flex';
        if (this.currentView && typeof this.currentView.destroy === 'function') {
            this.currentView.destroy();
        }
        this.currentView = null;
        appContent.innerHTML = ''; 

        try {
            // Pass route params and query params to the constructor if any
            const params = match && match.groups ? { ...match.groups } : {};
            if (queryString) {
                const searchParams = new URLSearchParams(queryString);
                for (const [key, value] of searchParams.entries()) {
                    params[key] = value;
                }
            }
            const view = new ViewClass(params);
            this.currentView = view;
            await view.fetchData();
            appContent.innerHTML = view.render();
            view.mount();
        } catch (error) {
            console.error('Routing Error:', error);
            appContent.innerHTML = `
                <div class="card" style="text-align: center; padding: 3rem;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: var(--danger); margin-bottom: 1rem;"></i>
                    <h2>${t('error')}</h2>
                    <p>${error.message}</p>
                </div>
            `;
        } finally {
            loader.style.display = 'none';
        }
    }
    
    static navigate(path) {
        window.location.hash = path;
    }
}
