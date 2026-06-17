# 🚀 AI Interview Platform - Startup Guide | دليل البدء السريع

Welcome to the **AI Interview Platform** setup guide. This document provides step-by-step instructions to configure and run the entire ecosystem from scratch.

أهلاً بك في دليل تشغيل **منصة المقابلات الشخصية بالذكاء الاصطناعي**. يوضح هذا الملف الخطوات التفصيلية لإعداد وتشغيل النظام بالكامل من الصفر.

---

## 📌 Prerequisites | المتطلبات الأساسية

Before you begin, ensure you have the following installed on your machine:
قبل البدء، تأكد من تثبيت الأدوات التالية على جهازك:

1. **Python 3.10+** (Added to your System PATH).
2. **PostgreSQL** (Installed and running, default user: `postgres`, default password: `admin123`).
3. **FFmpeg** (Crucial for audio/video processing and transcription. Must be added to your system PATH).
4. **Active Internet Connection** (For downloading python packages and the native Redis binary).

---

## 🛠️ Step-by-Step Installation | خطوات التثبيت بالتفصيل

### Step 1: Create Virtual Environment | إنشاء البيئة الافتراضية
Create a clean Python virtual environment at the project root directory:
قم بإنشاء بيئة عمل افتراضية نظيفة في المجلد الرئيسي للمشروع:

```bash
# From the project root directory / من المجلد الرئيسي للمشروع
python -m venv venv
```

### Step 2: Activate Virtual Environment | تفعيل البيئة الافتراضية
Activate the virtual environment depending on your operating system:
قم بتفعيل البيئة الافتراضية بناءً على نظام التشغيل الخاص بك:

* **Windows (PowerShell):**
  ```powershell
  .\venv\Scripts\Activate.ps1
  ```
* **Windows (CMD):**
  ```cmd
  .\venv\Scripts\activate.bat
  ```
* **Linux / macOS:**
  ```bash
  source venv/bin/activate
  ```

### Step 3: Install Dependencies | تثبيت المكتبات البرمجية
Install all required packages from `requirements.txt`:
قم بتثبيت كافة المكتبات والاعتمادات المطلوبة للمشروع:

```bash
pip install -r requirements.txt
```
> [!NOTE]
> On Windows, if installing database adapters fails, make sure you have `psycopg2-binary` installed:
> في نظام ويندوز، إذا واجهتك مشكلة في تثبيت تعريف قاعدة البيانات، قم بتشغيل: `pip install psycopg2-binary`

### Step 4: Environment Variables Setup | إعداد ملف البيئة
1. Navigate to the backend directory:
   اذهب لمجلد الباك إند:
   ```bash
   cd interview-platform
   ```
2. Copy `.env.example` to `.env`:
   قم بنسخ ملف الإعدادات التجريبي:
   ```bash
   cp .env.example .env
   ```
3. Open `.env` and configure your API keys and database parameters:
   افتح ملف `.env` وقم بإعداد مفاتيح الاتصال وقاعدة البيانات:
   ```env
   # Database (PostgreSQL URL)
   DATABASE_URL=postgresql+asyncpg://postgres:admin123@localhost:5432/ai_interview_db

   # Groq & Gemini API Keys
   GROQ_API_KEY=gsk_your_groq_key_here
   GEMINI_API_KEY=your_gemini_key_here
   ```

### Step 5: Initialize the Database | تهيئة قاعدة البيانات والملفات
We have prepared a automated script `setup_db.py` to handle all SQL configurations. Run this script inside the `interview-platform/` directory:
لقد قمنا بإعداد سكربت تلقائي لتهيئة قاعدة البيانات وإنشاء الجداول والملفات. قم بتشغيله من داخل مجلد `interview-platform`:

```bash
python setup_db.py
```
**What this script does under the hood (ما يفعله السكربت تلقائياً):**
1. Connects to PostgreSQL and creates the database `ai_interview_db` if it doesn't exist.
2. Creates storage directories for media uploads (`storage/uploads/audio`, `storage/uploads/videos`, etc.).
3. Runs all Alembic migrations (`alembic upgrade head`) to construct tables.

### Step 6: Seed Default Data (Optional) | إدخال بيانات تجريبية
To populate the database with ready-to-use jobs and evaluation criteria:
لإدخال معايير تقييم ووظائف افتراضية في قاعدة البيانات لتجربة المنصة فوراً:

```bash
python seed_db.py
```

---

## 🚀 Running the Application | تشغيل المنصة

### The Recommended/Automatic Way (Windows) | الطريقة التلقائية الموصى بها
Inside the `interview-platform/` directory, simply run:
من داخل مجلد `interview-platform/` قم بتشغيل الأمر التالي فقط:

```bash
python run.py
```
*(Or double-click the `start_all.bat` launcher)*

**How this single command orchestrates everything (كيف يقوم هذا الأمر بتشغيل كل شيء):**
- **Redis Auto-Setup**: If Redis is missing, it runs `setup_redis.py` to automatically download and extract native Windows Redis 5.0.14 into your project directory.
- **Service Launcher**:
  1. Launches **Redis Server** in a separate command window.
  2. Launches **Celery Background Worker** (with pool=solo) in a separate command window.
  3. Launches the **FastAPI web server** locally on `http://127.0.0.1:8000`.

---

## 🌐 Accessing the App | روابط الوصول للمنصة

Once started, the platform serves both the frontend client and the backend APIs:
بمجرد التشغيل، ستقوم المنصة بتقديم واجهة المستخدم البرمجية والـ APIs معاً:

| Service | Address | Description |
| :--- | :--- | :--- |
| **Web Interface (Frontend)** | [http://127.0.0.1:8000/](http://127.0.0.1:8000/) | The bilingual interview app interface |
| **Interactive API Docs** | [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs) | Swagger docs to test endpoints directly |

---

## 🛠️ Troubleshooting | حل المشاكل الشائعة

> [!WARNING]
> **Celery Worker is using stale code?**
> If you make changes to python code or prompts, Uvicorn will auto-reload, but **Celery workers will not**. You must kill existing python background tasks using:
> `taskkill /IM python.exe /F` on Windows, then restart `python run.py`.

> [!IMPORTANT]
> **Database connection issues?**
> Verify that PostgreSQL service is active on port `5432` and that credentials (`postgres` / `admin123`) match those in your `.env` file.
