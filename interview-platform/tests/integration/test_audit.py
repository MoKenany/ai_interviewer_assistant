import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio

class TestAudit:
    async def test_get_audit_logs(self, client: AsyncClient, auth_headers: dict):
        resp = await client.get("/api/v1/audit/logs", headers=auth_headers)
        assert resp.status_code == 200
