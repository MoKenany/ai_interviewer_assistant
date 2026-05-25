import { Router } from './core/router.js';

const Theme = {
    key: 'theme',
    get() {
        return localStorage.getItem(this.key) || 'light';
    },
    apply(value) {
        const theme = value === 'dark' ? 'dark' : 'light';
        document.documentElement.dataset.theme = theme;
        document.documentElement.classList.toggle('dark-mode', theme === 'dark');
        localStorage.setItem(this.key, theme);
    },
    init() {
        this.apply(this.get());
    }
};

document.addEventListener('DOMContentLoaded', () => {
    Theme.init();

    // Initialize Router (which handles Navbar visibility)
    Router.init();

    // Listen for language changes to re-render active view
    window.addEventListener('languageChanged', () => {
        Router.handleRoute();
    });
});
