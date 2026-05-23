# 📋 Issue Tracking & Implementation Roadmap

## All 21 Issues - Complete Reference

### Legend
| Symbol | Meaning |
|--------|---------|
| 🔴🔴 | Critical - blocks production |
| 🔴 | High - must fix soon |
| 🟠 | Medium - should fix |
| 🟡 | Low - nice to have |

---

## ISSUE TRACKER

### Category 1: DATABASE MODELS (4 Issues)

| # | Title | Component | Severity | Status | Est. Hours | Start | End | PR | Notes |
|---|-------|-----------|----------|--------|-----------|-------|-----|----|----|
| 1.1 | Circular FK: InterviewSession ↔ MediaFile | `app/models/` | 🟠 | ⏳ Planned | 4 | - | - | - | Refactor: remove FK from MediaFile, keep only in InterviewSession |
| 1.2 | JSON validation missing (strengths, weaknesses) | `app/models/interview_evaluation.py` | 🟠 | ⏳ Planned | 3 | - | - | - | Add Pydantic validators before storage |
| 1.3 | Missing indexes on foreign keys | `app/models/session_artifact.py` | 🟠 | ⏳ Planned | 2 | - | - | - | Add index on session_id, pipeline_step_id; composite index on both |
| 1.4 | Data duplication: full_transcript stored twice | `app/models/interview_session.py` | 🟠 | ⏳ Planned | 3 | - | - | - | Make full_transcript a computed property, remove from InterviewSession |

### Category 2: PIPELINE & PROCESSING (5 Issues)

| # | Title | Component | Severity | Status | Est. Hours | Start | End | PR | Notes |
|---|-------|-----------|----------|--------|-----------|-------|-----|----|----|
| 2.1 | BackgroundTasks not persistent (data loss risk) | `app/api/v1/sessions.py` | 🔴🔴 | ⏳ Planned | 8 | - | - | - | Replace with Celery + Redis for reliability |
| 2.2 | No idempotency checks (duplicate processing) | `app/services/session_service.py` | 🔴 | ⏳ Planned | 4 | - | - | - | Add idempotency_key + state checks |
| 2.3 | Sequential execution (slow pipeline) | `app/tasks/pipeline_tasks.py` | 🔴 | ⏳ Planned | 6 | - | - | - | Run QA extraction & insights in parallel |
| 2.4 | No timeout on AI API calls (server hang) | `app/tasks/pipeline_tasks.py` | 🔴🔴 | ⏳ Planned | 3 | - | - | - | Add asyncio.wait_for with 5min timeout per call |
| 2.5 | Poor error handling (step fails = pipeline fails) | `app/tasks/pipeline_tasks.py` | 🔴 | ⏳ Planned | 5 | - | - | - | Distinguish retriable vs fatal errors; retry logic |

### Category 3: TOKEN MANAGEMENT (4 Issues)

| # | Title | Component | Severity | Status | Est. Hours | Start | End | PR | Notes |
|---|-------|-----------|----------|--------|-----------|-------|-----|----|----|
| 3.1 | Token tracking with context vars (thread-unsafe) | `app/core/ai/gemini_client.py` | 🔴 | ⏳ Planned | 4 | - | - | - | Replace with TokenBudget class, pass explicitly |
| 3.2 | Token calculation wrong (len / 4 inaccurate) | `app/core/ai/gemini_client.py` | 🔴 | ⏳ Planned | 3 | - | - | - | Detect language, adjust ratio; get from API when possible |
| 3.3 | No token budget limit (cost explosion) | `app/core/token_budget.py` | 🔴🔴 | ⏳ Planned | 5 | - | - | - | Implement TokenBudget class with max_tokens_per_session |
| 3.4 | Token usage non-deterministic (can't predict costs) | `app/core/ai/gemini_client.py` | 🔴 | ⏳ Planned | 4 | - | - | - | Track prompt + completion tokens separately; build forecasting model |

### Category 4: API & INTEGRATION (5 Issues)

| # | Title | Component | Severity | Status | Est. Hours | Start | End | PR | Notes |
|---|-------|-----------|----------|--------|-----------|-------|-----|----|----|
| 4.1 | No Response Models (raw SQLAlchemy objects) | `app/api/v1/` | 🔴 | ⏳ Planned | 4 | - | - | - | Create response_model for all endpoints |
| 4.2 | API response format mismatch (frontend expects dict, gets list) | `app/api/v1/evaluations.py` | 🔴 | ⏳ Planned | 2 | - | - | - | Convert competency_breakdown from list to dict |
| 4.3 | Generic error handling (can't distinguish error types) | `app/api/v1/` | 🔴 | ⏳ Planned | 3 | - | - | - | Create custom HTTPExceptions for each error type |
| 4.4 | CORS too permissive (security risk) | `app/main.py` | 🔴 | ⏳ Planned | 1 | - | - | - | Restrict to specific origins; remove allow_methods=["*"] |
| 4.5 | No JWT refresh logic (token expiry issues) | `app/api/v1/auth.py` | 🟠 | ⏳ Planned | 3 | - | - | - | Add refresh token endpoint + frontend logic |

### Category 5: FRONTEND (3 Issues)

| # | Title | Component | Severity | Status | Est. Hours | Start | End | PR | Notes |
|---|-------|-----------|----------|--------|-----------|-------|-----|----|----|
| 5.1 | No polling for pipeline status (poor UX) | `frontend-v2/js/sections/SessionsSection.js` | 🟠 | ⏳ Planned | 3 | - | - | - | Create PipelinePoller class; poll every 2 seconds |
| 5.2 | Weak error handling (generic alert) | `frontend-v2/js/core/api.js` | 🟠 | ⏳ Planned | 2 | - | - | - | Parse error_type from response; show specific messages |
| 5.3 | No form validation (bad UX on submit) | `frontend-v2/js/sections/` | 🟡 | ⏳ Planned | 4 | - | - | - | Add form validation before submit |

---

## Implementation Timeline

### PHASE 1: Foundation (Week 1) - 🔴 Critical Fixes

```
Monday:
  ├─ Issue 2.1: Setup Celery + Redis infrastructure
  ├─ Issue 2.1: Convert BackgroundTasks to Celery task
  └─ Verify Celery worker runs successfully

Tuesday:
  ├─ Issue 3.3: Create TokenBudget class
  ├─ Issue 3.1: Replace context var with TokenBudget
  ├─ Issue 3.2: Fix token calculation logic
  └─ Test token tracking accuracy

Wednesday:
  ├─ Issue 2.4: Add timeout decorators to Gemini/Groq calls
  ├─ Issue 2.5: Improve error handling (try/catch per step)
  └─ Test timeout behavior

Thursday:
  ├─ Issue 4.1: Create Response Models (Pydantic)
  ├─ Issue 4.2: Fix API format mismatches
  └─ Test response validation

Friday:
  ├─ Issue 4.3: Create custom HTTPExceptions
  ├─ Issue 5.1: Create frontend PipelinePoller class
  └─ Integration testing: Full pipeline flow
```

### PHASE 2: Quality Improvements (Week 2)

```
Monday:
  ├─ Issue 1.3: Add database indexes
  ├─ Issue 1.1: Fix circular FK relationships
  └─ Run migrations

Tuesday:
  ├─ Issue 2.2: Add idempotency checks
  ├─ Issue 2.3: Parallelize QA + Insights extraction
  └─ Performance testing

Wednesday:
  ├─ Issue 1.2: Add JSON validation to models
  ├─ Issue 1.4: Remove full_transcript duplication
  └─ Data migration

Thursday:
  ├─ Issue 4.4: Fix CORS configuration
  ├─ Issue 4.5: Add JWT refresh logic
  ├─ Issue 5.2: Improve frontend error handling
  └─ Security review

Friday:
  ├─ Complete testing
  ├─ Performance benchmarking
  ├─ Documentation update
  └─ Code review + merge
```

---

## Effort Breakdown

```
Category              # Issues  Hours  Days  Priority
────────────────────────────────────────────────────
Database              4         12     1.5   🟠
Pipeline              5         26     3.25  🔴🔴
Token Management      4         16     2     🔴
API Integration       5         13     1.6   🔴
Frontend              3         9      1.1   🟠
────────────────────────────────────────────────────
TOTAL                 21        76     9.5   Mixed
```

**Total: ~10 work days (2 weeks)**

---

## Dependencies Map

```
Start Here:
  ↓
2.1: BackgroundTasks → Celery (foundation)
  ↓
  ├─→ 3.3: Token Budget (depends on pipeline stable)
  ├─→ 2.4: Add Timeouts (independent)
  └─→ 4.1: Response Models (independent)
       ↓
       ├─→ 4.2: Fix response formats
       ├─→ 5.1: Frontend polling
       └─→ 5.2: Error handling
  ↓
2.2: Idempotency (after pipeline stable)
  ↓
1.3: Add Indexes (anytime)
  ↓
1.2: JSON Validation (after indexes)
  ↓
1.1: Fix circular FK (schema change)
  ↓
1.4: Remove duplication (after FK fix)
```

---

## Testing Plan

### Unit Tests (8 hours)
```
Issue 3.1 → TokenBudget calculations
Issue 3.2 → Token estimation functions
Issue 4.3 → Custom exceptions
Issue 5.1 → PipelinePoller class
Issue 1.2 → Validators
Issue 2.5 → Error classification
```

### Integration Tests (6 hours)
```
Issue 2.1 → Celery task queueing
Issue 2.2 → Idempotency logic
Issue 4.1 → Response model validation
Issue 2.4 → Timeout handling
```

### End-to-End Tests (4 hours)
```
Full pipeline execution
- With data loss simulation (server crash)
- With token budget exceeded
- With timeout scenarios
- With concurrent uploads (10+)
```

### Performance Tests (2 hours)
```
- Query performance with indexes
- Pipeline latency improvement
- Memory usage under load
```

---

## Success Metrics

After all fixes are implemented:

| Metric | Before | After | Target |
|--------|--------|-------|--------|
| Pipeline Reliability | 70% | 99.5% | ✅ |
| Token Budget Predictability | 0% | 95% | ✅ |
| API Format Match | 60% | 100% | ✅ |
| Error Recovery Rate | 0% | 90% | ✅ |
| Database Query Speed | Slow | 10x faster | ✅ |
| Data Loss Incidents | Frequent | 0 | ✅ |
| Frontend UX (Real-time updates) | None | Real-time | ✅ |

---

## Risk Mitigation

### High Risk: BackgroundTasks → Celery Migration

**Risk**: Data loss during migration
**Mitigation**:
- Keep both systems running in parallel for 48 hours
- Gradually move 10% → 50% → 100% of traffic
- Automated rollback if failure rate > 1%

### High Risk: Token Tracking Changes

**Risk**: Lost token history during refactoring
**Mitigation**:
- Archive old token logs before changes
- Run parallel token counting for 24 hours
- Validate new counts match old within ±5%

### High Risk: Database Schema Changes

**Risk**: Migration fails, can't rollback
**Mitigation**:
- Full backup before each migration
- Test migration on staging first
- Rollback plan for each migration

---

## Checkpoints for Reviews

### After Week 1 (Critical Fixes)
- [ ] Celery running reliably
- [ ] Token budget enforced
- [ ] API responses validated
- [ ] Frontend polling works
- [ ] Pipeline doesn't lose data

**Go/No-Go Decision**: OK to proceed to Phase 2?

### After Week 2 (Improvements)
- [ ] Database optimized
- [ ] Error handling comprehensive
- [ ] Full integration tests pass
- [ ] Performance benchmarks meet targets
- [ ] Security review passed

**Final Approval**: Production ready?

---

## Change Log

```
2024-XX-XX: Created initial analysis (21 issues identified)
2024-XX-XX: Phase 1 started (Critical fixes)
2024-XX-XX: Phase 2 started (Quality improvements)
2024-XX-XX: All issues resolved
2024-XX-XX: Production deployment
```

---

## Contact & Questions

For questions about specific issues:
1. Refer to PROJECT_ANALYSIS_AR.md for detailed problem descriptions
2. Refer to IMPLEMENTATION_GUIDE.md for solution code
3. Refer to QUICK_FIX_REFERENCE.md for file-by-file changes

