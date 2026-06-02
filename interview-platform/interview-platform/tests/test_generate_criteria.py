import asyncio
import pytest
from httpx import AsyncClient
from unittest.mock import AsyncMock, patch

from app.schemas.job import EvaluationCriteriaProposal
from app.services.job_service import _criteria_generation_locks

pytestmark = pytest.mark.asyncio


async def _create_version(client: AsyncClient, auth_headers: dict):
    job = await client.post("/api/v1/jobs", headers=auth_headers, json={
        "title": "Backend Engineer",
        "department": "Engineering",
        "location": "Remote",
    })
    job_id = job.json()["id"]

    version = await client.post(f"/api/v1/jobs/{job_id}/versions", headers=auth_headers, json={
        "raw_jd_text": "Senior Python backend engineer with FastAPI, PostgreSQL, ownership, and communication skills.",
        "criteria_mode": "manual",
    })
    return job_id, version.json()["id"]


@patch("app.core.ai.gemini_client.GeminiClient.run_jd_agent", new_callable=AsyncMock)
async def test_generate_criteria_uses_gemini_result(mock_jd_agent, client: AsyncClient, auth_headers: dict):
    mock_jd_agent.return_value = [
        EvaluationCriteriaProposal(
            name="Python Backend",
            description="Builds APIs with Python.",
            weight=100,
            is_mandatory=True,
            priority_level="high",
        )
    ]
    job_id, version_id = await _create_version(client, auth_headers)

    response = await client.post(
        f"/api/v1/jobs/{job_id}/versions/{version_id}/generate-criteria",
        headers=auth_headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data["criteria"]) == 1
    assert data["criteria"][0]["name"] == "Python Backend"


@patch("app.core.ai.gemini_client.GeminiClient.run_jd_agent", new_callable=AsyncMock)
async def test_generate_criteria_fails_loudly_on_gemini_quota(mock_jd_agent, client: AsyncClient, auth_headers: dict):
    mock_jd_agent.side_effect = RuntimeError("429 RESOURCE_EXHAUSTED quota exceeded")
    job_id, version_id = await _create_version(client, auth_headers)

    response = await client.post(
        f"/api/v1/jobs/{job_id}/versions/{version_id}/generate-criteria",
        headers=auth_headers,
    )

    assert response.status_code == 502
    assert "AI criteria extraction failed" in response.json()["detail"]


@patch("app.core.ai.gemini_client.GeminiClient.run_jd_agent", new_callable=AsyncMock)
async def test_generate_criteria_rejects_duplicate_inflight_request(mock_jd_agent, client: AsyncClient, auth_headers: dict):
    job_id, version_id = await _create_version(client, auth_headers)
    lock_key = (job_id, version_id)
    lock = _criteria_generation_locks.setdefault(lock_key, asyncio.Lock())
    await lock.acquire()

    try:
        response = await client.post(
            f"/api/v1/jobs/{job_id}/versions/{version_id}/generate-criteria",
            headers=auth_headers,
        )
    finally:
        lock.release()

    assert response.status_code == 409
    mock_jd_agent.assert_not_awaited()
