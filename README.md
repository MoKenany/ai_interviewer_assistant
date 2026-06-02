# 🤖 AI Interview Platform

Advanced AI-powered interview platform for conducting, scoring, and analyzing technical interviews with real-time feedback and comprehensive evaluation metrics.

> **Status**: Production Ready | **Version**: 2.0 | **Last Updated**: May 2026

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Running the Application](#-running-the-application)
- [API Documentation](#-api-documentation)
- [Development](#-development)
- [Testing](#-testing)
- [Contributing](#-contributing)
- [License](#-license)

---

## ✨ Features

### Core Functionality
- 🎤 **AI-Powered Interviews** - Conduct dynamic interviews with intelligent questioning
- 📊 **Scoring & Evaluation** - Automated scoring with customizable evaluation criteria
- 🎯 **Real-time Feedback** - Instant feedback and recommendations during interviews
- 👥 **Candidate Management** - Track candidates through the entire pipeline
- 📈 **Analytics Dashboard** - Comprehensive metrics and insights
- 🔍 **Audit Logs** - Complete activity tracking and monitoring
- 🌐 **Bilingual Support** - Full Arabic/English interface
- 📱 **Responsive Design** - Works seamlessly on all devices

### Advanced Features
- 🚀 **Pipeline Automation** - Automated interview scheduling and execution
- 🎓 **JD Analysis** - Job description parsing and criteria extraction
- 💾 **Data Persistence** - All records stored permanently in PostgreSQL
- 🔐 **Role-Based Access** - Admin and HR user roles with permissions
- 📥 **Bulk Operations** - Import/export candidates in bulk
- 🗂️ **Session Management** - Track and manage interview sessions
- 📝 **Transcription** - Store and retrieve interview transcripts

---

## 🛠 Tech Stack

### Backend
- **Framework**: FastAPI (Python 3.10+)
- **Database**: PostgreSQL with SQLAlchemy ORM
- **Task Queue**: Celery + Redis
- **Authentication**: JWT tokens
- **AI Integration**: Gemini API, Groq API
- **Async Support**: AsyncIO, AsyncSession

### Frontend
- **Architecture**: Vanilla JavaScript (Component-based)
- **Styling**: Custom CSS with theme variables
- **State Management**: Component-level state
- **i18n**: Custom Arabic/English localization
- **UI Components**: Custom Modal, Toast, Navbar, Sections

### Infrastructure
- **Redis**: Caching and task queue
- **FFmpeg**: Audio/video processing
- **Alembic**: Database migrations

---

## 📁 Project Structure

```
ai-interview-platform/
├── frontend-v2/                    # Modern frontend (Vanilla JS)
│   ├── index.html                  # Main entry point
│   ├── css/
│   │   ├── style.css              # Global styles
│   │   ├── components.css         # Component styles
│   │   └── theme.css              # Theme variables
│   └── js/
│       ├── core/                  # Core functionality (API, i18n, router, poller)
│       ├── components/            # Reusable components (Modal, Toast, Navbar)
│       └── sections/              # Feature sections (Dashboard, Candidates, Jobs, etc.)
│
├── interview-platform/            # Backend API
│   ├── app/
│   │   ├── main.py               # FastAPI app
│   │   ├── api/v1/               # API endpoints (auth, candidates, jobs, etc.)
│   │   ├── models/               # SQLAlchemy models
│   │   ├── schemas/              # Pydantic schemas
│   │   ├── services/             # Business logic
│   │   ├── repositories/         # Database access layer
│   │   ├── core/                 # Core utilities (security, config)
│   │   ├── tasks/                # Celery background tasks
│   │   └── database.py           # Database configuration
│   ├── alembic/                  # Database migrations
│   ├── tests/                    # Test suite
│   ├── prompts/                  # AI prompts for various tasks
│   ├── redis/                    # Redis configuration
│   ├── storage/                  # File storage (uploads, processed)
│   └── run.py                    # Application entry point
│
├── requirements.txt              # Python dependencies
├── .env.example                 # Environment template
├── .gitignore                   # Git ignore rules
├── _deprecated/                 # Archived temporary files
└── README.md                    # This file
```

---

## 🚀 Getting Started

### Prerequisites

- Python 3.10 or higher
- PostgreSQL 12 or higher
- Redis 6.0 or higher
- Node.js (for package management, optional)
- FFmpeg (for audio/video processing)

### System Requirements

- **Disk**: Minimum 5GB (for storage and uploads)
- **RAM**: Minimum 4GB
- **CPU**: 2+ cores recommended

---

## 📦 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/ai-interview-platform.git
cd ai-interview-platform
```

### 2. Create Virtual Environment

```bash
python -m venv .venv

# Windows
.venv\Scripts\activate

# Linux/macOS
source .venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Setup Environment Variables

```bash
# Copy example to actual .env file
cp .env.example .env

# Edit .env with your configuration
# See Configuration section below
```

### 5. Initialize Database

```bash
cd interview-platform

# Run Alembic migrations
alembic upgrade head

# Seed test data (optional)
python seed_db.py
```

### 6. Verify Installation

```bash
python check_audit_logs.py
```

---

## ⚙️ Configuration

Create a `.env` file in the root directory based on `.env.example`:

```env
# Database Configuration
DATABASE_URL=postgresql+asyncpg://postgres:PASSWORD@localhost:5432/ai_interview_db

# Security
SECRET_KEY=your_very_long_random_secret_key_change_in_production
JWT_ALGORITHM=HS256
JWT_EXPIRY_MINUTES=1440

# AI API Keys (from Google and Groq)
GEMINI_API_KEY=your_gemini_api_key
GROQ_API_KEY=your_groq_api_key

# Storage & API
STORAGE_ROOT=storage
API_HOST=127.0.0.1
API_PORT=8000
```

### Important Notes

- **SECRET_KEY**: Generate a secure key for production
  ```bash
  python -c "import secrets; print(secrets.token_urlsafe(32))"
  ```
- **API Keys**: Get from  [Groq Console](https://console.groq.com)
- **DATABASE_URL**: Adjust username, password, and database name as needed

---

## ▶️ Running the Application

### Start Backend Server

```bash
cd interview-platform

# Option 1: Simple mode
python run.py

# Option 2: Using start_all.bat (Windows)
./start_all.bat

# Option 3: With multiple services
python run.py          # API Server
python run_celery.py   # Celery Worker
```

### Start Frontend

The frontend is served from `frontend-v2/index.html` and connects to the API at `http://localhost:8000`.

1. Open your browser
2. Navigate to `http://localhost:8000`
3. Login with credentials (default: admin@example.com / admin123)

### Verify All Services

```bash
# Check API Health
curl http://localhost:8000/api/v1/health

# Check Audit Logs
python check_audit_logs.py
```

---

## 📚 API Documentation

The API documentation is available at:

```
http://localhost:8000/docs         # Swagger UI
http://localhost:8000/redoc        # ReDoc
```

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/login` | User login |
| POST | `/api/v1/auth/register` | User registration |
| GET | `/api/v1/candidates` | List candidates |
| POST | `/api/v1/candidates` | Create candidate |
| GET | `/api/v1/jobs` | List jobs |
| POST | `/api/v1/jobs` | Create job |
| GET | `/api/v1/audit/logs` | View audit logs |
| GET | `/api/v1/dashboard/metrics` | Dashboard metrics |

---

## 🧪 Testing

### Run All Tests

```bash
cd interview-platform

# Unit tests
pytest tests/unit/

# Integration tests
pytest tests/integration/

# All tests
pytest
```

### Test Coverage

```bash
pytest --cov=app tests/
```

---

## 🔧 Development

### Code Style

- Use **PEP 8** for Python
- Use **ES6+** for JavaScript
- Follow existing naming conventions

### Key Technologies Used

- **SQLAlchemy**: Database ORM with async support
- **Pydantic**: Data validation and parsing
- **FastAPI**: Modern async web framework
- **Celery**: Distributed task queue
- **Redis**: In-memory cache and message broker

### Database Migrations

```bash
# Create new migration
alembic revision --autogenerate -m "Description of changes"

# Apply migrations
alembic upgrade head

# Rollback migration
alembic downgrade -1
```

### Frontend Architecture

Each feature has a dedicated `Section` class:

```javascript
class CandidatesSection {
    render()  // Returns HTML
    mount()   // Attaches event listeners
    refresh() // Fetches data and re-renders
}
```

Event listeners are stored on DOM elements to prevent duplicates on re-render.

---

## 📝 Important Notes

### Data Persistence
- ✅ All records stored in PostgreSQL
- ✅ Survives application restarts
- ✅ Survives system restarts
- ✅ Audit logs track all actions

### Recent Fixes (v2.0)
- Fixed duplicate toast messages on CRUD operations
- Fixed audit logs not displaying (response parsing)
- Added password verification to delete-all operations
- Improved event listener lifecycle management

### Known Limitations
- Audio processing requires FFmpeg installation
- Bulk operations limited to 1000 records
- Real-time collaboration not supported

---

## 🐛 Troubleshooting

### Common Issues

**1. "Cannot connect to database"**
```bash
# Check PostgreSQL is running and DATABASE_URL is correct
psql -U postgres -d ai_interview_db -c "SELECT 1"
```

**2. "API Key is invalid"**
```bash
# Verify API keys in .env file
# Check Google AI Studio and Groq Console for valid keys
```

**3. "Audit logs not showing"**
```bash
# Run diagnostic
python check_audit_logs.py

# Check database migrations applied
cd interview-platform && alembic current
```

**4. "Frontend not loading"**
```bash
# Verify API is running on correct port
curl http://localhost:8000/api/v1/health

# Check browser console for errors
# Press F12 in browser
```

---

## 📄 Files Reference

| File | Purpose |
|------|---------|
| `.env` | Local environment configuration (DO NOT COMMIT) |
| `.env.example` | Template for environment variables |
| `.gitignore` | Git exclusion rules |
| `requirements.txt` | Python dependencies |
| `_deprecated/` | Archived temporary development files |

---



**Made with ❤️**
