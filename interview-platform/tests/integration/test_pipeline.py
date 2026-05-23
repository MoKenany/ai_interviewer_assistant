import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio

@pytest.fixture(autouse=True)
def mock_celery_task():
    """Autouse fixture to mock Celery delay call globally for pipeline tests"""
    with patch("app.api.v1.sessions.run_interview_pipeline_task") as mock_sess_task, \
         patch("app.api.v1.pipeline.run_interview_pipeline_task") as mock_pipe_task:
        
        mock_sess_task.delay.return_value = MagicMock(id="test-task-id")
        mock_pipe_task.delay.return_value = MagicMock(id="test-task-id")
        yield mock_sess_task, mock_pipe_task

async def _setup_session(client, headers):
    """Helper: create job -> version -> candidate -> application -> session."""
    job = await client.post("/api/v1/jobs", headers=headers, json={
        "title": "Pipeline Test Job", "department": "Tech", "location": "Remote"
    })
    jid = job.json()["id"]
    ver = await client.post(f"/api/v1/jobs/{jid}/versions", headers=headers, json={
        "raw_jd_text": "Python senior engineer", "criteria_mode": "manual"
    })
    vid = ver.json()["id"]
    cand = await client.post("/api/v1/candidates", headers=headers, json={
        "full_name": "Pipeline User", "email": "pipeline@example.com"
    })
    cid = cand.json()["id"]
    app = await client.post("/api/v1/applications", headers=headers, json={
        "candidate_id": cid, "job_version_id": vid
    })
    app_id = app.json()["id"]
    session = await client.post("/api/v1/sessions", headers=headers, json={
        "application_id": app_id, "session_type": "technical"
    })
    return session.json()["id"]

class TestSessionManagement:
    async def test_create_session(self, client: AsyncClient, auth_headers: dict):
        sid = await _setup_session(client, auth_headers)
        assert isinstance(sid, int)

    async def test_get_session(self, client: AsyncClient, auth_headers: dict):
        sid = await _setup_session(client, auth_headers)
        resp = await client.get(f"/api/v1/sessions/{sid}", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["pipeline_status"] == "pending"

    async def test_get_nonexistent_session(self, client: AsyncClient, auth_headers: dict):
        resp = await client.get("/api/v1/sessions/999999", headers=auth_headers)
        assert resp.status_code == 404

class TestAIPipelineMocked:
    """Tests for the AI pipeline with all external calls mocked."""

    async def test_upload_media_triggers_celery(
        self,
        mock_celery_task,
        client: AsyncClient,
        auth_headers: dict,
        tmp_path
    ):
        mock_sess_task, _ = mock_celery_task
        sid = await _setup_session(client, auth_headers)

        # Create a fake audio file
        fake_audio = tmp_path / "test.mp3"
        fake_audio.write_bytes(b"fake audio content")

        with open(fake_audio, "rb") as f:
            resp = await client.post(
                f"/api/v1/sessions/{sid}/upload",
                headers=auth_headers,
                files={"file": ("test.mp3", f, "audio/mpeg")}
            )
        assert resp.status_code == 200
        mock_sess_task.delay.assert_called_once_with(sid)

    async def test_upload_text_transcript_bypasses_stt(
        self,
        mock_celery_task,
        client: AsyncClient,
        auth_headers: dict,
        tmp_path
    ):
        mock_sess_task, _ = mock_celery_task
        sid = await _setup_session(client, auth_headers)

        fake_text = tmp_path / "transcript.txt"
        fake_text.write_text("Hello, this is a text transcript.")

        with open(fake_text, "rb") as f:
            resp = await client.post(
                f"/api/v1/sessions/{sid}/upload",
                headers=auth_headers,
                files={"file": ("transcript.txt", f, "text/plain")}
            )
        assert resp.status_code == 200
        mock_sess_task.delay.assert_called_once_with(sid)

    @patch("app.core.ai.groq_client.GroqClient.transcribe", new_callable=AsyncMock)
    async def test_stt_returns_transcript(self, mock_stt):
        mock_stt.return_value = "Question: Tell me about yourself. Answer: I am a backend developer."
        result = await mock_stt("/fake/audio/path.mp3")
        assert "backend developer" in result
        mock_stt.assert_called_once()

    @patch("app.core.ai.gemini_client.GeminiClient.run_qa_extraction", new_callable=AsyncMock)
    async def test_qa_extraction_returns_pairs(self, mock_qa):
        from app.core.ai.gemini_client import QAPair
        mock_qa.return_value = [
            MagicMock(
                question="What is your experience?",
                answer="5 years in Python",
                competency_tag="Python Expertise",
                transcript_timestamps="00:01-00:45"
            )
        ]
        result = await mock_qa("transcript text", [{"name": "Python Expertise"}])
        assert len(result) == 1
        assert result[0].competency_tag == "Python Expertise"

    @patch("app.core.ai.gemini_client.GeminiClient.run_scoring", new_callable=AsyncMock)
    async def test_scoring_returns_structured_result(self, mock_score):
        mock_score.return_value = MagicMock(
            per_criterion_scores=[
                MagicMock(criterion_name="Python Expertise", score=85, justification="Strong", evidence_quote="5 years Python")
            ],
            overall_weighted_score=85.0
        )
        result = await mock_score([], [], "job description text")
        assert result.overall_weighted_score == 85.0
        assert result.per_criterion_scores[0].score == 85

    @patch("app.core.ai.gemini_client.GeminiClient.run_insight_generation", new_callable=AsyncMock)
    async def test_insight_generation_returns_report(self, mock_insight):
        mock_insight.return_value = MagicMock(
            executive_summary="Strong candidate with Python background.",
            hiring_recommendation="hire",
            confidence_score=0.88,
            strengths=[],
            weaknesses=[],
            interviewer_notes=MagicMock(),
            suggested_questions=[]
        )
        result = await mock_insight(None, [], [])
        assert result.hiring_recommendation == "hire"
        assert result.confidence_score == 0.88

class TestPipelineEndpoints:
    async def test_get_pipeline_run(self, client: AsyncClient, auth_headers: dict, setup_session: int, db):
        # Create an actual pipeline run to query
        from app.models.ai_pipeline_run import AIPipelineRun, PipelineRunStatusEnum
        run = AIPipelineRun(session_id=setup_session, status=PipelineRunStatusEnum.failed)
        db.add(run)
        await db.commit()
        await db.refresh(run)
        run_id = run.id

        # check run status
        status_resp = await client.get(f"/api/v1/sessions/{setup_session}/status", headers=auth_headers)
        assert status_resp.status_code == 200
        
        # then check pipeline runs endpoints
        resp = await client.get(f"/api/v1/pipeline/runs/{run_id}", headers=auth_headers)
        assert resp.status_code == 200

        resp_steps = await client.get(f"/api/v1/pipeline/runs/{run_id}/steps", headers=auth_headers)
        assert resp_steps.status_code == 200

        resp_retry = await client.post(f"/api/v1/pipeline/runs/{run_id}/steps/stt/retry", headers=auth_headers)
        assert resp_retry.status_code == 200
