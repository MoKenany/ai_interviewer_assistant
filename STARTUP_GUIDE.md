# 🚀 AI Interview Platform - Startup Guide

Welcome to the **AI Interview Platform** setup guide. This document provides clear, step-by-step instructions to configure and run the entire ecosystem from scratch on a Windows machine.

---

## 📌 Prerequisites

Before you begin, ensure you have the following installed on your machine:

1. **Python 3.10+** (Added to your System PATH).
2. **PostgreSQL** (Installed and running, default user: `postgres`, default password: `admin123`).
3. **FFmpeg** (Required for audio processing):
   - Download the FFmpeg Windows build from the official site (e.g., gyan.dev or github releases).
   - Extract the downloaded archive.
   - Copy the `ffmpeg.exe` file and paste it directly into the backend directory (`interview-platform/ffmpeg.exe`).
4. **Active Internet Connection** (For downloading python packages and the native Redis binary).

*(Note: **Redis** will be downloaded and configured automatically by the platform's setup scripts, so you do NOT need to install it manually!)*

---

## 🛠️ Step-by-Step Installation

### Step 1: Create Virtual Environment
Create a clean Python virtual environment at the project root directory:

```bash
python -m venv venv
```

### Step 2: Activate Virtual Environment
Activate the virtual environment (Windows PowerShell):

```powershell
.\venv\Scripts\Activate.ps1
```

### Step 3: Install Dependencies
Install all required packages from `requirements.txt`:

```bash
pip install -r requirements.txt
```
> [!NOTE]
> If installing database adapters fails on Windows, run: `pip install psycopg2-binary`

### Step 4: Environment Variables Setup
1. Navigate to the backend directory:
   ```bash
   cd interview-platform
   ```
2. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
3. Open `.env` and configure your API keys and database parameters:
   ```env
   DATABASE_URL=postgresql+asyncpg://postgres:admin123@localhost:5432/ai_interview_db
   GROQ_API_KEY=gsk_your_groq_key_here
   ```

### Step 5: Initialize the Database
We have an automated script to handle all SQL configurations. Run this script inside the `interview-platform/` directory:

```bash
python setup_db.py
```
**What this script does under the hood:**
1. Connects to PostgreSQL and creates the database `ai_interview_db` if it doesn't exist.
2. Creates storage directories for media uploads.
3. Runs all Alembic migrations to construct tables.

### Step 6: Seed Default Data (Optional)
To populate the database with ready-to-use jobs and evaluation criteria:

```bash
python seed_db.py
```

---

## 🚀 Running the Application

### The Automatic Way (Recommended)
Inside the `interview-platform/` directory, simply run:

```bash
python run.py
```
*(Or double-click the `start_all.bat` launcher)*

**How this single command orchestrates everything:**
- **Redis Auto-Setup**: Automatically downloads and extracts native Windows Redis into the `interview-platform/redis/` directory if it's missing.
- **Service Launcher**:
  1. Launches **Redis Server** in a separate command window.
  2. Launches **Celery Background Worker** in a separate command window.
  3. Launches the **FastAPI web server** locally on `http://127.0.0.1:8000`.

---

## 🌐 Accessing the App

| Service | Address | Description |
| :--- | :--- | :--- |
| **Web Interface (Frontend)** | [http://127.0.0.1:8000/](http://127.0.0.1:8000/) | The bilingual interview app interface |
| **Interactive API Docs** | [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs) | Swagger docs to test endpoints directly |

---

## 🛠️ Troubleshooting

> [!WARNING]
> **Celery Worker is using stale code?**
> If you make changes to python code or prompts, Uvicorn will auto-reload, but **Celery workers will not**. You must manually close the Celery terminal window and restart `python run.py` (or run `taskkill /IM python.exe /F` to force close all).

> [!IMPORTANT]
> **Database connection issues?**
> Verify that PostgreSQL service is active on port `5432` and that credentials (`postgres` / `admin123`) match those in your `.env` file.
