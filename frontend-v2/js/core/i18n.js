export const translations = {
    ar: {
        title: "منصة المقابلات الذكية",
        dashboard: "لوحة التحكم",
        jobs: "الوظائف",
        candidates: "المرشحين",
        applications: "التقديمات",
        sessions: "الجلسات",
        evaluations: "التقييمات",
        login: "تسجيل الدخول",
        logout: "تسجيل الخروج",
        loading: "جاري التحميل...",
        error: "حدث خطأ!",
        switchLang: "English",
        welcome: "مرحباً بك في منصة المقابلات المدعومة بالذكاء الاصطناعي",
        noData: "لا توجد بيانات متاحة حالياً"
    },
    en: {
        title: "AI Interview Platform",
        dashboard: "Dashboard",
        jobs: "Jobs",
        candidates: "Candidates",
        applications: "Applications",
        sessions: "Sessions",
        evaluations: "Evaluations",
        login: "Login",
        logout: "Logout",
        loading: "Loading...",
        error: "An error occurred!",
        switchLang: "العربية",
        welcome: "Welcome to the AI-powered Interview Platform",
        noData: "No data available at the moment"
    }
};

let currentLang = localStorage.getItem('app_lang') || 'ar';

export function getLang() {
    return currentLang;
}

export function setLang(lang) {
    currentLang = lang;
    localStorage.setItem('app_lang', lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.title = t('title');
    window.dispatchEvent(new Event('languageChanged'));
}

export function t(key) {
    return translations[currentLang][key] || key;
}

// Initial setup
setLang(currentLang);
