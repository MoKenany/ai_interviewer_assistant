# 🐛 Quick Fix Reference - أمثلة الإصلاح السريع

## Validation

قائمة بكل الملفات التي تحتاج إلى تعديل مع أرقام الأسطر الحالية

---

## ❌ File 1: `app/models/interview_evaluation.py`

### المشكلة الحالية:
```python
# سطر 16-22: JSON بدون validation
strengths = Column(JSON_TYPE, nullable=True)
weaknesses = Column(JSON_TYPE, nullable=True)
interviewer_notes = Column(JSON_TYPE, nullable=True)
suggested_questions = Column(JSON_TYPE, nullable=True)
```

### الحل المقترح:
```python
# أضف validator
from pydantic import validator

class InterviewEvaluationValidator(BaseModel):
    """Validates evaluation data structure"""
    strengths: List[dict]
    weaknesses: List[dict]
    interviewer_notes: dict
    suggested_questions: List[dict]
    
    @validator('strengths')
    def validate_strengths(cls, v):
        for item in v:
            assert 'criterion' in item, "Missing 'criterion' field"
            assert 'description' in item, "Missing 'description' field"
            assert 'evidence_quote' in item, "Missing 'evidence_quote' field"
        return v

# في Model
strengths = Column(JSON_TYPE, nullable=True)

# في Service قبل الحفظ
try:
    validator = InterviewEvaluationValidator(**data)
    evaluation.strengths = validator.strengths
except ValidationError as e:
    raise ValueError(f"Invalid strengths data: {e}")
```

---

## ❌ File 2: `app/core/ai/gemini_client.py`

### المشكلة الحالية (سطر 54-59):
```python
def extract_tokens(response) -> int:
    try:
        if hasattr(response, "usage_metadata") and response.usage_metadata:
            return response.usage_metadata.get("total_tokens") or 0
        if hasattr(response, "response_metadata") and response.response_metadata:
            token_usage = response.response_metadata.get("token_usage") or {}
            if token_usage:
                return token_usage.get("total_tokens") or token_usage.get("prompt_tokens", 0) + token_usage.get("completion_tokens", 0)
    except Exception:
        pass
    try:
        content_len = len(getattr(response, "content", ""))
        return max(1, int(content_len / 4))  # ❌ خطأ: قسمة ثابتة
    except Exception:
        return 0
```

### الحل:
```python
def extract_tokens(response) -> tuple[int, int, int]:
    """
    Extract token usage from response
    Returns: (total_tokens, prompt_tokens, completion_tokens)
    """
    try:
        if hasattr(response, "usage_metadata") and response.usage_metadata:
            usage = response.usage_metadata
            return (
                usage.get("total_tokens", 0),
                usage.get("prompt_tokens", 0),
                usage.get("completion_tokens", 0)
            )
        if hasattr(response, "response_metadata") and response.response_metadata:
            token_usage = response.response_metadata.get("token_usage", {})
            if token_usage:
                return (
                    token_usage.get("total_tokens", 0),
                    token_usage.get("prompt_tokens", 0),
                    token_usage.get("completion_tokens", 0)
                )
    except Exception as e:
        logger.warning(f"Failed to extract tokens: {e}")
    
    # Fallback: realistic estimate for Arabic/English
    try:
        content_len = len(getattr(response, "content", ""))
        # More realistic: ~1 token per 3-3.5 characters
        estimated = max(1, int(content_len / 3.5))
        return (estimated, estimated // 2, estimated // 2)
    except Exception:
        return (0, 0, 0)
```

---

## ❌ File 3: `app/tasks/pipeline_tasks.py`

### المشكلة الحالية (سطر 164):
```python
# ❌ توكن غير دقيق للـ STT
step_stt.tokens_used = max(1, int(len(transcript) / 4))
```

### الحل:
```python
# ✅ احصل على الـ tokens من Groq API نفسه
transcript, stt_tokens = await GroqClient.transcribe(audio_path)
# Groq API يجب أن يرجع tokens أيضاً

# إذا لم يرجعها
stt_tokens = estimate_tokens(transcript, detect_language(transcript))

step_stt.tokens_used = stt_tokens
```

---

## ❌ File 4: `app/core/config.py`

### المشكلة الحالية (سطر 13):
```python
# ❌ Credentials مكشوفة
DATABASE_URL: str = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://postgres:admin123@localhost:5432/ai_interview_db"
)

# ❌ Secret key ضعيف
SECRET_KEY: str = os.getenv("SECRET_KEY", "change_me_in_production")
```

### الحل:
```python
# ✅ إجبر تعيين المتغيرات من البيئة في الـ production
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str  # مطلوب
    SECRET_KEY: str  # مطلوب
    GEMINI_API_KEY: str  # مطلوب
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
    
    @validator('SECRET_KEY', pre=True)
    def validate_secret_key(cls, v):
        if v == "change_me_in_production":
            raise ValueError("SECRET_KEY must be changed from default value")
        if len(v) < 32:
            raise ValueError("SECRET_KEY must be at least 32 characters")
        return v

settings = Settings()
```

---

## ❌ File 5: `app/api/v1/sessions.py`

### المشكلة الحالية:
```python
# ❌ بدون response model
@router.post("/sessions/{session_id}/upload")
async def upload_media(session_id: int, file: UploadFile, background_tasks: BackgroundTasks):
    # ...
    background_tasks.add_task(run_interview_pipeline, session_id)  # ❌ BackgroundTasks غير موثوق
    return {"status": "uploading"}  # ❌ response model مفقود
```

### الحل:
```python
from pydantic import BaseModel
from app.tasks.pipeline_tasks import run_interview_pipeline_task

class SessionUploadResponse(BaseModel):
    session_id: int
    task_id: str
    status: str  # "queued"
    message: str

@router.post(
    "/sessions/{session_id}/upload",
    response_model=SessionUploadResponse
)
async def upload_media(session_id: int, file: UploadFile):
    """
    Upload interview media and queue for processing
    
    - Uses Celery task queue for reliability
    - Returns task_id for polling progress
    """
    async with db_session() as db:
        session = await db.get(InterviewSession, session_id)
        
        # ✅ تحقق من الـ state
        if session.pipeline_status == PipelineStatusEnum.running:
            raise HTTPException(
                status_code=409,
                detail={
                    "error_type": "pipeline_already_running",
                    "message": "A pipeline is already running for this session"
                }
            )
        
        # ✅ احفظ الملف
        media = await save_uploaded_file(file, session_id)
        session.media_file_id = media.id
        session.pipeline_status = PipelineStatusEnum.pending
        await db.commit()
    
    # ✅ استخدم Celery بدل BackgroundTasks
    task = run_interview_pipeline_task.delay(session_id)
    
    return SessionUploadResponse(
        session_id=session_id,
        task_id=task.id,
        status="queued",
        message="Pipeline task queued successfully"
    )
```

---

## ❌ File 6: `app/models/interview_session.py`

### المشكلة الحالية (سطر 21-30):
```python
class InterviewSession(Base):
    # ...
    media_file_id = Column(Integer, ForeignKey("media_files.id", use_alter=True, name="fk_session_media"), nullable=True)
    pipeline_status = Column(Enum(PipelineStatusEnum), default=PipelineStatusEnum.pending)
    full_transcript = Column(Text, nullable=True)  # ❌ تكرار من SessionArtifact
    
    media_file = relationship("MediaFile", foreign_keys=[media_file_id], post_update=True)
```

### الحل:
```python
class InterviewSession(Base):
    # ...
    media_file_id = Column(Integer, ForeignKey("media_files.id"), unique=True, nullable=True)
    pipeline_status = Column(Enum(PipelineStatusEnum), default=PipelineStatusEnum.pending, index=True)
    
    # ✅ احذف full_transcript - احصل عليه من SessionArtifact عند الحاجة
    media_file = relationship("MediaFile", foreign_keys=[media_file_id], cascade="all, delete-orphan")
    
    @property
    def full_transcript(self) -> str:
        """Get transcript from artifacts (computed property)"""
        from sqlalchemy import select
        query = select(SessionArtifact).filter(
            SessionArtifact.session_id == self.id,
            SessionArtifact.artifact_type == "transcript"
        )
        artifact = db.execute(query).scalars().first()
        return artifact.content.get("transcript", "") if artifact else ""
```

---

## ❌ File 7: `app/models/session_artifact.py`

### المشكلة الحالية:
```python
# ❌ بدون indexes
class SessionArtifact(Base):
    __tablename__ = "session_artifacts"
    
    id = Column(Integer, primary_key=True)
    session_id = Column(Integer, ForeignKey("interview_sessions.id"))  # ❌ بدون index
    pipeline_step_id = Column(Integer, ForeignKey("ai_pipeline_steps.id"))
    artifact_type = Column(Enum(ArtifactTypeEnum))
```

### الحل:
```python
class SessionArtifact(Base):
    __tablename__ = "session_artifacts"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("interview_sessions.id"), index=True)  # ✅ indexed
    pipeline_step_id = Column(Integer, ForeignKey("ai_pipeline_steps.id"), index=True)  # ✅ indexed
    artifact_type = Column(Enum(ArtifactTypeEnum), index=True)
    
    # ✅ Composite index للعمليات المتكررة
    __table_args__ = (
        Index('idx_session_artifact_type', 'session_id', 'artifact_type'),
        Index('idx_pipeline_step_type', 'pipeline_step_id', 'artifact_type'),
    )
```

---

## ✅ Frontend Fixes

### File 8: `frontend-v2/js/core/api.js`

### المشكلة الحالية:
```javascript
// ❌ بدون error handling مناسب
async get(endpoint) {
    return this.fetch(endpoint, { method: 'GET' });
}

// ❌ بدون refresh token logic
if (response.status === 401) {
    window.location.hash = '#/login';
    throw new Error('Unauthorized');
}
```

### الحل:
```javascript
async post(endpoint, body) {
    return this.fetch(endpoint, {
        method: 'POST',
        body: JSON.stringify(body)
    });
}

async patch(endpoint, body) {
    return this.fetch(endpoint, {
        method: 'PATCH',
        body: JSON.stringify(body)
    });
}

async delete(endpoint) {
    return this.fetch(endpoint, {
        method: 'DELETE'
    });
}

// ✅ Better error handling
async fetch(endpoint, options = {}) {
    const token = localStorage.getItem('access_token');
    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...(options.headers || {})
    };

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            // ✅ تمييز أنواع الأخطاء
            if (response.status === 401) {
                localStorage.removeItem('access_token');
                window.location.hash = '#/auth';
            }
            
            const errorDetail = data.detail || {};
            throw new APIError(
                errorDetail.message || 'Unknown error',
                errorDetail.error_type,
                response.status
            );
        }
        
        return data;
        
    } catch (error) {
        console.error(`API Error [${endpoint}]:`, error);
        throw error;
    }
}
```

---

## 📋 Implementation Timeline

### Week 1 (الأسبوع الأول)
```
Mon-Tue: Setup Celery + Redis
Wed:     Implement TokenBudget
Thu:     Update Pipeline Task
Fri:     Test Pipeline Reliability
```

### Week 2 (الأسبوع الثاني)
```
Mon:     Create Response Models
Tue:     Update API Endpoints
Wed:     Add Polling Frontend
Thu:     Integration Testing
Fri:     Performance Testing
```

### Week 3 (الأسبوع الثالث)
```
Mon-Tue: Database Migrations (add indexes)
Wed:     Validation Implementation
Thu:     Error Handling Improvements
Fri:     End-to-End Testing
```

---

## 🧪 Testing Checklist

### Unit Tests
- [ ] TokenBudget calculations
- [ ] Token extraction from responses
- [ ] Validation functions
- [ ] Error classification

### Integration Tests
- [ ] Celery task queueing and execution
- [ ] Pipeline retry logic
- [ ] Database transactions
- [ ] API response validation

### End-to-End Tests
- [ ] Full pipeline execution
- [ ] Frontend polling
- [ ] Error recovery
- [ ] Load testing (10+ concurrent uploads)

---

## 📊 Success Metrics

ستعرف أن الإصلاح نجح عندما:

✅ Pipeline tasks تكمل بنجاح حتى بعد إعادة تشغيل الـ server
✅ Token usage متنبأ به ودقيق (±10%)
✅ Frontend يعرض progress updates في الـ real-time
✅ أي خطأ يتم catch و log مع إمكانية الـ retry
✅ No data loss even if server crashes mid-pipeline
✅ API responses match frontend expectations
