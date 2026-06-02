import { t, getLang } from '../core/i18n.js';
import { api } from '../core/api.js';
import { Toast } from '../components/Toast.js';
import { Navbar } from '../components/Navbar.js';

export class AuthSection {
    constructor() {
        this.mode = 'login';
        this.lang = getLang() || 'ar';
        this.showPassword = false;
    }

    async fetchData() { }

    _getLabels() {
        const isAr = this.lang === 'ar';
        return {
            loginTitle: isAr ? 'مرحباً بك مجدداً' : 'Welcome back',
            signupTitle: isAr ? 'إنشاء حساب جديد' : 'Create your account',
            loginSubtitle: isAr ? 'سجّل دخولك لمتابعة تقييم المرشحين' : 'Sign in to continue evaluating candidates',
            signupSubtitle: isAr ? 'انضم إلى المنصة الذكية لإدارة المقابلات' : 'Join the smart platform for AI-powered interviews',
            brandName: isAr ? 'منصة المقابلات الذكية' : 'AI Interview Platform',
            brandTagline: isAr ? 'رفيقك الذكي لتقييم دقيق' : 'Your AI companion for accurate evaluation',
            tabLogin: isAr ? 'تسجيل الدخول' : 'Sign in',
            tabSignup: isAr ? 'إنشاء حساب' : 'Create account',
            fullName: isAr ? 'الاسم الكامل' : 'Full name',
            email: isAr ? 'البريد الإلكتروني' : 'Email address',
            password: isAr ? 'كلمة المرور' : 'Password',
            confirmPassword: isAr ? 'تأكيد كلمة المرور' : 'Confirm password',
            loginBtn: isAr ? 'الدخول إلى المنصة' : 'Sign in to Platform',
            signupBtn: isAr ? 'إنشاء حسابي' : 'Create my account',
            toSignup: isAr ? 'ليس لديك حساب؟' : "Don't have an account?",
            toSignupLink: isAr ? 'سجّل مجاناً' : 'Sign up free',
            toLogin: isAr ? 'لديك حساب بالفعل؟' : 'Already have an account?',
            toLoginLink: isAr ? 'سجّل دخول' : 'Sign in',
            showPw: isAr ? 'إظهار' : 'Show',
            hidePw: isAr ? 'إخفاء' : 'Hide',
            placeholderName: isAr ? 'مثال: أحمد محمد' : 'e.g. John Doe',
            placeholderEmail: isAr ? 'name@company.com' : 'name@company.com',
            vNameRequired: isAr ? 'الاسم الكامل مطلوب' : 'Full name is required',
            vNameMin: isAr ? 'الاسم يجب أن يكون 3 أحرف على الأقل' : 'Name must be at least 3 characters',
            vEmailRequired: isAr ? 'البريد الإلكتروني مطلوب' : 'Email is required',
            vEmailInvalid: isAr ? 'صيغة البريد الإلكتروني غير صحيحة' : 'Invalid email address',
            vPasswordRequired: isAr ? 'كلمة المرور مطلوبة' : 'Password is required',
            vPasswordMin: isAr ? 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' : 'Password must be at least 8 characters',
            vPasswordWeak: isAr ? 'كلمة المرور ضعيفة — أضف أرقاماً أو رموزاً' : 'Weak password — add numbers or symbols',
            vConfirmRequired: isAr ? 'تأكيد كلمة المرور مطلوب' : 'Please confirm your password',
            vConfirmMismatch: isAr ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match',
            strengthWeak: isAr ? 'ضعيفة' : 'Weak',
            strengthFair: isAr ? 'مقبولة' : 'Fair',
            strengthGood: isAr ? 'جيدة' : 'Good',
            strengthStrong: isAr ? 'قوية' : 'Strong',
            visualHeading: isAr ? 'ارتقِ بعملية التوظيف باستخدام الذكاء الاصطناعي' : 'Elevate Hiring with AI',
            visualDesc: isAr ? 'قم بإجراء تقييمات صوتية دقيقة، استخرج نقاط القوة والضعف، واختر أفضل المرشحين لفريقك بكفاءة عالية.' : 'Conduct accurate audio evaluations, extract strengths and weaknesses, and choose the best candidates efficiently.'
        };
    }

    _passwordStrength(pw) {
        let s = 0;
        if (pw.length >= 8) s++;
        if (pw.length >= 12) s++;
        if (/[A-Z]/.test(pw)) s++;
        if (/[0-9]/.test(pw)) s++;
        if (/[^A-Za-z0-9]/.test(pw)) s++;
        if (s <= 1) return { level: 'weak', pct: 25, color: '#ef4444' };
        if (s === 2) return { level: 'fair', pct: 50, color: '#f97316' };
        if (s === 3) return { level: 'good', pct: 75, color: '#eab308' };
        return { level: 'strong', pct: 100, color: '#22c55e' };
    }

    _validate() {
        const L = this._getLabels();
        const isSignup = this.mode === 'signup';
        let ok = true;

        const clear = (id) => { const e = document.getElementById(id); if (e) { e.textContent = ''; e.style.display = 'none'; } };
        const err = (id, msg) => { const e = document.getElementById(id); if (e) { e.textContent = msg; e.style.display = 'block'; } ok = false; };

        clear('err-name'); clear('err-email'); clear('err-password'); clear('err-confirm');

        if (isSignup) {
            const name = (document.getElementById('auth-name')?.value || '').trim();
            if (!name) err('err-name', L.vNameRequired);
            else if (name.length < 3) err('err-name', L.vNameMin);
        }

        const email = (document.getElementById('auth-email')?.value || '').trim();
        if (!email) err('err-email', L.vEmailRequired);
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) err('err-email', L.vEmailInvalid);

        const pw = document.getElementById('auth-password')?.value || '';
        if (!pw) err('err-password', L.vPasswordRequired);
        else if (pw.length < 8) err('err-password', L.vPasswordMin);
        else if (isSignup && this._passwordStrength(pw).level === 'weak') err('err-password', L.vPasswordWeak);

        if (isSignup) {
            const cfm = document.getElementById('auth-confirm')?.value || '';
            if (!cfm) err('err-confirm', L.vConfirmRequired);
            else if (cfm !== pw) err('err-confirm', L.vConfirmMismatch);
        }

        return ok;
    }

    render() {
        const isAr = this.lang === 'ar';
        const dir = isAr ? 'rtl' : 'ltr';
        const L = this._getLabels();
        const start = isAr ? 'right' : 'left';
        const end = isAr ? 'left' : 'right';
        const currentTheme = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
        const themeIcon = currentTheme === 'dark' ? '☀️' : '🌙';
        const themeTitle = currentTheme === 'dark' ? (isAr ? 'الوضع الفاتح' : 'Light Mode') : (isAr ? 'الوضع الداكن' : 'Dark Mode');

        return `
        <style>
            /* Main Split Layout */
            .ai-split-layout {
                display: flex;
                height: 100vh;
                width: 100%;
                font-family: system-ui, -apple-system, sans-serif;
                direction: ${dir};
                background: var(--background-body);
                overflow: hidden; /* Prevent body scroll */
            }

            /* Visual Side (Left in LTR, Right in RTL) */
            .ai-visual-side {
                flex: 1.2;
                position: relative;
                overflow: hidden;
                display: flex;
                flex-direction: column;
                justify-content: center;
                padding: 4rem;
                color: #ffffff;
            }

            /* Background Image with Overlay */
            .ai-visual-side::before {
                content: '';
                position: absolute;
                inset: 0;
                background-image: url('https://images.unsplash.com/photo-1573164713988-8665fc963095?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80');
                background-size: cover;
                background-position: center;
                z-index: 0;
            }
            .ai-visual-side::after {
                content: '';
                position: absolute;
                inset: 0;
                background: linear-gradient(135deg, rgba(98, 234, 255, 0.9) 0%, rgba(0, 181, 153, 0.85) 100%);
                z-index: 1;
            }

            .ai-visual-content {
                position: relative;
                z-index: 2;
                max-width: 500px;
            }
            
            .ai-visual-icon {
                width: 72px;
                height: 72px;
                background: rgba(255, 255, 255, 0.15);
                backdrop-filter: blur(12px);
                border-radius: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                margin-bottom: 2rem;
                border: 1px solid rgba(255, 255, 255, 0.3);
                box-shadow: 0 8px 32px rgba(0,0,0,0.1);
            }
            .ai-visual-icon svg { width: 36px; height: 36px; fill: none; stroke: #fff; stroke-width: 2; }
            .ai-visual-heading { font-size: 2.75rem; font-weight: 800; line-height: 1.2; margin-bottom: 1.25rem; }
            .ai-visual-desc { font-size: 1.15rem; line-height: 1.7; opacity: 0.95; font-weight: 400; }

            /* Form Side - Structured with Flex Column to prevent overlap */
            .ai-form-side {
                width: 100%;
                max-width: 600px;
                display: flex;
                flex-direction: column;
                background: var(--surface-color);
                box-shadow: -10px 0 40px rgba(0,0,0,0.05);
                z-index: 10;
            }

            /* Dedicated Navbar Area */
            .ai-navbar {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 1.5rem 2.5rem;
                border-bottom: 1px solid var(--border-color);
                background: var(--surface-color);
            }

            .ai-brand-group {
                display: flex;
                flex-direction: column;
            }
            .ai-brand-name { font-size: 1.25rem; font-weight: 800; color: var(--text-main); }
            .ai-brand-tag { font-size: 0.8rem; color: var(--text-muted); }

            .ai-nav-controls {
                display: flex;
                gap: 8px;
                align-items: center;
            }
            .ai-lang-btn,
            .ai-theme-btn {
                padding: 6px 14px;
                border-radius: 8px;
                border: 1px solid var(--border-color);
                background: transparent;
                color: var(--text-muted);
                font-size: 12px;
                font-weight: 600;
                cursor: pointer;
                transition: all .2s;
            }
            .ai-lang-btn.active { background: var(--primary); color: #fff; border-color: var(--primary); }
            .ai-theme-btn:hover { background: var(--input-bg); color: var(--text-main); }

            /* Scrollable Form Body */
            .ai-form-body {
                flex: 1;
                overflow-y: auto;
                padding: 2.5rem;
                display: flex;
                flex-direction: column;
                justify-content: center;
            }

            /* Custom Scrollbar for form body */
            .ai-form-body::-webkit-scrollbar { width: 6px; }
            .ai-form-body::-webkit-scrollbar-track { background: transparent; }
            .ai-form-body::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 10px; }

            .ai-form-container {
                max-width: 420px;
                width: 100%;
                margin: 0 auto;
            }

            .ai-tab-row {
                display: flex;
                background: var(--input-bg);
                border-radius: 10px;
                padding: 4px;
                gap: 4px;
                margin-bottom: 2rem;
                border: 1px solid var(--border-color);
            }
            .ai-tab {
                flex: 1;
                padding: 0.75rem;
                border-radius: 8px;
                border: none;
                background: transparent;
                color: var(--text-muted);
                font-size: 0.95rem;
                font-weight: 700;
                cursor: pointer;
                transition: all .2s ease;
            }
            .ai-tab.active { background: var(--surface-color); color: var(--primary); box-shadow: 0 2px 8px rgba(0,0,0,0.05); }

            .ai-title { font-size: 1.85rem; font-weight: 800; color: var(--text-main); margin-bottom: 0.5rem; }
            .ai-subtitle { font-size: 0.95rem; color: var(--text-muted); margin-bottom: 2.5rem; }

            .ai-fgroup { margin-bottom: 1.25rem; }
            .ai-flabel {
                display: block;
                font-size: 0.85rem;
                font-weight: 600;
                color: var(--text-main);
                margin-bottom: 0.5rem;
            }
            
            .ai-input-wrap { position: relative; }
            .ai-input {
                width: 100%;
                padding: 0.85rem 1rem;
                background: var(--input-bg);
                border: 1px solid var(--border-color);
                border-radius: 10px;
                color: var(--text-main);
                font-size: 0.95rem;
                outline: none;
                transition: all .2s;
                box-sizing: border-box;
            }
            .ai-input:focus { border-color: var(--primary); background: var(--surface-color); box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.15); }
            
            .ai-pw-eye {
                position: absolute;
                top: 50%;
                ${end}: 12px;
                transform: translateY(-50%);
                background: none;
                border: none;
                cursor: pointer;
                font-size: 0.8rem;
                font-weight: 700;
                color: var(--primary);
                padding: 4px;
            }

            .ai-ferr { display: none; font-size: 0.8rem; color: #ef4444; margin-top: 0.4rem; font-weight: 500; }
            
            .ai-sbar { margin-top: 0.6rem; height: 4px; background: var(--border-color); border-radius: 99px; overflow: hidden; }
            .ai-sbar-fill { height: 100%; border-radius: 99px; transition: width .3s ease, background .3s ease; }
            .ai-slabel { font-size: 0.75rem; margin-top: 4px; font-weight: 600; }

            .ai-submit-btn {
                width: 100%;
                padding: 1rem;
                border-radius: 10px;
                border: none;
                background: var(--primary);
                color: #ffffff;
                font-size: 1.05rem;
                font-weight: 700;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
                margin-top: 1.5rem;
                transition: all .2s;
                box-shadow: 0 4px 12px rgba(79, 70, 229, 0.2);
            }
            .ai-submit-btn:hover { background: var(--primary-hover); transform: translateY(-1px); box-shadow: 0 6px 16px rgba(79, 70, 229, 0.3); }
            .ai-submit-btn:disabled { opacity: 0.7; cursor: not-allowed; transform: none; box-shadow: none; }
            .ai-submit-btn svg { width: 22px; height: 22px; stroke: #fff; fill: none; stroke-width: 2.2; }

            .ai-footer { text-align: center; margin-top: 2rem; font-size: 0.9rem; color: var(--text-muted); }
            .ai-footer a { color: var(--primary); font-weight: 700; text-decoration: none; margin-${start}: 4px; transition: color .2s; }
            .ai-footer a:hover { color: var(--primary-hover); text-decoration: underline; }

            /* Responsive Design */
            @media (max-width: 900px) {
                .ai-split-layout { flex-direction: column; overflow: auto; }
                .ai-visual-side { display: none; } /* Hide visual side on small screens entirely for better UX */
                .ai-form-side { max-width: 100%; box-shadow: none; height: 100vh; }
                .ai-form-body { padding: 1.5rem; }
            }
        </style>

        <div class="ai-split-layout">
            
            <div class="ai-visual-side">
                <div class="ai-visual-content">
                    <div class="ai-visual-icon">
                        <svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path>
                            <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                            <line x1="12" y1="19" x2="12" y2="23"></line>
                            <line x1="8" y1="23" x2="16" y2="23"></line>
                        </svg>
                    </div>
                    <h1 class="ai-visual-heading">${L.visualHeading}</h1>
                    <p class="ai-visual-desc">${L.visualDesc}</p>
                </div>
            </div>

            <div class="ai-form-side">
                <nav class="ai-navbar">
                    <div class="ai-brand-group">
                        <div class="ai-brand-name">${L.brandName}</div>
                        <div class="ai-brand-tag">${L.brandTagline}</div>
                    </div>
                    <div class="ai-nav-controls">
                        <button class="ai-lang-btn ${this.lang === 'ar' ? 'active' : ''}" id="lang-ar">عربي</button>
                        <button class="ai-lang-btn ${this.lang === 'en' ? 'active' : ''}" id="lang-en">EN</button>
                        <button class="ai-theme-btn" id="theme-toggle-btn" title="${themeTitle}">${themeIcon}</button>
                    </div>
                </nav>

                <div class="ai-form-body">
                    <div class="ai-form-container">
                        <div class="ai-tab-row">
                            <button class="ai-tab ${this.mode === 'login' ? 'active' : ''}" id="tab-login">${L.tabLogin}</button>
                            <button class="ai-tab ${this.mode === 'signup' ? 'active' : ''}" id="tab-signup">${L.tabSignup}</button>
                        </div>

                        <div class="ai-title">${this.mode === 'login' ? L.loginTitle : L.signupTitle}</div>
                        <div class="ai-subtitle">${this.mode === 'login' ? L.loginSubtitle : L.signupSubtitle}</div>

                        <form id="auth-form" novalidate autocomplete="off">
                            <input style="display:none" type="text" name="fakeusernameremembered"/>
                            <input style="display:none" type="password" name="fakepasswordremembered"/>

                            ${this.mode === 'signup' ? `
                            <div class="ai-fgroup">
                                <label class="ai-flabel" for="auth-name">${L.fullName}</label>
                                <div class="ai-input-wrap">
                                    <input class="ai-input" type="text" id="auth-name" autocomplete="off" placeholder="${L.placeholderName}">
                                </div>
                                <span class="ai-ferr" id="err-name"></span>
                            </div>
                            ` : ''}

                            <div class="ai-fgroup">
                                <label class="ai-flabel" for="auth-email">${L.email}</label>
                                <div class="ai-input-wrap">
                                    <input class="ai-input" type="email" id="auth-email" autocomplete="off" placeholder="${L.placeholderEmail}">
                                </div>
                                <span class="ai-ferr" id="err-email"></span>
                            </div>

                            <div class="ai-fgroup">
                                <label class="ai-flabel" for="auth-password">${L.password}</label>
                                <div class="ai-input-wrap">
                                    <input class="ai-input" type="password" id="auth-password"
                                        autocomplete="new-password"
                                        placeholder="••••••••">
                                    <button type="button" class="ai-pw-eye" id="toggle-pw">${L.showPw}</button>
                                </div>
                                <span class="ai-ferr" id="err-password"></span>
                                ${this.mode === 'signup' ? `
                                <div class="ai-sbar" id="sbar" style="display:none;">
                                    <div class="ai-sbar-fill" id="sbar-fill" style="width:0%"></div>
                                </div>
                                <div class="ai-slabel" id="sbar-label"></div>
                                ` : ''}
                            </div>

                            ${this.mode === 'signup' ? `
                            <div class="ai-fgroup">
                                <label class="ai-flabel" for="auth-confirm">${L.confirmPassword}</label>
                                <div class="ai-input-wrap">
                                    <input class="ai-input" type="password" id="auth-confirm" autocomplete="new-password" placeholder="••••••••">
                                </div>
                                <span class="ai-ferr" id="err-confirm"></span>
                            </div>
                            ` : ''}

                            <button type="submit" id="auth-btn" class="ai-submit-btn">
                                ${this.mode === 'login' ? L.loginBtn : L.signupBtn}
                                <svg viewBox="0 0 24 24">
                                    ${this.mode === 'login'
                ? '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>'
                : '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>'
            }
                                </svg>
                            </button>
                        </form>

                        <div class="ai-footer">
                            ${this.mode === 'login' ? L.toSignup : L.toLogin}
                            <a href="#" id="toggle-mode">${this.mode === 'login' ? L.toSignupLink : L.toLoginLink}</a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        `;
    }

    _rerender() {
        document.getElementById('app-content').innerHTML = this.render();
        this.mount();
    }

    mount() {
        const L = this._getLabels();

        // Language Controls
        const langAr = document.getElementById('lang-ar');
        if (langAr) {
            langAr.removeEventListener('click', langAr._langArHandler);
            langAr._langArHandler = () => {
                if (this.lang !== 'ar') { this.lang = 'ar'; this._rerender(); }
            };
            langAr.addEventListener('click', langAr._langArHandler);
        }

        const langEn = document.getElementById('lang-en');
        if (langEn) {
            langEn.removeEventListener('click', langEn._langEnHandler);
            langEn._langEnHandler = () => {
                if (this.lang !== 'en') { this.lang = 'en'; this._rerender(); }
            };
            langEn.addEventListener('click', langEn._langEnHandler);
        }

        // Tab Controls
        const tabLogin = document.getElementById('tab-login');
        if (tabLogin) {
            tabLogin.removeEventListener('click', tabLogin._tabLoginHandler);
            tabLogin._tabLoginHandler = () => {
                if (this.mode !== 'login') { this.mode = 'login'; this._rerender(); }
            };
            tabLogin.addEventListener('click', tabLogin._tabLoginHandler);
        }

        const tabSignup = document.getElementById('tab-signup');
        if (tabSignup) {
            tabSignup.removeEventListener('click', tabSignup._tabSignupHandler);
            tabSignup._tabSignupHandler = () => {
                if (this.mode !== 'signup') { this.mode = 'signup'; this._rerender(); }
            };
            tabSignup.addEventListener('click', tabSignup._tabSignupHandler);
        }

        // Toggle mode link in footer
        const toggleMode = document.getElementById('toggle-mode');
        if (toggleMode) {
            toggleMode.removeEventListener('click', toggleMode._toggleModeHandler);
            toggleMode._toggleModeHandler = (e) => {
                e.preventDefault();
                this.mode = this.mode === 'login' ? 'signup' : 'login';
                this._rerender();
            };
            toggleMode.addEventListener('click', toggleMode._toggleModeHandler);
        }

        // Theme Toggle
        const themeToggle = document.getElementById('theme-toggle-btn');
        if (themeToggle) {
            themeToggle.removeEventListener('click', themeToggle._toggleHandler);
            themeToggle._toggleHandler = () => {
                const currentTheme = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
                const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
                document.documentElement.dataset.theme = nextTheme;
                document.documentElement.classList.toggle('dark-mode', nextTheme === 'dark');
                localStorage.setItem('theme', nextTheme);
                this._rerender();
            };
            themeToggle.addEventListener('click', themeToggle._toggleHandler);
        }

        // Strict Autofill Clearer
        const emailInput = document.getElementById('auth-email');
        const passwordInput = document.getElementById('auth-password');
        const confirmInput = document.getElementById('auth-confirm');
        const clearAuthFill = () => {
            if (emailInput) emailInput.value = '';
            if (passwordInput) passwordInput.value = '';
            if (confirmInput) confirmInput.value = '';
        };
        // Reset form completely on mount to fight stubborn browsers
        document.getElementById('auth-form')?.reset();
        clearAuthFill();
        window.setTimeout(clearAuthFill, 150);

        // Show / Hide Password Logic
        const pwInput = passwordInput;
        const pwEye = document.getElementById('toggle-pw');
        if (pwEye) {
            pwEye.removeEventListener('click', pwEye._togglePwHandler);
            pwEye._togglePwHandler = () => {
                this.showPassword = !this.showPassword;
                pwInput.type = this.showPassword ? 'text' : 'password';
                pwEye.textContent = this.showPassword ? L.hidePw : L.showPw;
            };
            pwEye.addEventListener('click', pwEye._togglePwHandler);
        }

        // Password Strength & Match Validation (Signup Mode)
        if (this.mode === 'signup') {
            const strengthText = { weak: L.strengthWeak, fair: L.strengthFair, good: L.strengthGood, strong: L.strengthStrong };
            if (pwInput) {
                pwInput.removeEventListener('input', pwInput._strengthHandler);
                pwInput._strengthHandler = () => {
                    const val = pwInput.value;
                    const bar = document.getElementById('sbar');
                    const fill = document.getElementById('sbar-fill');
                    const lbl = document.getElementById('sbar-label');
                    if (!val) { bar.style.display = 'none'; lbl.textContent = ''; return; }
                    bar.style.display = 'block';
                    const s = this._passwordStrength(val);
                    fill.style.width = s.pct + '%';
                    fill.style.background = s.color;
                    lbl.textContent = strengthText[s.level];
                    lbl.style.color = s.color;
                };
                pwInput.addEventListener('input', pwInput._strengthHandler);
            }

            if (confirmInput) {
                confirmInput.removeEventListener('input', confirmInput._matchHandler);
                confirmInput._matchHandler = () => {
                    const pw = pwInput?.value || '';
                    const cfm = confirmInput?.value || '';
                    const el = document.getElementById('err-confirm');
                    if (!el) return;
                    if (cfm && cfm !== pw) { el.textContent = L.vConfirmMismatch; el.style.display = 'block'; }
                    else { el.textContent = ''; el.style.display = 'none'; }
                };
                confirmInput.addEventListener('input', confirmInput._matchHandler);
            }
        }

        // Email Validation on blur
        if (emailInput) {
            emailInput.removeEventListener('blur', emailInput._blurHandler);
            emailInput._blurHandler = () => {
                const val = (emailInput?.value || '').trim();
                const el = document.getElementById('err-email');
                if (!el) return;
                if (!val) { el.textContent = L.vEmailRequired; el.style.display = 'block'; }
                else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) { el.textContent = L.vEmailInvalid; el.style.display = 'block'; }
                else { el.textContent = ''; el.style.display = 'none'; }
            };
            emailInput.addEventListener('blur', emailInput._blurHandler);
        }

        // Form Submission
        const authForm = document.getElementById('auth-form');
        if (authForm) {
            authForm.removeEventListener('submit', authForm._submitHandler);
            authForm._submitHandler = async (e) => {
                e.preventDefault();
                if (!this._validate()) return;

                const email = document.getElementById('auth-email').value.trim();
                const password = document.getElementById('auth-password').value;
                const fullName = this.mode === 'signup'
                    ? (document.getElementById('auth-name')?.value || '').trim()
                    : '';

                const btn = document.getElementById('auth-btn');
                const origHTML = btn.innerHTML;
                btn.innerHTML = `<svg viewBox="0 0 24 24" style="width:22px;height:22px;stroke:#fff;fill:none;stroke-width:2;animation:ai-spin 1s linear infinite"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>`;
                btn.disabled = true;

                if (!document.getElementById('ai-spin-style')) {
                    const s = document.createElement('style');
                    s.id = 'ai-spin-style';
                    s.textContent = '@keyframes ai-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }';
                    document.head.appendChild(s);
                }

                try {
                    if (this.mode === 'signup') {
                        await api.post('/auth/register', {
                            email,
                            password,
                            full_name: fullName,
                            role: 'hr',
                        });
                        Toast.show(this.lang === 'ar' ? 'تم إنشاء الحساب! سجّل دخولك الآن.' : 'Account created! Please sign in.', 'success');
                        this.mode = 'login';
                        this._rerender();
                    } else {
                        const data = await api.post('/auth/login', { email, password });
                        localStorage.setItem('access_token', data.access_token);
                        try {
                            const me = await api.get('/auth/me');
                            localStorage.setItem('user_info', JSON.stringify(me));
                        } catch (e) {
                            console.error('Failed to fetch user info after login:', e);
                        }
                        Toast.show(this.lang === 'ar' ? 'تم تسجيل الدخول بنجاح' : 'Welcome back!', 'success');
                        window.location.hash = '/dashboard';
                    }
                } catch (err) {
                    Toast.show(err.message, 'error');
                    btn.innerHTML = origHTML;
                    btn.disabled = false;
                }
            };
            authForm.addEventListener('submit', authForm._submitHandler);
        }
    }
}