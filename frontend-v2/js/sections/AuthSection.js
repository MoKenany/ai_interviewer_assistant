import { t, getLang } from '../core/i18n.js';
import { api } from '../core/api.js';
import { Toast } from '../components/Toast.js';
import { Navbar } from '../components/Navbar.js';

export class AuthSection {
    constructor() {
        this.mode = 'login'; // 'login' or 'signup'
    }

    async fetchData() {}

    render() {
        const isAr = getLang() === 'ar';
        
        const labels = {
            loginTitle: isAr ? "مرحباً بك مجدداً" : "Welcome Back",
            signupTitle: isAr ? "إنشاء حساب جديد" : "Create Account",
            loginSubtitle: isAr ? "أدخل بيانات اعتمادك للوصول إلى المنصة" : "Enter your credentials to access the platform",
            signupSubtitle: isAr ? "سجل الآن للبدء في استخدام المنصة" : "Register to get started",
            fullName: isAr ? "الاسم الكامل" : "Full Name",
            email: isAr ? "البريد الإلكتروني" : "Email",
            password: isAr ? "كلمة المرور" : "Password",
            loginBtn: isAr ? "تسجيل الدخول" : "Login",
            signupBtn: isAr ? "إنشاء حساب" : "Sign Up",
            toSignup: isAr ? "ليس لديك حساب؟ سجل الآن" : "Don't have an account? Sign Up",
            toLogin: isAr ? "لديك حساب بالفعل؟ سجل دخول" : "Already have an account? Login",
            placeholderName: isAr ? "علي أحمد" : "John Doe",
            placeholderEmail: isAr ? "admin@example.com" : "admin@example.com"
        };

        return `
            <div style="display: flex; justify-content: center; align-items: center; min-height: 80vh;">
                <div class="card" style="width: 100%; max-width: 400px; padding: 2.5rem;">
                    <div style="text-align: center; margin-bottom: 2rem;">
                        <i class="fas fa-brain" style="font-size: 3rem; color: var(--primary-color); margin-bottom: 1rem;"></i>
                        <h2 id="auth-title">${this.mode === 'login' ? labels.loginTitle : labels.signupTitle}</h2>
                        <p style="color: var(--text-muted); margin-top: 0.5rem;" id="auth-subtitle">
                            ${this.mode === 'login' ? labels.loginSubtitle : labels.signupSubtitle}
                        </p>
                    </div>

                    <form id="auth-form">
                        ${this.mode === 'signup' ? `
                            <div class="form-group">
                                <label class="form-label">${labels.fullName}</label>
                                <input type="text" id="auth-name" class="form-control" required placeholder="${labels.placeholderName}">
                            </div>
                        ` : ''}
                        <div class="form-group">
                            <label class="form-label">${labels.email}</label>
                            <input type="email" id="auth-email" class="form-control" required placeholder="${labels.placeholderEmail}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">${labels.password}</label>
                            <input type="password" id="auth-password" class="form-control" required placeholder="••••••••">
                        </div>
                        
                        <button type="submit" id="auth-btn" class="btn btn-primary" style="width: 100%; margin-top: 1rem; padding: 0.8rem;">
                            ${this.mode === 'login' ? labels.loginBtn : labels.signupBtn}
                        </button>
                    </form>

                    <div style="text-align: center; margin-top: 1.5rem; font-size: 0.9rem;">
                        <a href="#" id="toggle-mode" style="color: var(--primary-color); text-decoration: none;">
                            ${this.mode === 'login' ? labels.toSignup : labels.toLogin}
                        </a>
                    </div>
                </div>
            </div>
        `;
    }

    mount() {
        document.getElementById('toggle-mode').addEventListener('click', (e) => {
            e.preventDefault();
            this.mode = this.mode === 'login' ? 'signup' : 'login';
            document.getElementById('app-content').innerHTML = this.render();
            this.mount();
        });

        document.getElementById('auth-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('auth-email').value;
            const password = document.getElementById('auth-password').value;
            let fullName = '';
            
            if (this.mode === 'signup') {
                fullName = document.getElementById('auth-name').value;
            }
            
            const btn = document.getElementById('auth-btn');
            const origText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            btn.disabled = true;

            try {
                if (this.mode === 'signup') {
                    // Register Request
                    await api.post('/auth/register', {
                        email: email,
                        password: password,
                        full_name: fullName,
                        role: 'hr' // default
                    });
                    Toast.show('Account created! Please login.', 'success');
                    this.mode = 'login';
                    document.getElementById('app-content').innerHTML = this.render();
                    this.mount();
                } else {
                    // Login Request (JSON based on schemas/auth.py LoginRequest)
                    const data = await api.post('/auth/login', {
                        email: email,
                        password: password
                    });
                    localStorage.setItem('access_token', data.access_token);
                    // Fetch current user profile and store for Navbar
                    try {
                        const me = await api.get('/auth/me');
                        localStorage.setItem('user_info', JSON.stringify(me));
                    } catch(_) {}
                    Toast.show('Login successful', 'success');
                    window.location.hash = '/dashboard';
                }
            } catch (err) {
                Toast.show(err.message, 'error');
                btn.innerHTML = origText;
                btn.disabled = false;
            }
        });
    }
}
