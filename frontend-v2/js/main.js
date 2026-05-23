import { Router } from './core/router.js';

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Router (which handles Navbar visibility)
    Router.init();

    // Listen for language changes to re-render active view
    window.addEventListener('languageChanged', () => {
        Router.handleRoute();
    });
});
