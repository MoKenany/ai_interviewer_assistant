# 🚀 Implementation Guide - Quick Start

## Step 1: Install Dependencies

```bash
cd interview-platform

# Install new packages (Celery + Redis)
pip install -r requirements.txt
```

## Step 2: Start Redis Server

```bash
# Make sure Redis is installed and running
redis-server

# Or if using Docker:
docker run -d -p 6379:6379 redis:latest
```

**Verify Redis is running**:
```bash
redis-cli ping
# Should return: PONG
```

## Step 3: Update Environment Variables

Create/update your `.env` file:

```env
# Existing settings...
DATABASE_URL=postgresql+asyncpg://postgres:admin123@localhost:5432/ai_interview_db

# New Celery settings
REDIS_URL=redis://localhost:6379/0
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# Token Budget
MAX_TOKENS_PER_SESSION=50000          # 50k tokens max per session
AI_REQUEST_TIMEOUT=300                # 5 minutes timeout

# Celery Timeouts
CELERY_TASK_TIME_LIMIT=1800           # 30 minutes hard limit
CELERY_TASK_SOFT_TIME_LIMIT=1740      # 29 minutes soft limit
```

## Step 4: Start the Application

### Terminal 1 - Start FastAPI Server
```bash
python run.py
# or
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Terminal 2 - Start Celery Worker
```bash
celery -A app.celery_app worker --loglevel=info

# For multiple workers (higher concurrency):
celery -A app.celery_app worker --loglevel=info --concurrency=4

# With more verbose logging:
celery -A app.celery_app worker --loglevel=debug
```

### Terminal 3 - (Optional) Celery Flower Monitoring
```bash
# Install flower if not already installed
pip install flower

# Start flower
celery -A app.celery_app flower --port=5555

# Access at: http://localhost:5555
```

## Step 5: Test the Pipeline

### Upload an Interview

```bash
curl -X POST http://localhost:8000/api/v1/sessions/1/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@interview.mp4"
```

**Response**:
```json
{
  "session_id": 1,
  "task_id": "abc123def456",
  "status": "queued",
  "message": "Pipeline task queued successfully"
}
```

### Check Task Status

```bash
curl http://localhost:8000/api/v1/sessions/tasks/abc123def456 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response**:
```json
{
  "task_id": "abc123def456",
  "status": "STARTED",
  "result": null,
  "error": null
}
```

### Check Pipeline Status

```bash
curl http://localhost:8000/api/v1/sessions/1/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response**:
```json
{
  "id": 1,
  "status": "running",
  "started_at": "2024-05-18T10:30:00",
  "completed_at": null,
  "steps": [
    {
      "step_name": "audio_extract",
      "status": "success",
      "tokens_used": 0,
      "latency_ms": 2500
    },
    {
      "step_name": "stt",
      "status": "running",
      "tokens_used": 0,
      "latency_ms": null
    },
    ...
  ]
}
```

## Step 6: Frontend Updates

### Update Frontend Polling

In `frontend-v2/js/sections/SessionsSection.js`, use the new poller:

```javascript
import { PipelinePoller } from '../core/poller.js';

async function uploadSessionMedia(sessionId, file) {
    const response = await fetch(`/api/v1/sessions/${sessionId}/upload`, {
        method: 'POST',
        body: formData,
        headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const data = await response.json();
    
    // Start polling for pipeline progress
    const poller = new PipelinePoller(sessionId, {
        onUpdate: (status) => {
            updatePipelineUI(status);
        },
        onError: (error) => {
            showToast(`Error: ${error}`, 'error');
        }
    });
    
    poller.start();
}
```

## Troubleshooting

### Issue: "Connection refused" when connecting to Redis

**Solution**:
```bash
# Make sure Redis is running
redis-cli ping

# If not running, start it:
redis-server

# Or start with Docker:
docker run -d --name redis -p 6379:6379 redis:latest
```

### Issue: Celery worker won't start

**Solution**:
```bash
# Check if Redis is running
redis-cli ping

# Check if celery_app is properly configured
python -c "from app.celery_app import celery_app; print(celery_app.conf)"

# Start with more verbose output
celery -A app.celery_app worker --loglevel=debug
```

### Issue: Tasks not being executed

**Solution**:
```bash
# Check Redis is working
redis-cli KEYS '*'

# Check Celery queue
celery -A app.celery_app inspect active

# Check pending tasks
celery -A app.celery_app inspect reserved

# Purge stale tasks
celery -A app.celery_app purge
```

### Issue: "Task timed out"

**Solution**: Adjust timeouts in `.env`:
```env
AI_REQUEST_TIMEOUT=600         # Increase to 10 minutes
CELERY_TASK_TIME_LIMIT=3600    # Increase to 60 minutes
```

## Monitoring

### Using Flower (Web UI)

```bash
celery -A app.celery_app flower --port=5555
```

Then visit: http://localhost:5555

Features:
- Real-time task monitoring
- Worker status
- Task history
- Rate limiting configuration

### Using Celery CLI

```bash
# List active tasks
celery -A app.celery_app inspect active

# List scheduled tasks
celery -A app.celery_app inspect scheduled

# List registered tasks
celery -A app.celery_app inspect registered

# Get worker stats
celery -A app.celery_app inspect stats
```

## Files Changed

✅ **Created**:
- `app/celery_app.py` - Celery configuration
- `app/core/token_budget.py` - Token budget management
- `app/tasks/celery_exceptions.py` - Custom exceptions
- `app/schemas/responses.py` - Response models
- `app/tasks/pipeline_tasks_v2.py` - New Celery-based pipeline

✅ **Modified**:
- `app/core/config.py` - Added token budget settings
- `app/api/v1/sessions.py` - Updated endpoints to use Celery
- `requirements.txt` - Added Celery and Redis

## Next Steps

After confirming this works:

1. ✅ Remove old `app/tasks/pipeline_tasks.py` (backup first!)
2. ✅ Rename `pipeline_tasks_v2.py` → `pipeline_tasks.py`
3. ✅ Update database indexes (from ISSUE_TRACKER.md)
4. ✅ Add validation to JSON fields
5. ✅ Implement error handling improvements

## Support

If you encounter issues:
1. Check logs in all three terminals
2. Verify Redis is running: `redis-cli ping`
3. Check Flower at http://localhost:5555
4. Review error messages in pipeline_tasks.py logs

---

**Total Setup Time**: ~15 minutes
**Complexity**: Medium
**Risk**: Low (backward compatible)

