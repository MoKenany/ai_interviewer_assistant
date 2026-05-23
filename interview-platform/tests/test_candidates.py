import io
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

    async def test_bulk_import_candidates_csv(self, client: AsyncClient, auth_headers: dict):
        csv_data = (
            "full_name,email,phone,linkedin_url,github_url,source\n"
            "Ali Ahmed,ali@example.com,+201011122233,https://linkedin.com/in/ali,,Referral\n"
            "Nada Saleh,nada@example.com,+201011122234,,,Job Board\n"
        )
        files = {"files": ("candidates.csv", csv_data.encode("utf-8"), "text/csv")}
        resp = await client.post("/api/v1/candidates/bulk-import", headers=auth_headers, files=files)

        assert resp.status_code == 200
        data = resp.json()
        assert data["total_rows"] == 2
        assert len(data["created"]) == 2
        assert data["errors"] == []
        assert data["files_processed"] == 1

    async def test_bulk_import_candidates_xlsx(self, client: AsyncClient, auth_headers: dict):
        from openpyxl import Workbook

        wb = Workbook()
        ws = wb.active
        ws.append(["full_name", "email", "phone", "linkedin_url", "github_url", "source"])
        ws.append(["Ali Ahmed", "ali@example.com", "+201011122233", "https://linkedin.com/in/ali", "", "Referral"])
        ws.append(["Nada Saleh", "nada@example.com", "+201011122234", "", "", "Job Board"])

        buffer = io.BytesIO()
        wb.save(buffer)
        buffer.seek(0)

        files = {"files": ("candidates.xlsx", buffer.read(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
        resp = await client.post("/api/v1/candidates/bulk-import", headers=auth_headers, files=files)

        assert resp.status_code == 200
        data = resp.json()
        assert data["total_rows"] == 2
        assert len(data["created"]) == 2
        assert data["errors"] == []
        assert data["files_processed"] == 1

    async def test_bulk_import_candidates_multiple_files(self, client: AsyncClient, auth_headers: dict):
        from openpyxl import Workbook

        csv_data = (
            "full_name,email,phone\n"
            "User One,user1@example.com,111111\n"
        )
        
        wb = Workbook()
        ws = wb.active
        ws.append(["full_name", "email", "phone"])
        ws.append(["User Two", "user2@example.com", "222222"])
        buffer = io.BytesIO()
        wb.save(buffer)
        buffer.seek(0)

        # Send both CSV and XLSX in the same request
        files = [
            ("files", ("batch1.csv", csv_data.encode("utf-8"), "text/csv")),
            ("files", ("batch2.xlsx", buffer.read(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
        ]
        resp = await client.post("/api/v1/candidates/bulk-import", headers=auth_headers, files=files)

        assert resp.status_code == 200
        data = resp.json()
        assert data["total_rows"] == 2  # 1 from CSV + 1 from XLSX
        assert len(data["created"]) == 2
        assert data["errors"] == []
        assert data["files_processed"] == 2

    async def test_bulk_import_candidates_with_invalid_and_duplicate_rows(self, client: AsyncClient, auth_headers: dict):
        csv_data = (
            "full_name,email,phone,linkedin_url,github_url,source\n"
            "Valid Candidate,valid@example.com,+201011122235,,,Referral\n"
            "Bad Email,bad-email@example,123456,,,Referral\n"
            "Duplicate Candidate,valid@example.com,123456,,,Referral\n"
        )
        files = {"files": ("candidates.csv", csv_data.encode("utf-8"), "text/csv")}
        resp = await client.post("/api/v1/candidates/bulk-import", headers=auth_headers, files=files)

        assert resp.status_code == 200
        data = resp.json()
        assert data["total_rows"] == 3
        assert len(data["created"]) == 1
        assert len(data["errors"]) == 1
        assert len(data["skipped"]) == 1

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
