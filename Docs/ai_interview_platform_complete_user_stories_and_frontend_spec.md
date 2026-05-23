# AI Interview Platform MVP
## Complete User Stories + Frontend Specification
## Fully Aligned With Existing OpenAPI Endpoints Only

---

# 1. Product Overview

The platform is an AI-powered interview evaluation system.

The system allows HR teams and recruiters to:

- Create jobs
- Create multiple job versions
- Define evaluation criteria
- Manage candidates
- Upload resumes
- Create applications
- Create interview sessions
- Upload interview recordings
- Trigger AI evaluation pipeline
- Review transcript/results
- Review AI insights
- Track pipeline steps
- Manage evaluation notes
- Access audit logs
- Monitor health status

IMPORTANT:

This specification MUST stay fully aligned with the provided OpenAPI endpoints.

NO extra features outside the existing API contract.

Every screen, component, action, modal, button, validation, state, and interaction below is mapped directly to existing endpoints.

---

# 2. User Roles

## Supported Roles

Based on RoleEnum:

- hr
- recruiter
- admin

---

# 3. Authentication Module

---

# 3.1 Register Page

## Endpoint

POST `/api/v1/auth/register`

---

## User Story

As a new HR/recruiter/admin user,
I want to create an account,
so I can access the interview platform.

---

## Frontend Screen

Route:

`/register`

---

## UI Elements

### Form Fields

1. Full Name
- type: text
- required

2. Email
- type: email
- required

3. Password
- type: password
- required

4. Role
- select dropdown
- values:
  - hr
  - recruiter
  - admin
- default: hr

---

## Buttons

- Register
- Go To Login

---

## Validations

- Empty fields blocked
- Invalid email blocked
- Password required

---

## Success Flow

- Success toast
- Redirect to login

---

## Error States

- Validation errors
- Duplicate email
- Network failure

---

# 3.2 Login Page

## Endpoint

POST `/api/v1/auth/login`

---

## User Story

As a registered user,
I want to log into the platform,
so I can access dashboard functionality.

---

## Route

`/login`

---

## UI Elements

### Form Fields

1. Email
2. Password

---

## Buttons

- Login
- Go To Register

---

## Success Flow

- Save bearer token
- Redirect to dashboard

---

## Error States

- Invalid credentials
- Unauthorized
- Network error

---

# 3.3 Current User Profile

## Endpoint

GET `/api/v1/auth/me`

---

## User Story

As an authenticated user,
I want to view my profile information,
so I can confirm my account details.

---

## UI Elements

### Profile Card

Display:

- Full name
- Email
- Role
- Active status
- Created at

---

# 3.4 Logout

## Endpoint

POST `/api/v1/auth/logout`

---

## User Story

As a logged-in user,
I want to logout securely,
so my session ends safely.

---

## UI Elements

- Logout button in navbar
- Confirmation modal optional

---

## Success Flow

- Remove token
- Redirect to login

---

# 3.5 Token Refresh

## Endpoint

POST `/api/v1/auth/refresh`

---

## Frontend Requirements

- Silent token refresh
- Auto retry protected requests
- Redirect to login if refresh fails

---

# 4. Dashboard

## User Story

As a logged-in user,
I want a dashboard overview,
so I can navigate all modules.

---

## Route

`/dashboard`

---

## Dashboard Sections

### Navigation Sidebar

Menu Items:

- Dashboard
- Jobs
- Candidates
- Applications
- Sessions
- Evaluations
- Pipeline Runs
- Audit Logs
- Profile

---

## Dashboard Widgets

Frontend-only summary cards from list endpoints.

Possible cards:

- Total Jobs
- Total Candidates
- Total Applications
- Total Sessions
- Total Evaluations

---

# 5. Jobs Module

---

# 5.1 Jobs List

## Endpoint

GET `/api/v1/jobs`

---

## User Story

As a recruiter,
I want to view all jobs,
so I can manage hiring positions.

---

## Route

`/jobs`

---

## UI Elements

### Data Table

Columns:

- ID
- Title
- Department
- Location
- Employment Type
- Status
- Created At
- Updated At
- Actions

---

## Actions

- View
- Edit
- Delete
- Manage Versions

---

## Filters

Frontend filter support:

- Status
- Department
- Search by title

---

## Empty State

- No jobs found illustration
- Create job CTA

---

# 5.2 Create Job

## Endpoint

POST `/api/v1/jobs`

---

## Route

`/jobs/create`

---

## User Story

As a recruiter,
I want to create a new job,
so candidates can apply.

---

## Form Fields

1. Title (required)
2. Department
3. Location
4. Employment Type
5. Status
- open
- closed
- draft

---

## Buttons

- Save Job
- Cancel

---

## Success Flow

- Success toast
- Redirect to job details

---

# 5.3 Job Details

## Endpoint

GET `/api/v1/jobs/{job_id}`

---

## Route

`/jobs/:jobId`

---

## UI Sections

### Job Information Card

Display:

- Title
- Department
- Location
- Employment Type
- Status
- Created At

---

### Tabs

- Overview
- Versions

---

# 5.4 Update Job

## Endpoint

PATCH `/api/v1/jobs/{job_id}`

---

## UI Requirements

Editable fields:

- Title
- Department
- Location
- Employment Type
- Status

---

## UX

- Inline edit OR modal edit
- Unsaved changes warning

---

# 5.5 Delete Job

## Endpoint

DELETE `/api/v1/jobs/{job_id}`

---

## UX Requirements

### Delete Confirmation Modal

Message:

"Are you sure you want to delete this job?"

---

## Danger UI

- Red button
- Irreversible warning

---

# 6. Job Versions Module

---

# 6.1 List Job Versions

## Endpoint

GET `/api/v1/jobs/{job_id}/versions`

---

## User Story

As a recruiter,
I want multiple job versions,
so I can iterate hiring criteria over time.

---

## UI

### Versions Table

Columns:

- Version Number
- Criteria Mode
- Created At
- Actions

---

## Actions

- View Version
- Edit Version
- Delete Version
- Manage Criteria

---

# 6.2 Create Job Version

## Endpoint

POST `/api/v1/jobs/{job_id}/versions`

---

## Route

`/jobs/:jobId/versions/create`

---

## Form Fields

1. Raw JD Text
- textarea

2. Structured JD
- JSON editor

3. Criteria Mode
- manual
- ai
- hybrid

---

## Important Frontend Notes

### If criteria_mode = manual

- Show criteria management CTA

### If criteria_mode = ai

- Show AI-generated criteria notice

### If criteria_mode = hybrid

- Show both manual + AI notice

---

# 6.3 Get Job Version

## Endpoint

GET `/api/v1/jobs/{job_id}/versions/{version_id}`

---

## UI Sections

### Version Metadata

- Version Number
- Criteria Mode
- Created At

---

### Raw JD Section

- Read-only text area

---

### Structured JD Viewer

- JSON viewer

---

### Criteria Section

Display all evaluation criteria.

---

# 6.4 Update Job Version

## Endpoint

PATCH `/api/v1/jobs/{job_id}/versions/{version_id}`

---

## Editable Fields

- Raw JD Text
- Structured JD
- Criteria Mode

---

# 6.5 Delete Job Version

## Endpoint

DELETE `/api/v1/jobs/{job_id}/versions/{version_id}`

---

## UX

- Confirmation modal
- Version delete warning

---

# 7. Evaluation Criteria Module

---

# 7.1 Add Criteria

## Endpoint

POST `/api/v1/jobs/{job_id}/versions/{version_id}/criteria`

---

## User Story

As a recruiter,
I want to define evaluation criteria,
so AI scoring follows hiring requirements.

---

## Form Fields

1. Name
2. Description
3. Weight
4. Is Mandatory
5. Priority Level
- low
- medium
- high

---

## Validation Rules

- Name required
- Weight required

---

# 7.2 Replace All Criteria

## Endpoint

PUT `/api/v1/jobs/{job_id}/versions/{version_id}/criteria`

---

## UX

### Bulk Criteria Editor

- Dynamic rows
- Add/remove rows
- Save all

---

## Warning

Replacing criteria overwrites existing criteria.

---

# 7.3 Delete Criteria

## Endpoint

DELETE `/api/v1/jobs/{job_id}/versions/{version_id}/criteria/{criteria_id}`

---

## UX

- Trash icon
- Delete confirmation

---

# 8. Candidates Module

---

# 8.1 List Candidates

## Endpoint

GET `/api/v1/candidates`

---

## Route

`/candidates`

---

## UI Table

Columns:

- Name
- Email
- Phone
- LinkedIn
- GitHub
- Resume Status
- Source
- Active Status
- Actions

---

## Actions

- View
- Edit
- Delete
- Upload Resume
- Remove Resume

---

# 8.2 Create Candidate

## Endpoint

POST `/api/v1/candidates`

---

## Form Fields

1. Full Name
2. Email
3. Phone
4. LinkedIn URL
5. GitHub URL
6. Source

---

## Validation

- Name required
- Email required
- Valid email

---

# 8.3 Candidate Details

## Endpoint

GET `/api/v1/candidates/{candidate_id}`

---

## UI Sections

### Personal Information

- Full name
- Email
- Phone
- Social links

---

### Resume Section

- Resume uploaded status
- Upload button
- Delete button

---

### Application History

Loaded from applications endpoint.

---

# 8.4 Update Candidate

## Endpoint

PATCH `/api/v1/candidates/{candidate_id}`

---

## Editable Fields

- Full Name
- Email
- Phone
- LinkedIn
- GitHub
- Source
- Active status

---

# 8.5 Delete Candidate

## Endpoint

DELETE `/api/v1/candidates/{candidate_id}`

---

## UX

- Danger confirmation modal

---

# 8.6 Upload Resume

## Endpoint

POST `/api/v1/candidates/{candidate_id}/resume`

---

## UI Elements

### Upload Area

- Drag & drop
- File picker
- Upload progress

---

## States

- Uploading
- Success
- Failed

---

## Accepted Files

Frontend configurable:

- PDF
- DOCX

---

# 8.7 Delete Resume

## Endpoint

DELETE `/api/v1/candidates/{candidate_id}/resume`

---

## UX

- Delete confirmation modal

---

# 9. Applications Module

---

# 9.1 Create Application

## Endpoint

POST `/api/v1/applications`

---

## User Story

As a recruiter,
I want to link candidates to job versions,
so interview workflows can start.

---

## Form Fields

1. Candidate
2. Job Version

---

## UX

- Searchable selects
- Prevent duplicate submission

---

# 9.2 List Applications

## Endpoint

GET `/api/v1/applications`

---

## Query Filters

- candidate_id
- job_version_id

---

## UI Table

Columns:

- Application ID
- Candidate
- Job Version
- Status
- Created At
- Updated At
- Actions

---

## Actions

- View
- Update Status
- Delete
- Manage Sessions

---

# 9.3 Application Details

## Endpoint

GET `/api/v1/applications/{application_id}`

---

## UI Sections

- Candidate info
- Job version info
- Current status
- Related sessions

---

# 9.4 Update Application

## Endpoint

PATCH `/api/v1/applications/{application_id}`

---

## Editable Field

- Status

---

## Status Values

- applied
- screening
- interview
- offer
- hired
- rejected

---

# 9.5 Update Application Status

## Endpoint

PATCH `/api/v1/applications/{application_id}/status`

---

## UX

### Quick Status Change

- Dropdown
- Inline status badges

---

# 9.6 Delete Application

## Endpoint

DELETE `/api/v1/applications/{application_id}`

---

## UX

- Confirmation modal

---

# 10. Sessions Module

---

# 10.1 Create Session

## Endpoint

POST `/api/v1/sessions`

---

## User Story

As a recruiter,
I want to create interview sessions,
so AI evaluation can process interviews.

---

## Form Fields

1. Application ID
2. Session Type
- screening
- technical
- cultural_fit
- final

---

# 10.2 List Sessions

## Endpoint

GET `/api/v1/sessions`

---

## Query Filter

- application_id

---

## Table Columns

- Session ID
- Application ID
- Session Type
- Pipeline Status
- Created At
- Actions

---

## Actions

- View
- Upload Media
- Retry Pipeline
- View Transcript
- View Artifacts
- Delete Media
- Delete Session

---

# 10.3 Session Details

## Endpoint

GET `/api/v1/sessions/{session_id}`

---

## UI Sections

### Session Metadata

- Session type
- Pipeline status
- Created at

---

### Transcript Preview

- Full transcript

---

### Pipeline Status Badge

Values:

- pending
- running
- completed
- failed

---

# 10.4 Delete Session

## Endpoint

DELETE `/api/v1/sessions/{session_id}`

---

## UX

- Confirmation modal

---

# 10.5 Upload Interview Media

## Endpoint

POST `/api/v1/sessions/{session_id}/upload`

---

## User Story

As a recruiter,
I want to upload interview recordings,
so AI processing can begin.

---

## UI Elements

### Upload Zone

- Drag/drop
- Progress bar
- Retry upload

---

## States

- queued
- uploading
- processing
- success
- failed

---

## Supported Media

Frontend validation:

- mp3
- wav
- mp4
- webm

---

# 10.6 Session Pipeline Status

## Endpoint

GET `/api/v1/sessions/{session_id}/status`

---

## UI Requirements

### Real-Time Polling

Frontend should periodically refresh pipeline status.

---

## Displayed Data

- Run status
- Started at
- Completed at
- Error message
- Pipeline steps

---

# 10.7 Retry Pipeline

## Endpoint

POST `/api/v1/sessions/{session_id}/retry`

---

## UX

- Retry button visible when failed
- Retry confirmation modal

---

# 10.8 Get Transcript

## Endpoint

GET `/api/v1/sessions/{session_id}/transcript`

---

## UI

### Transcript Viewer

- Scrollable panel
- Copy transcript button

---

# 10.9 Get Session Artifacts

## Endpoint

GET `/api/v1/sessions/{session_id}/artifacts`

---

## UI Tabs

Artifact types:

- transcript
- qa_pairs
- evidence_quotes
- competency_map

---

## Artifact Viewer

- JSON pretty viewer
- Expand/collapse blocks

---

# 10.10 Delete Session Media

## Endpoint

DELETE `/api/v1/sessions/{session_id}/media`

---

## UX

### Warning Modal

"Deleting media removes uploaded audio/video permanently."

---

# 11. Evaluations Module

---

# 11.1 Get Evaluation By Session

## Endpoint

GET `/api/v1/evaluations/session/{session_id}`

---

## User Story

As a recruiter,
I want AI-generated evaluation results,
so I can make hiring decisions.

---

## Route

`/sessions/:sessionId/evaluation`

---

## UI Sections

### Overall Score Card

Display:

- Overall score
- Hiring recommendation
- Confidence score

---

### Recommendation Badge

Values:

- strong_hire
- hire
- no_hire
- strong_no_hire

---

### Executive Summary

- Rich text panel

---

### Competency Breakdown

- Score cards
- Progress bars

---

### Strengths

- Bullet cards

---

### Weaknesses

- Bullet cards

---

### Suggested Questions

- Expandable list

---

### Interviewer Notes

- Editable notes panel

---

# 11.2 Get Evaluation

## Endpoint

GET `/api/v1/evaluations/{evaluation_id}`

---

## UI

Full evaluation detail page.

---

# 11.3 Delete Evaluation

## Endpoint

DELETE `/api/v1/evaluations/{evaluation_id}`

---

## UX

- Delete confirmation
- Dangerous action warning

---

# 11.4 Get Insights

## Endpoint

GET `/api/v1/evaluations/{evaluation_id}/insights`

---

## UI Sections

- Strengths
- Weaknesses
- Interviewer Notes

---

# 11.5 Suggested Questions

## Endpoint

GET `/api/v1/evaluations/{evaluation_id}/suggested-questions`

---

## UI

### Follow-up Question Cards

Each card contains:

- Question text
- Expand details

---

# 11.6 Update Evaluation Notes

## Endpoint

PATCH `/api/v1/evaluations/{evaluation_id}/notes`

---

## UX

### Editable Notes Editor

- Save notes button
- Auto-save optional

---

# 12. Pipeline Monitoring Module

---

# 12.1 Get Pipeline Run

## Endpoint

GET `/api/v1/pipeline/runs/{run_id}`

---

## UI Sections

### Pipeline Summary

- Status
- Started at
- Completed at
- Error message

---

### Steps Timeline

Show all steps:

- audio_extract
- stt
- qa_extraction
- scoring
- insight_generation

---

## Step States

- pending
- running
- success
- failed

---

# 12.2 Pipeline Steps

## Endpoint

GET `/api/v1/pipeline/runs/{run_id}/steps`

---

## Table Columns

- Step Name
- Status
- Tokens Used
- Latency
- Prompt Version
- Started At
- Completed At
- Error Message

---

# 12.3 Retry Pipeline Step

## Endpoint

POST `/api/v1/pipeline/runs/{run_id}/steps/{step_name}/retry`

---

## UX

- Retry button for failed steps
- Retry confirmation modal

---

# 13. Audit Logs Module

---

# 13.1 Get Audit Logs

## Endpoint

GET `/api/v1/audit/logs`

---

## User Story

As an admin,
I want to track system activity,
so actions are auditable.

---

## Route

`/audit-logs`

---

## Query Filters

- user_id
- limit
- offset

---

## Table Columns

- ID
- User ID
- Action
- Resource Type
- Resource ID
- IP Address
- User Agent
- Created At

---

## Action Values

- create
- update
- delete
- login
- pipeline_trigger
- report_view

---

## UI Features

- Pagination
- Search
- Filters
- Expand details JSON

---

# 14. Health Monitoring Module

---

# 14.1 Health Check

## Endpoint

GET `/api/v1/health`

---

## UI

### System Status Indicator

Display:

- API online/offline

---

# 14.2 Database Health

## Endpoint

GET `/api/v1/health/db`

---

## UI

### Database Status Widget

- Healthy
- Unhealthy

---

# 14.3 Readiness Probe

## Endpoint

GET `/api/v1/health/ready`

---

## UI

### Readiness Status

- Ready
- Not Ready

---

# 15. Global Frontend Requirements

---

# 15.1 API Layer

Frontend MUST support:

- Bearer authentication
- Auto token injection
- Refresh token handling
- Global API error handling
- Request retry handling

---

# 15.2 Notifications

System-wide notifications:

- Success toast
- Error toast
- Warning toast
- Info toast

---

# 15.3 Loading States

Every API action MUST support:

- Skeleton loading
- Spinner loading
- Disabled submit buttons

---

# 15.4 Empty States

Every listing screen MUST support:

- Empty illustrations
- CTA buttons
- Retry actions

---

# 15.5 Error Handling

Every API request MUST support:

- 401 handling
- 403 handling
- 404 handling
- 422 validation handling
- 500 server handling
- Network failure handling

---

# 15.6 Reusable Components

Required shared frontend components:

- DataTable
- Pagination
- SearchInput
- StatusBadge
- ConfirmationModal
- JSONViewer
- FileUploader
- Tabs
- Drawer
- ToastProvider
- ProtectedRoute
- LoadingOverlay

---

# 15.7 Route Protection

All authenticated routes MUST:

- Validate token
- Redirect unauthenticated users
- Refresh token automatically

---

# 15.8 Responsive Design

Frontend MUST support:

- Desktop
- Tablet
- Mobile

---

# 15.9 Accessibility

Frontend SHOULD support:

- Keyboard navigation
- Accessible labels
- Focus states
- ARIA attributes

---

# 15.10 State Management

Frontend state categories:

- Auth state
- Jobs state
- Candidates state
- Applications state
- Sessions state
- Evaluations state
- Pipeline state
- Audit logs state

---

# 16. Full Frontend Route Map

## Public Routes

- /login
- /register

---

## Protected Routes

- /dashboard
- /profile

---

## Jobs

- /jobs
- /jobs/create
- /jobs/:jobId
- /jobs/:jobId/edit
- /jobs/:jobId/versions/create
- /jobs/:jobId/versions/:versionId

---

## Candidates

- /candidates
- /candidates/create
- /candidates/:candidateId
- /candidates/:candidateId/edit

---

## Applications

- /applications
- /applications/create
- /applications/:applicationId

---

## Sessions

- /sessions
- /sessions/create
- /sessions/:sessionId
- /sessions/:sessionId/evaluation

---

## Evaluations

- /evaluations/:evaluationId

---

## Pipeline

- /pipeline/runs/:runId

---

## Audit

- /audit-logs

---

# 17. Final Implementation Rules For AI Agent

The AI implementation agent MUST:

1. Implement ONLY features mapped to provided endpoints.
2. NOT invent additional backend APIs.
3. NOT invent unsupported fields.
4. Respect enum values exactly.
5. Respect validation rules exactly.
6. Support all CRUD operations present in endpoints.
7. Implement all upload flows.
8. Implement all pipeline monitoring flows.
9. Implement all evaluation viewing flows.
10. Implement all audit log viewing flows.
11. Implement proper loading/error states.
12. Implement authenticated route protection.
13. Implement reusable UI components.
14. Implement responsive layouts.
15. Implement frontend forms matching request schemas exactly.
16. Implement tables/cards matching response schemas exactly.
17. Implement all retry flows.
18. Implement confirmation modals for destructive actions.
19. Implement JSON viewers where backend returns object payloads.
20. Keep frontend architecture scalable and modular.

---

# END OF SPECIFICATION

