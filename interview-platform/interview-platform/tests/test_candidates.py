import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio

class TestCandidateCRUD:
    async def test_create_candidate(self, client: AsyncClient, auth_headers: dict):
        resp = await client.post("/api/v1/candidates", headers=auth_headers, json={
            "full_name": "Ahmed Hassan",
            "email": "ahmed@example.com",
            "phone": "+201234567890",
            "linkedin_url": "https://linkedin.com/in/ahmed",
            "source": "LinkedIn"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["email"] == "ahmed@example.com"
        assert "id" in data

    async def test_create_candidate_invalid_email(self, client: AsyncClient, auth_headers: dict):
        resp = await client.post("/api/v1/candidates", headers=auth_headers, json={
            "full_name": "Bad Email",
            "email": "not-valid"
        })
        assert resp.status_code == 422

    async def test_list_candidates(self, client: AsyncClient, auth_headers: dict):
        resp = await client.get("/api/v1/candidates", headers=auth_headers)
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    async def test_get_candidate(self, client: AsyncClient, auth_headers: dict):
        create = await client.post("/api/v1/candidates", headers=auth_headers, json={
            "full_name": "Sara Ali", "email": "sara@example.com"
        })
        cid = create.json()["id"]
        resp = await client.get(f"/api/v1/candidates/{cid}", headers=auth_headers)
        assert resp.status_code == 200

    async def test_get_nonexistent_candidate(self, client: AsyncClient, auth_headers: dict):
        resp = await client.get("/api/v1/candidates/999999", headers=auth_headers)
        assert resp.status_code == 404

    async def test_update_candidate(self, client: AsyncClient, auth_headers: dict):
        create = await client.post("/api/v1/candidates", headers=auth_headers, json={
            "full_name": "Old Name", "email": "oldname@example.com"
        })
        cid = create.json()["id"]
        resp = await client.patch(f"/api/v1/candidates/{cid}", headers=auth_headers, json={
            "full_name": "New Name"
        })
        assert resp.status_code == 200
        assert resp.json()["full_name"] == "New Name"

    async def test_delete_candidate(self, client: AsyncClient, auth_headers: dict):
        create = await client.post("/api/v1/candidates", headers=auth_headers, json={
            "full_name": "Delete Me", "email": "deleteme@example.com"
        })
        cid = create.json()["id"]
        resp = await client.delete(f"/api/v1/candidates/{cid}", headers=auth_headers)
        assert resp.status_code == 200

class TestApplicationCRUD:
    async def _create_candidate(self, client, headers):
        resp = await client.post("/api/v1/candidates", headers=headers, json={
            "full_name": "App Candidate", "email": f"appcandidate_{id(self)}@example.com"
        })
        return resp.json()["id"]

    async def _create_job_version(self, client, headers):
        job = await client.post("/api/v1/jobs", headers=headers, json={
            "title": "Test Job", "department": "Test", "location": "Test"
        })
        jid = job.json()["id"]
        ver = await client.post(f"/api/v1/jobs/{jid}/versions", headers=headers, json={
            "raw_jd_text": "Test JD", "trigger_jd_agent": False
        })
        return ver.json()["id"]

    async def test_create_application(self, client: AsyncClient, auth_headers: dict):
        cid = await self._create_candidate(client, auth_headers)
        vid = await self._create_job_version(client, auth_headers)
        resp = await client.post("/api/v1/applications", headers=auth_headers, json={
            "candidate_id": cid,
            "job_version_id": vid
        })
        assert resp.status_code == 200
        assert resp.json()["candidate_id"] == cid

    async def test_update_application_status(self, client: AsyncClient, auth_headers: dict):
        cid = await self._create_candidate(client, auth_headers)
        vid = await self._create_job_version(client, auth_headers)
        create = await client.post("/api/v1/applications", headers=auth_headers, json={
            "candidate_id": cid, "job_version_id": vid
        })
        app_id = create.json()["id"]
        resp = await client.patch(f"/api/v1/applications/{app_id}/status", headers=auth_headers, json={
            "status": "screening"
        })
        assert resp.status_code == 200
        assert resp.json()["status"] == "screening"
