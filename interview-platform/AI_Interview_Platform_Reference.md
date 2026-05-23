# AI Interview Platform — Complete Technical & User Journey Reference

> **Purpose:** This document is the single source of truth for the full user journey inside the AI Interview Platform. It is designed to guide any developer or AI Agent during implementation, covering every phase from authentication to audit logging.

---

## Table of Contents

1. [Phase 1 — Authentication & Entry](#phase-1--authentication--entry)
2. [Phase 2 — Job & JD Management](#phase-2--job--jd-management)
3. [Phase 3 — Candidates & Applications](#phase-3--candidates--applications)
4. [Phase 4 — Interview Session & AI Pipeline](#phase-4--interview-session--ai-pipeline)
5. [Phase 5 — Evaluations & Insight Generation](#phase-5--evaluations--insight-generation)
6. [Phase 6 — Infrastructure & Audit](#phase-6--infrastructure--audit)
7. [Agent Roles Summary](#agent-roles-summary)
8. [Database Tables Reference](#database-tables-reference)
9. [API Endpoints Reference](#api-endpoints-reference)
10. [System Architecture](#system-architecture)
11. [Project Structure](#project-structure)
12. [Tech Stack Summary](#tech-stack-summary)
13. [Non-Goals for MVP](#non-goals-for-mvp)

---

## Phase 1 — Authentication & Entry

**Goal:** Secure access for HR/Recruiter users to protect candidate data privacy.

### Steps

| Step | Description | Technical Requirement |
|------|-------------|----------------------|
| **Register** | User creates a new account (name, email, password) | Passwords hashed via bcrypt |
| **Login** | Identity verified and JWT token issued | Token expiry configurable via `.env` |
| **Authorize** | User accesses the dashboard | `Authorization: Bearer <token>` enforced via middleware on all protected routes |

### Key Rules

- Every API endpoint beyond `/auth/register` and `/auth/login` is protected.
- JWT payload must contain: `user_id`, `role`, `iat`, `exp`.
- Role-based access control (RBAC) differentiates **HR**, **Recruiter**, and **Admin** roles.

---

## Phase 2 — Job & JD Management

**Goal:** Define the evaluation benchmark against which all candidates will be assessed.

### A. Create a Job

- The user adds a new job position (e.g., *Backend Engineer*, *Product Manager*).
- Core job data is stored in the `jobs` table.
- Fields: `title`, `department`, `location`, `employment_type`, `status`.

### B. Job Description Versioning

Because job requirements evolve over time, the system supports **versioning** — each candidate is linked to the specific version of the JD they were interviewed against.

- User inputs the raw Job Description (JD) text.
- Each version is stored in `job_versions` with a `version_number` and `created_at` timestamp.
- A candidate's application always references a specific `job_version_id`, not just the job.

> **Why versioning matters:** If the JD is updated mid-hiring cycle, old candidates retain their original evaluation criteria — ensuring fairness and full traceability.

### C. Evaluation Criteria (EC) Engineering

The user has **3 options** to define evaluation criteria (e.g., Technical Skills, Communication, Leadership):

#### 1. Manual
- User writes criteria and assigns weights manually.
- Each criterion has: `name`, `description`, `weight (%)`, `priority_level`.

#### 2. AI Generated
- The **JD NLP Agent** analyzes the raw JD text and extracts:
  - **Hard Skills** — e.g., Python, System Design, SQL
  - **Soft Skills** — e.g., Teamwork, Leadership
  - **Responsibilities** — e.g., "Lead a team of 5 engineers"
- The agent proposes weighted criteria automatically.
- Stored in `evaluation_criteria` linked to `job_version_id`.

#### 3. Hybrid *(Recommended)*
- AI proposes the criteria; user can **edit, add, or delete** any item before confirming.
- Best balance of speed and human oversight for most use cases.

---

## Phase 3 — Candidates & Applications

**Goal:** Register candidate profiles and link them to a specific job version.

### Add a Candidate

Fields stored in the `candidates` table:

| Field | Description |
|-------|-------------|
| `full_name` | Candidate's full name |
| `email` | Primary contact |
| `phone` | Optional phone number |
| `linkedin_url` | LinkedIn profile link |
| `github_url` | GitHub profile link (for technical roles) |
| `resume_file_path` | Path to uploaded CV/resume file |
| `source` | How the candidate was sourced (e.g., LinkedIn, Referral, Job Board) |

### Create a Job Application

- Links a `candidate_id` to a specific `job_version_id`.
- Stored in the `job_applications` table.
- Application `status` flows through: `Applied → Screening → Interview → Offer → Hired / Rejected`.
- One candidate can have multiple applications for different jobs or different versions of the same job.

---

## Phase 4 — Interview Session & AI Pipeline

**Goal:** Record the interview and run the full AI processing pipeline to produce a scored evaluation.

### A. Create a Session & Upload Media

#### Step 1 — Select Session Type

| Type | Purpose |
|------|---------|
| `Screening` | Initial fit check |
| `Technical` | Deep technical assessment |
| `Cultural Fit` | Values and soft skills alignment |
| `Final` | Last-round interview |

#### Step 2 — Upload Interview Media

The system supports **three input methods**:

| Method | Description |
|--------|-------------|
| **File Upload** | Upload an existing `.mp4`, `.mov`, `.mp3`, or `.wav` file |
| **Live Microphone Recording** | Capture audio via the browser microphone in real time |
| **System Audio Recording** | Capture audio from a browser tab or meeting tool (Zoom, Google Meet) |

All inputs are saved under `storage/uploads/` and tracked in the `media_files` table:

| Field | Description |
|-------|-------------|
| `file_path` | Absolute path to the stored file |
| `file_type` | `mp4`, `mov`, `mp3`, `wav` |
| `duration_seconds` | Total duration of the recording |
| `upload_status` | `pending`, `uploaded`, `failed` |

#### Step 3 — Create Session Record

A new record is inserted into `interview_sessions` referencing:
- `application_id`
- `session_type`
- `media_file_id`
- `pipeline_status` (default: `pending`)

---

### B. AI Pipeline Execution

Once the file is uploaded, a **Celery Worker** is triggered to run the pipeline **asynchronously**. Each step is tracked in `ai_pipeline_steps` for full observability.

| Step | Tool | Description |
|------|------|-------------|
| **1. Audio Extraction** | FFmpeg | Converts video (MP4/MOV) into a clean MP3 for downstream processing |
| **2. Speech-to-Text (STT)** | Groq — Whisper large-v3 | Sends audio to Groq API; returns a full timestamped transcript |
| **3. QA Extraction** | Gemini | Parses the transcript into structured Question & Answer pairs, tagged by competency |
| **4. Scoring** | Gemini | Compares QA pairs against Evaluation Criteria + JD; assigns a score per criterion |
| **5. Insight Generation** | Gemini | Produces Strengths, Weaknesses, Interviewer Notes, Executive Summary, Hiring Recommendation, Confidence Score, and Suggested Follow-up Questions |

#### Pipeline Step Tracking Schema (`ai_pipeline_steps`)

```
id | session_id | step_name       | status   | started_at | completed_at | error_message
---|------------|-----------------|----------|------------|--------------|---------------
1  | 42         | audio_extract   | success  | ...        | ...          | null
2  | 42         | stt             | success  | ...        | ...          | null
3  | 42         | qa_extraction   | failed   | ...        | null         | "Gemini timeout"
```

#### Pipeline Status Flow

```
pending → running → completed
                 ↘ failed (with step-level error details)
```

---

## Phase 5 — Evaluations & Insight Generation

**Goal:** Convert raw AI-processed data into a structured, actionable hiring report with full traceability.

### A. Final Evaluation Report (`interview_evaluations`)

After the pipeline completes, the Evaluation Agent produces a full report. The report components are:

| Component | Description |
|-----------|-------------|
| **Overall Score** | Weighted aggregate score (0–100) across all evaluation criteria |
| **Competency Breakdown** | Per-criterion score with supporting evidence quotes from the transcript |
| **Executive Summary** | A narrative paragraph summarizing the candidate's overall performance |
| **Hiring Recommendation** | Final decision: `Strong Hire` / `Hire` / `No Hire` / `Strong No Hire` |
| **Confidence Score** | AI's confidence level (0–100%) in the recommendation |

---

### B. Insight Generation

The AI does not just generate generic feedback — it produces a **structured multi-layer insight report** across four dimensions:

#### 1. Strengths
- A list of areas where the candidate clearly met or exceeded evaluation criteria.
- Each strength is backed by **Evidence Quotes** pulled directly from the transcript.
- Example: *"Candidate demonstrated strong knowledge of distributed systems, referencing CAP theorem and Paxos protocol."*

#### 2. Weaknesses
- Identified skill gaps or red flags, each explicitly tied to a specific Evaluation Criterion.
- Example: *"Candidate was vague on SQL query optimization — scored 40/100 on the 'Database Proficiency' criterion."*

#### 3. Interviewer Notes
- Qualitative, holistic observations about the candidate beyond scores:
  - Communication style (e.g., structured, verbose, hesitant)
  - Confidence level and seniority signals
  - Red flags or standout moments
- Example: *"Candidate showed high confidence in architecture design but struggled with basic syntax — may be a senior who has moved away from hands-on coding."*

#### 4. Suggested Questions for Next Round
- Based on identified **skill gaps**, the AI generates targeted follow-up questions for the next interview round.
- Questions are specific to the weakness and tied to the relevant criterion.
- Examples:
  - *"Candidate was vague on SQL optimization → Suggest: 'Explain how you would optimize a query with a 3-table JOIN on a 10M-row table.'"*
  - *"Candidate showed weakness in 'Communication' → Suggest: 'Tell me about a time you had to explain a complex technical decision to a non-technical stakeholder.'"*
- Stored as a structured JSONB field (`suggested_questions`) in `interview_evaluations`.

---

### C. Human-Verifiable Artifacts (`session_artifacts`)

All artifacts are stored in the `session_artifacts` table, linked to `session_id` and the `pipeline_step_id` that produced them — enabling full AI auditability.

| Artifact | Description |
|----------|-------------|
| **Full Transcript** | Time-stamped raw transcript from the STT Agent |
| **Q&A Pairs** | Extracted question-and-answer pairs, each tagged by competency |
| **Evidence Quotes** | Specific transcript excerpts used to justify each criterion score |
| **Competency Mapping** | Map showing how each answer maps to a specific evaluation criterion |

> These artifacts allow the HR user to verify AI accuracy at any time and challenge any score with direct transcript evidence.

---

## Phase 6 — Infrastructure & Audit

**Goal:** Ensure system quality, traceability, and reliability for a professional MVP.

### Audit Logs

Every user action is logged in the `audit_logs` table:

| Field | Description |
|-------|-------------|
| `action` | e.g., `CREATE_JOB`, `DELETE_CANDIDATE`, `UPDATE_CRITERIA` |
| `user_id` | Who performed the action |
| `resource_type` | e.g., `job`, `candidate`, `session` |
| `resource_id` | The affected record's ID |
| `timestamp` | When the action occurred |
| `ip_address` | Requester's IP for security tracing |

### Pipeline Monitoring

- The `ai_pipeline_steps` table provides full observability into each processing step.
- Failed steps include `error_message` for debugging.
- Example query: *"Which sessions failed at the STT step in the last 7 days?"*

### Error Handling Strategy

| Scenario | Behavior |
|----------|----------|
| STT API timeout | Mark step as `failed`; notify user; allow manual retry |
| Media file corrupt | Reject at upload; return descriptive error message |
| Gemini rate limit | Exponential backoff via Tenacity (max 3 retries) |
| Partial pipeline failure | Preserve completed steps; resume from the failed step only |

---

## Agent Roles Summary

Three specialized AI agents power the platform:

### 1. JD Agent (NLP Agent)
- **Trigger:** New Job Version created with AI-generated criteria selected.
- **Input:** Raw JD text.
- **Output:** Structured list of evaluation criteria with suggested weights.
- **Model:** Gemini 1.5 Pro / Flash.

### 2. STT Agent
- **Trigger:** Media file successfully uploaded and audio extraction complete.
- **Input:** MP3 audio file (extracted via FFmpeg).
- **Output:** Full transcript with timestamps.
- **Model:** Groq — Whisper large-v3.

### 3. Evaluation Agent
- **Trigger:** STT complete and transcript available.
- **Input:** Transcript + Evaluation Criteria + JD text.
- **Output:** Scored evaluation, competency breakdown, insight report, and hiring recommendation.
- **Model:** Gemini 1.5 Pro / Flash (multi-step: QA Extraction → Scoring → Insight Generation).

### Agent Interaction Flow

```
[JD Upload] ──► JD Agent ──► Evaluation Criteria

[Media Upload] ──► FFmpeg ──► STT Agent ──► Transcript
                                                │
                                                ▼
                               Evaluation Agent ◄── Criteria + JD
                                                │
                                                ▼
                               Final Report + Artifacts + Insights
```

---

## Database Tables Reference

| Table | Purpose |
|-------|---------|
| `users` | HR/Recruiter accounts |
| `jobs` | Job positions |
| `job_versions` | Versioned JD snapshots with raw JD, structured JD, and evaluation criteria |
| `evaluation_criteria` | Per-criterion definitions linked to a job version |
| `candidates` | Candidate profiles |
| `job_applications` | Links a candidate to a specific job version |
| `interview_sessions` | Session metadata, type, status, and pipeline reference |
| `media_files` | Uploaded audio/video file references |
| `session_artifacts` | All AI-generated artifacts (transcript, QA pairs, competency maps) |
| `interview_evaluations` | Final scored report with strengths, weaknesses, notes, suggested questions |
| `ai_pipeline_runs` | Tracks a full AI processing run per session |
| `ai_pipeline_steps` | Step-by-step execution log with tokens, latency, prompt version, errors |
| `audit_logs` | Full user action trail |

### Database Relations Flow

```
users
  └── jobs
        └── job_versions
              └── evaluation_criteria
  └── candidates
        └── job_applications
                └── interview_sessions
                        ├── media_files
                        ├── session_artifacts
                        ├── interview_evaluations
                        └── ai_pipeline_runs
                                └── ai_pipeline_steps
```

---

## API Endpoints Reference

### Authentication

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|:-------------:|
| POST | `/auth/register` | Create new HR/Recruiter account | ✗ |
| POST | `/auth/login` | Authenticate and receive JWT | ✗ |
| GET | `/auth/me` | Get current authenticated user info | ✓ |
| POST | `/auth/logout` | Invalidate current session token | ✓ |
| POST | `/auth/refresh` | Refresh an expiring JWT token | ✓ |

### Jobs

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|:-------------:|
| POST | `/jobs` | Create a new job position | ✓ |
| GET | `/jobs` | List all jobs (with pagination & filters) | ✓ |
| GET | `/jobs/{job_id}` | Get full details of a specific job | ✓ |
| PATCH | `/jobs/{job_id}` | Update job metadata (title, status, etc.) | ✓ |
| DELETE | `/jobs/{job_id}` | Soft-delete a job position | ✓ |

### Job Versions & Evaluation Criteria

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|:-------------:|
| POST | `/jobs/{job_id}/versions` | Create a new JD version (triggers JD Agent if AI mode) | ✓ |
| GET | `/jobs/{job_id}/versions` | List all versions for a job | ✓ |
| GET | `/jobs/{job_id}/versions/{version_id}` | Get a specific JD version and its criteria | ✓ |
| POST | `/jobs/{job_id}/versions/{version_id}/criteria` | Manually add evaluation criteria to a version | ✓ |
| PUT | `/jobs/{job_id}/versions/{version_id}/criteria` | Replace / finalize criteria after AI proposal or edit | ✓ |
| DELETE | `/jobs/{job_id}/versions/{version_id}/criteria/{criteria_id}` | Remove a specific criterion | ✓ |

### Candidates

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|:-------------:|
| POST | `/candidates` | Add a new candidate profile | ✓ |
| GET | `/candidates` | List all candidates (with pagination & filters) | ✓ |
| GET | `/candidates/{candidate_id}` | Get full candidate profile | ✓ |
| PATCH | `/candidates/{candidate_id}` | Update candidate info | ✓ |
| DELETE | `/candidates/{candidate_id}` | Soft-delete a candidate | ✓ |
| POST | `/candidates/{candidate_id}/resume` | Upload or replace resume file | ✓ |

### Applications

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|:-------------:|
| POST | `/applications` | Link a candidate to a job version | ✓ |
| GET | `/applications` | List all applications (filterable by job, candidate, status) | ✓ |
| GET | `/applications/{application_id}` | Get a specific application | ✓ |
| PATCH | `/applications/{application_id}/status` | Update application status (e.g., Screening → Interview) | ✓ |
| DELETE | `/applications/{application_id}` | Remove an application | ✓ |

### Interview Sessions

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|:-------------:|
| POST | `/sessions` | Create a new interview session record | ✓ |
| GET | `/sessions` | List all sessions (filterable by application, status, type) | ✓ |
| GET | `/sessions/{session_id}` | Get full session details | ✓ |
| POST | `/sessions/{session_id}/upload` | Upload interview media file and trigger pipeline | ✓ |
| GET | `/sessions/{session_id}/status` | Poll current pipeline status and step-level progress | ✓ |
| POST | `/sessions/{session_id}/retry` | Retry a failed pipeline step | ✓ |
| GET | `/sessions/{session_id}/transcript` | Get the full time-stamped transcript for a session | ✓ |
| GET | `/sessions/{session_id}/artifacts` | Get all AI-generated artifacts for a session | ✓ |

### Evaluations

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|:-------------:|
| GET | `/evaluations/{evaluation_id}` | Get a full evaluation report by ID | ✓ |
| GET | `/evaluations/session/{session_id}` | Get evaluation report by session | ✓ |
| GET | `/evaluations/{evaluation_id}/insights` | Get the structured insight report (strengths, weaknesses, notes) | ✓ |
| GET | `/evaluations/{evaluation_id}/suggested-questions` | Get AI-generated follow-up questions for next round | ✓ |
| PATCH | `/evaluations/{evaluation_id}/notes` | HR adds or edits manual notes on top of AI report | ✓ |

### Pipeline (Internal / Debug)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|:-------------:|
| GET | `/pipeline/runs/{run_id}` | Get full pipeline run details | ✓ |
| GET | `/pipeline/runs/{run_id}/steps` | List all steps for a pipeline run with status and errors | ✓ |
| POST | `/pipeline/runs/{run_id}/steps/{step_name}/retry` | Manually retry a specific pipeline step | ✓ |

### Audit

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|:-------------:|
| GET | `/audit/logs` | Retrieve audit logs (filterable by user, action, resource, date range) | ✓ (Admin only) |

### Health

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|:-------------:|
| GET | `/health` | Simple liveness probe | ✗ |
| GET | `/health/db` | Database readiness probe | ✗ |
| GET | `/health/redis` | Redis readiness probe | ✗ |
| GET | `/health/ready` | Full readiness check (DB + Redis) | ✗ |

---

## System Architecture

### High-Level Layers

```
┌──────────────────────┐
│      Frontend        │
│  React / Next.js UI  │
└──────────┬───────────┘
           │ HTTP / REST
           ▼
┌──────────────────────┐
│      FastAPI API     │
│    app/api/v1/*      │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│      Services        │
│   Business Logic     │
│   app/services/*     │
└──────────┬───────────┘
           │
     ┌─────┴─────┐
     │           │
     ▼           ▼
┌──────────┐  ┌────────────────────────┐
│PostgreSQL│  │     AI Pipeline        │
│ Database │  │  (Celery Worker Tasks) │
└──────────┘  └──────────┬─────────────┘
                         │
           ┌─────────────┼──────────────┐
           ▼             ▼              ▼
   ┌────────────┐ ┌──────────────┐ ┌──────────┐
   │   FFmpeg   │ │  Groq Whisper│ │  Gemini  │
   │  (local)   │ │    (STT)     │ │  (AI)    │
   └────────────┘ └──────────────┘ └──────────┘
```

### AI Agents Flow

```
[HR enters JD]
      │
      ▼
  JD Agent (Gemini)
      │
      ▼
  Suggests Evaluation Criteria (Hard Skills / Soft Skills / Responsibilities)
      │
      ▼
  HR: Accept / Edit / Manual Override
      │
      ▼
  Final EC saved to job_version


[HR uploads media / records audio]
      │
      ▼
  FFmpeg → extract & normalize audio (MP3)
      │
      ▼
  STT Agent (Groq Whisper) → timestamped transcript
      │
      ▼
  Evaluation Agent (Gemini) — multi-step:
  ├── Step 1: QA Extraction       → Structured Q&A pairs by competency
  ├── Step 2: Scoring             → Per-criterion scores + evidence quotes
  └── Step 3: Insight Generation
        ├── Strengths (with transcript evidence)
        ├── Weaknesses (linked to criteria)
        ├── Interviewer Notes (communication, seniority signals)
        ├── Executive Summary
        ├── Hiring Recommendation (Strong Hire / Hire / No Hire / Strong No Hire)
        ├── Confidence Score
        └── Suggested Questions for Next Round
      │
      ▼
  Save to interview_evaluations + session_artifacts
```

---

## Project Structure

```
interview-platform/
│
├── app/
│   ├── api/v1/
│   │   ├── auth.py
│   │   ├── jobs.py
│   │   ├── candidates.py
│   │   ├── applications.py
│   │   ├── sessions.py
│   │   ├── evaluations.py
│   │   ├── pipeline.py
│   │   ├── audit.py
│   │   └── health.py
│   │
│   ├── models/
│   │   ├── user.py
│   │   ├── job.py
│   │   ├── job_version.py
│   │   ├── evaluation_criteria.py
│   │   ├── candidate.py
│   │   ├── job_application.py
│   │   ├── interview_session.py
│   │   ├── media_file.py
│   │   ├── session_artifact.py
│   │   ├── interview_evaluation.py
│   │   ├── ai_pipeline_run.py
│   │   ├── ai_pipeline_step.py
│   │   └── audit_log.py
│   │
│   ├── schemas/
│   │   ├── auth.py
│   │   ├── job.py
│   │   ├── candidate.py
│   │   ├── application.py
│   │   ├── session.py
│   │   ├── evaluation.py
│   │   ├── pipeline.py
│   │   └── audit.py
│   │
│   ├── repositories/
│   │   ├── user_repo.py
│   │   ├── job_repo.py
│   │   ├── candidate_repo.py
│   │   ├── application_repo.py
│   │   ├── session_repo.py
│   │   ├── evaluation_repo.py
│   │   ├── pipeline_repo.py
│   │   └── audit_repo.py
│   │
│   ├── services/
│   │   ├── auth_service.py
│   │   ├── job_service.py
│   │   ├── candidate_service.py
│   │   ├── session_service.py
│   │   ├── evaluation_service.py
│   │   └── audit_service.py
│   │
│   ├── core/
│   │   ├── config.py
│   │   ├── security.py
│   │   ├── exceptions.py
│   │   ├── storage.py
│   │   ├── ffmpeg.py
│   │   └── ai/
│   │       ├── gemini_client.py
│   │       └── groq_client.py
│   │
│   ├── tasks/
│   │   ├── pipeline_tasks.py
│   │   └── celery_app.py
│   │
│   ├── main.py
│   └── database.py
│
├── storage/
│   ├── uploads/
│   │   ├── videos/
│   │   ├── audio/
│   │   └── temp/
│   ├── transcripts/
│   └── reports/
│
├── prompts/
│   ├── jd_extraction/
│   ├── qa_extraction/
│   ├── scoring/
│   └── insight_generation/
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── conftest.py
│
├── alembic/
├── requirements.txt
├── docker-compose.yml
├── .env
├── .env.example
└── README.md
```

---

## Tech Stack Summary

### Core

| Layer | Technology |
|-------|-----------|
| **Language** | Python 3.11+ |
| **Backend Framework** | FastAPI |
| **ORM** | SQLAlchemy 2.0 |
| **Migrations** | Alembic |
| **Database** | PostgreSQL 15+ |
| **Task Queue** | Celery |
| **Message Broker** | Redis |

### AI & Processing

| Purpose | Technology |
|---------|-----------|
| **LLM — JD Parsing & Evaluation** | Google Gemini API (Gemini 1.5 Pro / Flash) |
| **Prompt Management** | LangChain |
| **Speech-to-Text** | Groq API — Whisper large-v3 |
| **Audio Extraction** | FFmpeg |
| **AI Output Validation** | Pydantic + `output_parser.py` |
| **Retry Logic** | Tenacity (exponential backoff, max 3 retries) |

### Authentication & Security

| Purpose | Technology |
|---------|-----------|
| **Auth Tokens** | PyJWT |
| **Password Hashing** | Passlib + bcrypt |

### File Storage

| Environment | Technology |
|-------------|-----------|
| **MVP / Local** | Local filesystem (`/storage/`) |
| **Production** | AWS S3 / Supabase Storage / MinIO + boto3 |

### Dev & Ops

| Purpose | Technology |
|---------|-----------|
| **Containerization** | Docker + Docker Compose |
| **Testing** | pytest + httpx |
| **Logging** | Loguru |
| **Env Management** | python-dotenv |

### Agent → Model Mapping

| Agent | Provider | Model |
|-------|----------|-------|
| JD Agent | Google AI Studio | Gemini 1.5 Pro / Flash |
| STT Agent | Groq | Whisper large-v3 |
| Evaluation Agent | Google AI Studio | Gemini 1.5 Pro / Flash |

---

## Non-Goals for MVP

The following are intentionally excluded to keep the MVP focused:

- Live interview streaming or real-time transcription
- Multi-tenant organizations or complex RBAC beyond HR/Recruiter/Admin
- Email, Slack, or ATS integrations
- Vector databases or semantic search
- Microservices, Kafka, or event-driven architecture
- WebSocket streaming
- Kubernetes or distributed tracing
- LangGraph, Temporal, or AI agent orchestration frameworks

---

*Last updated: 2026 — AI Interview Platform MVP Reference Guide*
