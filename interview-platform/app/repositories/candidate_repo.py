from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel, EmailStr, ValidationError
from app.models.candidate import Candidate
from app.schemas.candidate import CandidateCreate, CandidateUpdate
from typing import List, Optional


class _EmailModel(BaseModel):
    email: EmailStr


def _validate_email(email: str) -> str:
    try:
        return _EmailModel(email=email).email.lower()
    except (ValidationError, ValueError):
        raise ValueError("Email is invalid")


class CandidateRepo:
    @staticmethod
    async def get_all(db: AsyncSession) -> List[Candidate]:
        result = await db.execute(select(Candidate))
        return list(result.scalars().all())

    @staticmethod
    async def get(db: AsyncSession, candidate_id: int) -> Optional[Candidate]:
        result = await db.execute(select(Candidate).filter(Candidate.id == candidate_id))
        return result.scalars().first()

    @staticmethod
    async def get_by_email(db: AsyncSession, email: str) -> Optional[Candidate]:
        result = await db.execute(
            select(Candidate).filter(Candidate.email == email.lower().strip())
        )
        return result.scalars().first()

    @staticmethod
    async def create(db: AsyncSession, obj_in: CandidateCreate, user_id: int) -> Candidate:
        db_obj = Candidate(**obj_in.model_dump(), user_id=user_id)
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    @staticmethod
    async def bulk_create(db: AsyncSession, candidates_data: List[dict], user_id: int) -> dict:
        """
        Insert multiple candidates, skipping duplicates by email.
        Returns dict with created, skipped, and errors lists.
        """
        created = []
        skipped = []
        errors = []

        for idx, row in enumerate(candidates_data):
            email = (row.get("email") or "").strip().lower()
            full_name = (row.get("full_name") or "").strip()

            # Row number for reporting (header is row 1, data starts at row 2)
            row_num = idx + 2

            if not email:
                errors.append({"row": row_num, "reason": "Email is required", "data": row})
                continue

            try:
                email = _validate_email(email)
            except ValueError:
                errors.append({"row": row_num, "reason": "Email is invalid", "data": row})
                continue

            if not full_name:
                errors.append({"row": row_num, "reason": "Full name is required", "data": row})
                continue

            # Check for duplicate email in DB
            existing = await db.execute(
                select(Candidate).filter(Candidate.email == email)
            )
            if existing.scalars().first():
                skipped.append({
                    "row": row_num,
                    "email": email,
                    "full_name": full_name,
                    "reason": "Email already exists"
                })
                continue

            try:
                candidate = Candidate(
                    user_id=user_id,
                    full_name=full_name,
                    email=email,
                    phone=(row.get("phone") or "").strip() or None,
                    linkedin_url=(row.get("linkedin_url") or "").strip() or None,
                    github_url=(row.get("github_url") or "").strip() or None,
                    source=(row.get("source") or "").strip() or None,
                )
                db.add(candidate)
                await db.flush()  # Assign ID without full commit
                created.append({"row": row_num, "email": email, "full_name": full_name})
            except Exception as e:
                errors.append({"row": row_num, "reason": str(e), "data": row})

        await db.commit()
        return {"created": created, "skipped": skipped, "errors": errors}

    @staticmethod
    async def update(db: AsyncSession, db_obj: Candidate, obj_in: CandidateUpdate) -> Candidate:
        update_data = obj_in.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_obj, key, value)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    @staticmethod
    async def delete(db: AsyncSession, db_obj: Candidate):
        await db.delete(db_obj)
        await db.commit()

    @staticmethod
    async def update_resume_path(db: AsyncSession, db_obj: Candidate, file_path: str):
        db_obj.resume_file_path = file_path
        await db.commit()
        await db.refresh(db_obj)
        return db_obj
