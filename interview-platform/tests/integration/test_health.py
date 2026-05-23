import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio

class TestHealth:
    async def test_health(self, client: AsyncClient):
        resp = await client.get("/health")
        assert resp.status_code == 200

    async def test_health_db(self, client: AsyncClient):
        resp = await client.get("/health/db")
        assert resp.status_code == 200

    async def test_health_redis(self, client: AsyncClient):
        resp = await client.get("/health/redis")
        # redis might not be connected in test env, so check 200
        assert resp.status_code == 200

    async def test_health_ready(self, client: AsyncClient):
        resp = await client.get("/health/ready")
        assert resp.status_code == 200
