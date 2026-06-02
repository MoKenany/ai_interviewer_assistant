import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio

class TestRegister:
    async def test_register_success(self, client: AsyncClient):
        resp = await client.post("/api/v1/auth/register", json={
            "email": "newuser_unit@example.com",
            "password": "SecurePass123!",
            "full_name": "New User"
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["email"] == "newuser_unit@example.com"
        assert "id" in data

    async def test_register_duplicate_email(self, client: AsyncClient):
        payload = {"email": "dup_unit@example.com", "password": "Pass123!", "full_name": "Dup"}
        await client.post("/api/v1/auth/register", json=payload)
        resp = await client.post("/api/v1/auth/register", json=payload)
        assert resp.status_code == 400

    async def test_register_invalid_email(self, client: AsyncClient):
        resp = await client.post("/api/v1/auth/register", json={
            "email": "not-an-email",
            "password": "Pass123!",
            "full_name": "Bad"
        })
        assert resp.status_code == 422

class TestLogin:
    async def test_login_success(self, client: AsyncClient):
        await client.post("/api/v1/auth/register", json={
            "email": "loginuser_unit@example.com",
            "password": "TestPass123!",
            "full_name": "Login User"
        })
        resp = await client.post("/api/v1/auth/login", json={
            "email": "loginuser_unit@example.com",
            "password": "TestPass123!"
        })
        assert resp.status_code == 200
        assert "access_token" in resp.json()

    async def test_login_wrong_password(self, client: AsyncClient):
        await client.post("/api/v1/auth/register", json={
            "email": "wrongpass_unit@example.com",
            "password": "Correct123!",
            "full_name": "WP"
        })
        resp = await client.post("/api/v1/auth/login", json={
            "email": "wrongpass_unit@example.com",
            "password": "WrongPassword!"
        })
        assert resp.status_code == 401

    async def test_login_nonexistent_user(self, client: AsyncClient):
        resp = await client.post("/api/v1/auth/login", json={
            "email": "ghost_unit@example.com",
            "password": "anypass"
        })
        assert resp.status_code == 401

class TestProtectedRoute:
    async def test_me_with_valid_token(self, client: AsyncClient, auth_headers: dict):
        resp = await client.get("/api/v1/auth/me", headers=auth_headers)
        assert resp.status_code == 200

    async def test_me_without_token(self, client: AsyncClient):
        resp = await client.get("/api/v1/auth/me")
        assert resp.status_code == 401
