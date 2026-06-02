from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
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
            select(Candidate).filter(func.lower(Candidate.email) == email.lower().strip())
        )
        return result.scalars().first()

    @staticmethod
    async def create(db: AsyncSession, obj_in: CandidateCreate, user_id: int) -> Candidate:
        try:
            data = obj_in.model_dump()
            data["email"] = str(data["email"]).lower().strip()
            existing = await CandidateRepo.get_by_email(db, data["email"])
            if existing:
                raise ValueError("Email already registered")
            db_obj = Candidate(**data, user_id=user_id)
            db.add(db_obj)
            await db.commit()
            await db.refresh(db_obj)
            return db_obj
        except IntegrityError:
            await db.rollback()
            raise ValueError("Email already registered")

    @staticmethod
    async def bulk_create(db: AsyncSession, candidates_data: List[dict], user_id: int) -> dict:
        """
        Insert multiple candidates, skipping duplicates by email.
        Returns dict with created, skipped, and errors lists.
        Optimized to avoid N+1 queries.
        """
        created = []
        skipped = []
        errors = []

        # 1. Pre-process and validate data
        valid_candidates = []
        emails_to_check = set()

        for idx, row in enumerate(candidates_data):
            row_num = idx + 2
            email = (row.get("email") or "").strip().lower()
            full_name = (row.get("full_name") or "").strip()

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

            emails_to_check.add(email)
            valid_candidates.append({
                "row_num": row_num,
                "email": email,
                "full_name": full_name,
                "row": row
            })

        # 2. Bulk check existing emails
        existing_emails = set()
        if emails_to_check:
            result = await db.execute(
                select(Candidate.email).filter(func.lower(Candidate.email).in_(emails_to_check))
            )
            existing_emails = {e.lower() for e in result.scalars().all()}

        # 3. Create objects
        new_candidate_objs = []
        for v in valid_candidates:
            if v["email"] in existing_emails:
                skipped.append({
                    "row": v["row_num"],
                    "email": v["email"],
                    "full_name": v["full_name"],
                    "reason": "Email already exists"
                })
            else:
                try:
                    candidate = Candidate(
                        user_id=user_id,
                        full_name=v["full_name"],
                        email=v["email"],
                        phone=(v["row"].get("phone") or "").strip() or None,
                        linkedin_url=(v["row"].get("linkedin_url") or "").strip() or None,
                        github_url=(v["row"].get("github_url") or "").strip() or None,
                        source=(v["row"].get("source") or "").strip() or None,
                    )
                    new_candidate_objs.append(candidate)
                    created.append({"row": v["row_num"], "email": v["email"], "full_name": v["full_name"]})
                    # Add to existing_emails to handle duplicates within the import file itself
                    existing_emails.add(v["email"])
                except Exception as e:
                    errors.append({"row": v["row_num"], "reason": str(e), "data": v["row"]})

        # 4. Bulk insert
        if new_candidate_objs:
            db.add_all(new_candidate_objs)
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
