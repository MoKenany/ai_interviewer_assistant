from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, UploadFile
import os
import io
import csv
import logging
import asyncio
from pydantic import BaseModel, EmailStr, ValidationError
from typing import List, Optional

from app.schemas.candidate import CandidateCreate, CandidateUpdate
from app.repositories.candidate_repo import CandidateRepo
from app.repositories.application_repo import ApplicationRepo
from app.schemas.application import ApplicationCreate, ApplicationUpdateStatus, ApplicationUpdate
from app.models.candidate import Candidate
from app.models.job_application import JobApplication
from app.models.job_version import JobVersion
from app.core import storage
from sqlalchemy import func, select

logger = logging.getLogger(__name__)


class _EmailModel(BaseModel):
    email: EmailStr

# Mapping of possible column header aliases → our internal field names
COLUMN_ALIASES = {
    "full_name":    ["full_name", "name", "full name", "candidate name", "candidate", "الاسم", "الاسم الكامل"],
    "email":        ["email", "e-mail", "email address", "البريد", "البريد الإلكتروني"],
    "phone":        ["phone", "phone number", "mobile", "telephone", "رقم الهاتف", "الهاتف"],
    "linkedin_url": ["linkedin_url", "linkedin", "linkedin url", "لينكدإن"],
    "github_url":   ["github_url", "github", "github url", "جيتهاب"],
    "source":       ["source", "source channel", "المصدر"],
}


def _normalize_header(header: str) -> Optional[str]:
    """Map a raw spreadsheet column header to our internal field name."""
    h = header.strip().lower()
    for field, aliases in COLUMN_ALIASES.items():
        if h in [a.lower() for a in aliases]:
            return field
    return None


def _validate_email(email: str) -> str:
    """Validate and normalize the email address from imported rows."""
    try:
        normalized = _EmailModel(email=email).email
    except (ValidationError, ValueError):
        raise ValueError("Email is invalid")
    return str(normalized).lower()


def _get_csv_dialect(text: str):
    try:
        return csv.Sniffer().sniff(text[:4096], delimiters=",;\t|")
    except (csv.Error, TypeError):
        if "\t" in text:
            delimiter = "\t"
        elif ";" in text:
            delimiter = ";"
        else:
            delimiter = ","
        dialect = csv.excel()
        dialect.delimiter = delimiter
        return dialect


def _parse_csv(content: bytes) -> List[dict]:
    """Parse CSV or TSV bytes into a list of row dicts."""
    text = content.decode("utf-8-sig", errors="replace")
    dialect = _get_csv_dialect(text)
    reader = csv.DictReader(io.StringIO(text), dialect=dialect)

    rows = []
    for raw_row in reader:
        row = {}
        for col, val in raw_row.items():
            if col is None:
                continue
            field = _normalize_header(col)
            if field:
                row[field] = val
        rows.append(row)
    return rows


def _parse_excel(content: bytes, ext: str) -> List[dict]:
    """Parse XLSX/XLS bytes into a list of row dicts."""
    if ext == ".xls":
        try:
            import xlrd
        except ImportError:
            raise HTTPException(status_code=500, detail="xlrd is not installed on the server")

        try:
            book = xlrd.open_workbook(file_contents=content)
        except xlrd.XLRDError as exc:
            raise HTTPException(status_code=400, detail=f"Failed to parse XLS file: {exc}")

        sheet = book.sheet_by_index(0)
        headers = [_normalize_header(str(sheet.cell_value(0, col) or "").strip()) for col in range(sheet.ncols)]

        rows = []
        for row_idx in range(1, sheet.nrows):
            row_values = sheet.row_values(row_idx)
            row_dict = {}
            all_empty = True
            for col_idx, value in enumerate(row_values):
                field = headers[col_idx] if col_idx < len(headers) else None
                if field is None:
                    continue
                if value is not None and str(value).strip() != "":
                    row_dict[field] = str(value).strip()
                    all_empty = False
                else:
                    row_dict[field] = ""
            if not all_empty:
                rows.append(row_dict)
        return rows

    try:
        import openpyxl
        from openpyxl.utils.exceptions import InvalidFileException
    except ImportError:
        raise HTTPException(status_code=500, detail="openpyxl is not installed on the server")

    try:
        wb = openpyxl.load_workbook(io.BytesIO(content), read_only=True, data_only=True)
    except (InvalidFileException, Exception) as exc:
        raise HTTPException(status_code=400, detail=f"Failed to parse XLSX file: {exc}")

    ws = wb.active
    rows_iter = ws.iter_rows(values_only=True)

    try:
        header_row = next(rows_iter)
    except StopIteration:
        wb.close()
        return []

    headers = [_normalize_header(str(cell or "").strip()) for cell in header_row]
    parsed_rows = []

    for row in rows_iter:
        row_dict = {}
        all_empty = True
        for col_idx, value in enumerate(row):
            field = headers[col_idx] if col_idx < len(headers) else None
            if field is None:
                continue
            if value is not None and str(value).strip() != "":
                row_dict[field] = str(value).strip()
                all_empty = False
            else:
                row_dict[field] = ""
        if not all_empty:
            parsed_rows.append(row_dict)

    wb.close()
    return parsed_rows


def parse_import_file(filename: str, content: bytes) -> List[dict]:
    """Dispatch to CSV or Excel parser based on file extension."""
    ext = os.path.splitext(filename)[1].lower()
    if ext in (".xlsx", ".xls", ".xlsm"):
        return _parse_excel(content, ext)
    elif ext in (".csv", ".tsv", ".txt"):
        return _parse_csv(content)
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Supported: .xlsx, .xls, .csv, .tsv"
        )


async def parse_import_file_async(filename: str, content: bytes) -> List[dict]:
    """Run parse_import_file off the event loop to avoid blocking."""
    try:
        return await asyncio.to_thread(parse_import_file, filename, content)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to parse import file: {exc}")


class CandidateService:
    @staticmethod
    async def create_candidate(db: AsyncSession, user_id: int, obj_in: CandidateCreate):
        try:
            return await CandidateRepo.create(db, obj_in, user_id)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

    @staticmethod
    async def get_candidates(db: AsyncSession):
        return await CandidateRepo.get_all(db)

    @staticmethod
    async def get_candidate(db: AsyncSession, candidate_id: int):
        candidate = await CandidateRepo.get(db, candidate_id)
        if not candidate:
            raise HTTPException(status_code=404, detail="Candidate not found")
        return candidate

    @staticmethod
    async def update_candidate(db: AsyncSession, candidate_id: int, obj_in: CandidateUpdate):
        candidate = await CandidateService.get_candidate(db, candidate_id)
        return await CandidateRepo.update(db, candidate, obj_in)

    @staticmethod
    async def delete_candidate(db: AsyncSession, candidate_id: int):
        candidate = await CandidateService.get_candidate(db, candidate_id)
        if candidate.resume_file_path and os.path.exists(candidate.resume_file_path):
            try:
                os.remove(candidate.resume_file_path)
            except Exception:
                pass
        await CandidateRepo.delete(db, candidate)

    @staticmethod
    async def upload_resume(db: AsyncSession, candidate_id: int, file: UploadFile):
        candidate = await CandidateService.get_candidate(db, candidate_id)
        file_path = await storage.save_resume(candidate_id, file)
        return await CandidateRepo.update_resume_path(db, candidate, file_path)

    @staticmethod
    async def delete_resume(db: AsyncSession, candidate_id: int):
        candidate = await CandidateService.get_candidate(db, candidate_id)
        if candidate.resume_file_path and os.path.exists(candidate.resume_file_path):
            try:
                os.remove(candidate.resume_file_path)
            except Exception:
                pass
        return await CandidateRepo.update_resume_path(db, candidate, None)

    @staticmethod
    async def bulk_import(db: AsyncSession, user_id: int, file: UploadFile) -> dict:
        """
        Parse an uploaded Excel/CSV file and bulk-create candidates.
        Returns a summary with created, skipped, and error rows.
        """
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Uploaded file is empty")

        rows = await parse_import_file_async(file.filename, content)

        if not rows:
            raise HTTPException(status_code=400, detail="No data rows found in the file")

        result = await CandidateRepo.bulk_create(db, rows, user_id)
        result["total_rows"] = len(rows)
        return result

    @staticmethod
    async def bulk_import_multiple(db: AsyncSession, user_id: int, files: List[UploadFile]) -> dict:
        """
        Parse multiple uploaded files (Excel/CSV) and bulk-create candidates.
        Aggregates results from all files.
        Returns aggregated summary with created, skipped, and error rows across all files.
        """
        if not files:
            raise HTTPException(status_code=400, detail="No files provided")

        aggregated_created = []
        aggregated_skipped = []
        aggregated_errors = []
        total_rows = 0
        files_processed = 0
        files_errors = []

        for file in files:
            if not file.filename:
                files_errors.append({"file": "unknown", "error": "No filename"})
                continue

            try:
                content = await file.read()
                if not content:
                    files_errors.append({"file": file.filename, "error": "File is empty"})
                    continue

                rows = await parse_import_file_async(file.filename, content)
                if not rows:
                    files_errors.append({"file": file.filename, "error": "No data rows found"})
                    continue

                # Process rows for this file
                result = await CandidateRepo.bulk_create(db, rows, user_id)

                # Track file metadata in results
                for item in result.get("created", []):
                    item["source_file"] = file.filename
                for item in result.get("skipped", []):
                    item["source_file"] = file.filename
                for item in result.get("errors", []):
                    item["source_file"] = file.filename

                # Aggregate
                aggregated_created.extend(result.get("created", []))
                aggregated_skipped.extend(result.get("skipped", []))
                aggregated_errors.extend(result.get("errors", []))
                total_rows += len(rows)
                files_processed += 1

            except HTTPException as e:
                files_errors.append({"file": file.filename, "error": e.detail})
            except Exception as e:
                files_errors.append({"file": file.filename, "error": str(e)})

        return {
            "created": aggregated_created,
            "skipped": aggregated_skipped,
            "errors": aggregated_errors,
            "total_rows": total_rows,
            "files_processed": files_processed,
            "files_errors": files_errors
        }


class ApplicationService:
    @staticmethod
    async def bulk_import_candidates_to_job_version(
        db: AsyncSession,
        user_id: int,
        job_version_id: int,
        files: List[UploadFile]
    ) -> dict:
        if not files:
            raise HTTPException(status_code=400, detail="No files provided")

        job_version = await db.get(JobVersion, job_version_id)
        if not job_version:
            raise HTTPException(status_code=404, detail="Job version not found")

        rows_with_meta = []
        files_processed = 0
        files_errors = []

        for file in files:
            filename = file.filename or "unknown"
            try:
                content = await file.read()
                if not content:
                    files_errors.append({"file": filename, "error": "File is empty"})
                    continue

                rows = await parse_import_file_async(filename, content)
                if not rows:
                    files_errors.append({"file": filename, "error": "No data rows found"})
                    continue

                files_processed += 1
                for idx, row in enumerate(rows):
                    rows_with_meta.append({
                        "row": idx + 2,
                        "source_file": filename,
                        "data": row
                    })
            except HTTPException as exc:
                files_errors.append({"file": filename, "error": exc.detail})
            except Exception as exc:
                files_errors.append({"file": filename, "error": str(exc)})

        created_candidates = []
        linked = []
        skipped = []
        errors = []
        valid_rows = []
        emails_to_check = set()
        seen_import_emails = set()

        for item in rows_with_meta:
            row = item["data"]
            row_num = item["row"]
            source_file = item["source_file"]
            email = (row.get("email") or "").strip().lower()
            full_name = (row.get("full_name") or "").strip()

            if not email:
                errors.append({"row": row_num, "source_file": source_file, "reason": "Email is required", "data": row})
                continue

            try:
                email = _validate_email(email)
            except ValueError:
                errors.append({"row": row_num, "source_file": source_file, "email": email, "reason": "Email is invalid", "data": row})
                continue

            if not full_name:
                errors.append({"row": row_num, "source_file": source_file, "email": email, "reason": "Full name is required", "data": row})
                continue

            if email in seen_import_emails:
                skipped.append({
                    "row": row_num,
                    "source_file": source_file,
                    "email": email,
                    "full_name": full_name,
                    "reason": "Duplicate email in import file"
                })
                continue

            seen_import_emails.add(email)
            emails_to_check.add(email)
            valid_rows.append({
                "row": row_num,
                "source_file": source_file,
                "email": email,
                "full_name": full_name,
                "data": row
            })

        existing_by_email = {}
        if emails_to_check:
            result = await db.execute(select(Candidate).where(func.lower(Candidate.email).in_(emails_to_check)))
            existing_by_email = {candidate.email.lower(): candidate for candidate in result.scalars().all()}

        existing_application_candidate_ids = set()
        if existing_by_email:
            result = await db.execute(
                select(JobApplication.candidate_id).where(
                    JobApplication.job_version_id == job_version_id,
                    JobApplication.candidate_id.in_([c.id for c in existing_by_email.values()])
                )
            )
            existing_application_candidate_ids = set(result.scalars().all())

        new_candidates_by_email = {}
        try:
            for item in valid_rows:
                existing_candidate = existing_by_email.get(item["email"])
                if existing_candidate:
                    if existing_candidate.id in existing_application_candidate_ids:
                        skipped.append({
                            "row": item["row"],
                            "source_file": item["source_file"],
                            "email": item["email"],
                            "full_name": item["full_name"],
                            "reason": "Candidate already assigned to this job version"
                        })
                    continue

                row = item["data"]
                candidate = Candidate(
                    user_id=user_id,
                    full_name=item["full_name"],
                    email=item["email"],
                    phone=(row.get("phone") or "").strip() or None,
                    linkedin_url=(row.get("linkedin_url") or "").strip() or None,
                    github_url=(row.get("github_url") or "").strip() or None,
                    source=(row.get("source") or "").strip() or "Job version import",
                )
                db.add(candidate)
                new_candidates_by_email[item["email"]] = candidate

            if new_candidates_by_email:
                await db.flush()
                for email, candidate in new_candidates_by_email.items():
                    existing_by_email[email] = candidate
                    created_candidates.append({
                        "candidate_id": candidate.id,
                        "email": candidate.email,
                        "full_name": candidate.full_name
                    })

            for item in valid_rows:
                candidate = existing_by_email.get(item["email"])
                if not candidate or candidate.id in existing_application_candidate_ids:
                    continue

                application = JobApplication(
                    candidate_id=candidate.id,
                    job_version_id=job_version_id
                )
                db.add(application)
                await db.flush()
                existing_application_candidate_ids.add(candidate.id)
                linked.append({
                    "row": item["row"],
                    "source_file": item["source_file"],
                    "email": candidate.email,
                    "full_name": candidate.full_name,
                    "application": {
                        "id": application.id,
                        "candidate_id": candidate.id,
                        "job_version_id": job_version_id,
                        "status": "applied",
                        "candidate": {
                            "id": candidate.id,
                            "full_name": candidate.full_name,
                            "email": candidate.email,
                            "phone": candidate.phone,
                            "source": candidate.source
                        }
                    }
                })

            await db.commit()
        except Exception:
            await db.rollback()
            raise

        return {
            "created_candidates": created_candidates,
            "linked": linked,
            "skipped": skipped,
            "errors": errors,
            "total_rows": len(rows_with_meta),
            "files_processed": files_processed,
            "files_errors": files_errors
        }

    @staticmethod
    async def create_application(db: AsyncSession, obj_in: ApplicationCreate):
        candidate = await CandidateRepo.get(db, obj_in.candidate_id)
        if not candidate:
            raise HTTPException(status_code=404, detail="Candidate not found")

        job_version = await db.get(JobVersion, obj_in.job_version_id)
        if not job_version:
            raise HTTPException(status_code=404, detail="Job version not found")

        existing_apps = await ApplicationRepo.get_all(db, candidate_id=obj_in.candidate_id, job_version_id=obj_in.job_version_id)
        if existing_apps:
            raise HTTPException(status_code=400, detail="Candidate already applied to this job version")

        return await ApplicationRepo.create(db, obj_in)

    @staticmethod
    async def get_applications(
        db: AsyncSession,
        candidate_id: Optional[int] = None,
        job_version_id: Optional[int] = None
    ):
        return await ApplicationRepo.get_all(db, candidate_id, job_version_id)

    @staticmethod
    async def get_application(db: AsyncSession, app_id: int):
        app = await ApplicationRepo.get(db, app_id)
        if not app:
            raise HTTPException(status_code=404, detail="Application not found")
        return app

    @staticmethod
    async def update_status(db: AsyncSession, app_id: int, obj_in: ApplicationUpdateStatus):
        app = await ApplicationService.get_application(db, app_id)
        return await ApplicationRepo.update_status(db, app, obj_in)

    @staticmethod
    async def update_application(db: AsyncSession, app_id: int, obj_in: ApplicationUpdate):
        app = await ApplicationService.get_application(db, app_id)
        return await ApplicationRepo.update(db, app, obj_in)

    @staticmethod
    async def delete_application(db: AsyncSession, app_id: int):
        app = await ApplicationService.get_application(db, app_id)
        await ApplicationRepo.delete(db, app)
