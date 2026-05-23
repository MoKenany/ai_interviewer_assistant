from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.user import User
from app.schemas.auth import RegisterRequest
from app.core.security import hash_password

class UserRepo:
    @staticmethod
    async def get_by_email(db: AsyncSession, email: str) -> User | None:
        result = await db.execute(select(User).filter(User.email == email))
        return result.scalars().first()

    @staticmethod
    async def get_by_id(db: AsyncSession, user_id: int) -> User | None:
        result = await db.execute(select(User).filter(User.id == user_id))
        return result.scalars().first()

    @staticmethod
    async def create(db: AsyncSession, user_in: RegisterRequest) -> User:
        hashed_password = hash_password(user_in.password)
        db_user = User(
            full_name=user_in.full_name,
            email=user_in.email,
            hashed_password=hashed_password,
            role=user_in.role
        )
        db.add(db_user)
        await db.commit()
        await db.refresh(db_user)
        return db_user
