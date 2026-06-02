from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.candidate import Candidate
from app.schemas.candidate import CandidateCreate, CandidateUpdate
from typing import List

class CandidateRepo:
    @staticmethod
    async def get_all(db: AsyncSession) -> List[Candidate]:
        result = await db.execute(select(Candidate))
        return list(result.scalars().all())

    @staticmethod
    async def get(db: AsyncSession, candidate_id: int) -> Candidate | None:
        result = await db.execute(select(Candidate).filter(Candidate.id == candidate_id))
        return result.scalars().first()

    @staticmethod
    async def create(db: AsyncSession, obj_in: CandidateCreate, user_id: int) -> Candidate:
        db_obj = Candidate(**obj_in.model_dump(), user_id=user_id)
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

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
