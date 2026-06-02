import pytest
from unittest.mock import AsyncMock, patch
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio

MOCK_CRITERIA = [
    {"name": "Python Expertise", "description": "Strong Python skills", "weight": 30, "is_mandatory": True},
    {"name": "Communication", "description": "Clear communicator", "weight": 20, "is_mandatory": False}
]

class TestJobCRUD:
    async def test_create_job(self, client: AsyncClient, auth_headers: dict):
        resp = await client.post("/api/v1/jobs", headers=auth_headers, json={
            "title": "Senior Backend Engineer",
            "department": "Engineering",
            "location": "Remote"
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["title"] == "Senior Backend Engineer"
        assert "id" in data

    async def test_list_jobs(self, client: AsyncClient, auth_headers: dict):
        resp = await client.get("/api/v1/jobs", headers=auth_headers)
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    async def test_get_job(self, client: AsyncClient, auth_headers: dict):
        create = await client.post("/api/v1/jobs", headers=auth_headers, json={
            "title": "QA Engineer", "department": "QA", "location": "Hybrid"
        })
        job_id = create.json()["id"]
        resp = await client.get(f"/api/v1/jobs/{job_id}", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["id"] == job_id

    async def test_get_nonexistent_job(self, client: AsyncClient, auth_headers: dict):
        resp = await client.get("/api/v1/jobs/999999", headers=auth_headers)
        assert resp.status_code == 404

    async def test_update_job(self, client: AsyncClient, auth_headers: dict):
        create = await client.post("/api/v1/jobs", headers=auth_headers, json={
            "title": "Old Title", "department": "Eng", "location": "Remote"
        })
        job_id = create.json()["id"]
        resp = await client.patch(f"/api/v1/jobs/{job_id}", headers=auth_headers, json={
            "title": "New Title"
        })
        assert resp.status_code == 200
        assert resp.json()["title"] == "New Title"

    async def test_delete_job(self, client: AsyncClient, auth_headers: dict):
        create = await client.post("/api/v1/jobs", headers=auth_headers, json={
            "title": "To Delete", "department": "X", "location": "Y"
        })
        job_id = create.json()["id"]
        resp = await client.delete(f"/api/v1/jobs/{job_id}", headers=auth_headers)
        assert resp.status_code == 200

class TestJobVersions:
    @patch("app.core.ai.gemini_client.GeminiClient.run_jd_agent", new_callable=AsyncMock)
    async def test_create_version_triggers_jd_agent(
        self, mock_jd_agent, client: AsyncClient, auth_headers: dict
    ):
        from app.core.ai.gemini_client import EvaluationCriteriaProposal
        mock_jd_agent.return_value = [
            type("C", (), {"name": "Python", "description": "Python skills", "weight": 50, "is_mandatory": True})()
        ]

        create = await client.post("/api/v1/jobs", headers=auth_headers, json={
            "title": "ML Engineer", "department": "AI", "location": "Remote"
        })
        job_id = create.json()["id"]

        resp = await client.post(f"/api/v1/jobs/{job_id}/versions", headers=auth_headers, json={
            "raw_jd_text": "We need a Python ML engineer with strong skills in TensorFlow.",
            "trigger_jd_agent": True
        })
        assert resp.status_code == 201
        mock_jd_agent.assert_called_once()

    async def test_create_version_without_agent(self, client: AsyncClient, auth_headers: dict):
        create = await client.post("/api/v1/jobs", headers=auth_headers, json={
            "title": "Data Analyst", "department": "Data", "location": "On-Site"
        })
        job_id = create.json()["id"]
        resp = await client.post(f"/api/v1/jobs/{job_id}/versions", headers=auth_headers, json={
            "raw_jd_text": "Analyze data using SQL and Excel.",
            "trigger_jd_agent": False
        })
        assert resp.status_code == 201

class TestEvaluationCriteria:
    async def test_add_criteria(self, client: AsyncClient, auth_headers: dict):
        create_job = await client.post("/api/v1/jobs", headers=auth_headers, json={
            "title": "DevOps", "department": "Ops", "location": "Remote"
        })
        job_id = create_job.json()["id"]
        create_ver = await client.post(f"/api/v1/jobs/{job_id}/versions", headers=auth_headers, json={
            "raw_jd_text": "Kubernetes and CI/CD", "trigger_jd_agent": False
        })
        version_id = create_ver.json()["id"]

        resp = await client.post(f"/api/v1/jobs/{job_id}/versions/{version_id}/criteria", headers=auth_headers, json=MOCK_CRITERIA[0])
        assert resp.status_code == 201


class TestJobDeletionPrevention:
    async def test_delete_version_with_active_applications_fails(self, client: AsyncClient, auth_headers: dict):
        # 1. Create a job
        job_resp = await client.post("/api/v1/jobs", headers=auth_headers, json={
            "title": "Engineer for Deletion Test", "department": "QA", "location": "Remote"
        })
        assert job_resp.status_code == 201
        job_id = job_resp.json()["id"]

        # 2. Create a job version
        ver_resp = await client.post(f"/api/v1/jobs/{job_id}/versions", headers=auth_headers, json={
            "raw_jd_text": "Need someone to test deletion constraints.",
            "trigger_jd_agent": False
        })
        assert ver_resp.status_code == 201
        version_id = ver_resp.json()["id"]

        # 3. Create a candidate
        cand_resp = await client.post("/api/v1/candidates", headers=auth_headers, json={
            "full_name": "Deletion Test Candidate",
            "email": "delcand@example.com"
        })
        assert cand_resp.status_code == 200
        candidate_id = cand_resp.json()["id"]

        # 4. Create an application referencing the version
        app_resp = await client.post("/api/v1/applications", headers=auth_headers, json={
            "candidate_id": candidate_id,
            "job_version_id": version_id
        })
        assert app_resp.status_code == 200

        # 5. Attempt to delete the job version, which should fail with 400 Bad Request
        del_ver_resp = await client.delete(f"/api/v1/jobs/{job_id}/versions/{version_id}", headers=auth_headers)
        assert del_ver_resp.status_code == 400
        assert "referenced by active job applications" in del_ver_resp.json()["detail"]

        # 6. Attempt to delete the job, which should also fail with 400 Bad Request
        del_job_resp = await client.delete(f"/api/v1/jobs/{job_id}", headers=auth_headers)
        assert del_job_resp.status_code == 400
        assert "referenced by active job applications" in del_job_resp.json()["detail"]
