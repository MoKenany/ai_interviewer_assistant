const API_BASE = 'http://127.0.0.1:8000/api/v1';

export class APIError extends Error {
    constructor(message, errorType = 'api_error', status = 0, details = null) {
        super(message);
        this.name = 'APIError';
        this.errorType = errorType;
        this.status = status;
        this.details = details;
    }
}

export const api = {
    _refreshPromise: null,

    async fetch(endpoint, options = {}) {
        return this._fetchWithAuthRetry(endpoint, options, true);
    },

    async _fetchWithAuthRetry(endpoint, options = {}, allowRefresh = true) {
        const token = localStorage.getItem('access_token');
        const isFormData = options.body instanceof FormData;
        const headers = {
            ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            ...(options.headers || {})
        };
        if (isFormData) {
            delete headers['Content-Type'];
        }

        try {
            const response = await fetch(`${API_BASE}${endpoint}`, {
                ...options,
                headers
            });
            
            const contentType = response.headers.get('content-type') || '';
            const data = contentType.includes('application/json')
                ? await response.json()
                : await response.text();

            if (response.status === 401) {
                if (allowRefresh && token && !endpoint.startsWith('/auth/')) {
                    const refreshed = await this.refreshToken(token);
                    if (refreshed) {
                        return this._fetchWithAuthRetry(endpoint, options, false);
                    }
                }
                this.clearAuth();
                throw new APIError('Unauthorized', 'unauthorized', 401, data);
            }

            if (!response.ok) {
                const detail = data?.detail || data || {};
                const message = detail.message || detail.error || detail || 'API Error';
                const errorType = detail.error_type || 'api_error';
                throw new APIError(message, errorType, response.status, detail);
            }
            
            return data;
        } catch (error) {
            console.error(`API Fetch Error [${endpoint}]:`, error);
            throw error;
        }
    },

    async refreshToken(token = localStorage.getItem('access_token')) {
        if (!token) return false;
        if (!this._refreshPromise) {
            this._refreshPromise = fetch(`${API_BASE}/auth/refresh`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            })
                .then(async (response) => {
                    if (!response.ok) return false;
                    const data = await response.json();
                    if (!data?.access_token) return false;
                    localStorage.setItem('access_token', data.access_token);
                    return true;
                })
                .catch(() => false)
                .finally(() => {
                    this._refreshPromise = null;
                });
        }
        return this._refreshPromise;
    },

    clearAuth() {
        localStorage.removeItem('access_token');
        window.location.hash = '#/login';
    },

    async get(endpoint) {
        return this.fetch(endpoint, { method: 'GET' });
    },

    async post(endpoint, body) {
        return this.fetch(endpoint, {
            method: 'POST',
            body: body instanceof FormData ? body : JSON.stringify(body)
        });
    },

    async patch(endpoint, body) {
        return this.fetch(endpoint, {
            method: 'PATCH',
            body: JSON.stringify(body)
        });
    },

    async delete(endpoint) {
        return this.fetch(endpoint, {
            method: 'DELETE'
        });
    }
};
