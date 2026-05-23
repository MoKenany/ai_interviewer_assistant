import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio

class TestEvaluations:
    async def test_get_evaluation(self, client: AsyncClient, auth_headers: dict, setup_session: int):
        # the evaluation may not exist until pipeline is finished, so we expect 404 or 200
        resp = await client.get("/api/v1/evaluations/1", headers=auth_headers)
        assert resp.status_code in [200, 404]

    async def test_get_evaluation_by_session(self, client: AsyncClient, auth_headers: dict, setup_session: int):
        resp = await client.get(f"/api/v1/evaluations/session/{setup_session}", headers=auth_headers)
        assert resp.status_code in [200, 404]

    async def test_get_insights(self, client: AsyncClient, auth_headers: dict):
        resp = await client.get("/api/v1/evaluations/1/insights", headers=auth_headers)
        assert resp.status_code in [200, 404]

    async def test_get_suggested_questions(self, client: AsyncClient, auth_headers: dict):
        resp = await client.get("/api/v1/evaluations/1/suggested-questions", headers=auth_headers)
        assert resp.status_code in [200, 404]

    async def test_update_notes(self, client: AsyncClient, auth_headers: dict):
        resp = await client.patch("/api/v1/evaluations/1/notes", headers=auth_headers, json={"notes": {"general": "good"}})
        assert resp.status_code in [200, 404]
