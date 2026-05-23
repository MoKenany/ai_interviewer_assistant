import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio

class TestSessionsAdditional:
    async def test_list_sessions(self, client: AsyncClient, auth_headers: dict):
        resp = await client.get("/api/v1/sessions", headers=auth_headers)
        assert resp.status_code == 200

    async def test_get_session_status(self, client: AsyncClient, auth_headers: dict, setup_session: int):
        resp = await client.get(f"/api/v1/sessions/{setup_session}/status", headers=auth_headers)
        assert resp.status_code in [200, 404]

    async def test_retry_pipeline(self, client: AsyncClient, auth_headers: dict, setup_session: int):
        resp = await client.post(f"/api/v1/sessions/{setup_session}/retry", headers=auth_headers)
        assert resp.status_code == 400
        assert "Upload media" in resp.json()["detail"]

    async def test_get_transcript(self, client: AsyncClient, auth_headers: dict, setup_session: int):
        resp = await client.get(f"/api/v1/sessions/{setup_session}/transcript", headers=auth_headers)
        assert resp.status_code == 200

    async def test_get_artifacts(self, client: AsyncClient, auth_headers: dict, setup_session: int):
        resp = await client.get(f"/api/v1/sessions/{setup_session}/artifacts", headers=auth_headers)
        assert resp.status_code == 200
