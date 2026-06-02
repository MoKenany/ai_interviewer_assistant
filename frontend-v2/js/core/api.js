const API_BASE = window.__API_BASE__ || '/api/v1';

// Optional in-memory cache for GET requests. Dynamic pages should fetch fresh data by default.
const requestCache = new Map();
const CACHE_DURATION = 60000; // 1 minute cache by default

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

    // Clear cache for a specific endpoint or all
    clearCache(endpoint = null) {
        if (endpoint) {
            requestCache.delete(endpoint);
        } else {
            requestCache.clear();
        }
    },

    clearCacheByPrefix(prefix) {
        if (!prefix) return;
        for (const key of requestCache.keys()) {
            if (key === prefix || key.startsWith(`${prefix}?`) || key.startsWith(`${prefix}/`)) {
                requestCache.delete(key);
            }
        }
    },

    async fetch(endpoint, options = {}) {
        return this._fetchWithAuthRetry(endpoint, options, true);
    },

    async _fetchWithAuthRetry(endpoint, options = {}, allowRefresh = true) {
        const { silent = false, cache = false, cacheTime = CACHE_DURATION, ...fetchOptions } = options;

        // Check cache for GET requests
        if (fetchOptions.method === 'GET' && cache) {
            const cacheKey = `${endpoint}`;
            if (requestCache.has(cacheKey)) {
                const cached = requestCache.get(cacheKey);
                if (Date.now() - cached.timestamp < cacheTime) {
                    return cached.data;
                } else {
                    requestCache.delete(cacheKey);
                }
            }
        }

        let token = null;

        try {
            token = localStorage.getItem('access_token');
        } catch (storageErr) {
            console.warn('Local storage is unavailable:', storageErr);
        }

        const isFormData = fetchOptions.body instanceof FormData;
        const headers = {
            ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            ...(fetchOptions.headers || {})
        };

        if (isFormData) {
            delete headers['Content-Type'];
        }

      // التعديل هنا:
        const bodyToLog = fetchOptions.body instanceof FormData 
            ? '[FormData Object]' 
            : (fetchOptions.body ? JSON.parse(fetchOptions.body) : '');

        console.log(`[API] ${fetchOptions.method || 'GET'} ${endpoint}`, bodyToLog);

        try {
            const response = await fetch(`${API_BASE}${endpoint}`, {
                ...fetchOptions,
                headers
            });

            const contentType = response.headers.get('content-type') || '';
            const textResponse = await response.text();

            // Safely parse JSON to prevent crashes on 204 No Content or empty bodies
            let data = textResponse;
            if (textResponse && contentType.includes('application/json')) {
                try {
                    data = JSON.parse(textResponse);
                } catch (parseErr) {
                    console.warn(`Failed to parse JSON for ${endpoint}`, parseErr);
                }
            }

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
                const message = detail.message || detail.error || (typeof detail === 'string' ? detail : 'API Error');
                const errorType = detail.error_type || 'api_error';
                throw new APIError(message, errorType, response.status, detail);
            }

            // Cache successful GET responses
            if (fetchOptions.method === 'GET' && cache) {
                const cacheKey = `${endpoint}`;
                requestCache.set(cacheKey, { data, timestamp: Date.now() });
            }

            if (fetchOptions.method && fetchOptions.method !== 'GET') {
                this._clearRelatedCache(endpoint);
            }

            return data;
        } catch (error) {
            if (!silent) {
                console.error(`API Fetch Error [${endpoint}]:`, error);
            }
            throw error;
        }
    },

    async refreshToken(token = null) {
        if (token === null) {
            try {
                token = localStorage.getItem('access_token');
            } catch (storageErr) {
                console.warn('Local storage is unavailable:', storageErr);
                return false;
            }
        }

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
                    try {
                        localStorage.setItem('access_token', data.access_token);
                    } catch (storageErr) {
                        console.warn('Local storage is unavailable:', storageErr);
                    }
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
        try {
            localStorage.removeItem('access_token');
        } catch (storageErr) {
            console.warn('Local storage is unavailable:', storageErr);
        }
        window.location.hash = '#/login';
    },

    async get(endpoint, params = null, options = {}) {
        if (params && typeof params === 'object') {
            const searchParams = new URLSearchParams();
            Object.entries(params).forEach(([k, v]) => {
                if (v !== null && v !== undefined && v !== '') {
                    searchParams.append(k, v);
                }
            });
            const query = searchParams.toString();
            if (query) endpoint = `${endpoint}?${query}`;
        }
        return this.fetch(endpoint, { method: 'GET', cache: options.cache === true, ...options });
    },

    async post(endpoint, body, options = {}) {
        // Clear related cache entries on successful POST
        const result = await this.fetch(endpoint, {
            method: 'POST',
            body: body instanceof FormData ? body : JSON.stringify(body),
            ...options
        });
        this._clearRelatedCache(endpoint);
        return result;
    },

    async patch(endpoint, body, options = {}) {
        // Clear related cache entries on successful PATCH
        const result = await this.fetch(endpoint, {
            method: 'PATCH',
            body: body instanceof FormData ? body : JSON.stringify(body),
            ...options
        });
        this._clearRelatedCache(endpoint);
        return result;
    },

    async delete(endpoint, options = {}) {
        // Clear related cache entries on successful DELETE
        const result = await this.fetch(endpoint, {
            method: 'DELETE',
            ...options
        });
        this._clearRelatedCache(endpoint);
        return result;
    },

    _clearRelatedCache(endpoint) {
        const path = String(endpoint || '').split('?')[0];
        this.clearCache(endpoint);
        this.clearCache(path);

        const firstSegment = path.match(/^\/[^/]+/)?.[0];
        if (firstSegment) {
            this.clearCacheByPrefix(firstSegment);
        }

        if (path.includes('/jobs')) {
            this.clearCacheByPrefix('/jobs');
            this.clearCacheByPrefix('/applications');
            this.clearCacheByPrefix('/candidates');
            this.clearCache('/jobs/summary');
        }
        if (path.includes('/applications')) {
            this.clearCacheByPrefix('/applications');
            this.clearCacheByPrefix('/sessions');
            this.clearCacheByPrefix('/candidates');
        }
        if (path.includes('/sessions')) {
            this.clearCacheByPrefix('/sessions');
            this.clearCacheByPrefix('/applications');
            this.clearCacheByPrefix('/evaluations');
            this.clearCacheByPrefix('/candidates/organized');
        }
        if (path.includes('/candidates')) {
            this.clearCacheByPrefix('/candidates');
            this.clearCacheByPrefix('/applications');
        }
    }
};
