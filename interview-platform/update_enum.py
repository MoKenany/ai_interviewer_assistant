import asyncio
from app.database import engine
from sqlalchemy import text

async def update_enum():
    async with engine.connect() as conn:
        try:
            await conn.execute(text("ALTER TYPE auditactionenum ADD VALUE 'logout'"))
            print("Added logout")
        except Exception as e:
            print(f"Error adding logout: {e}")
        try:
            await conn.execute(text("ALTER TYPE auditactionenum ADD VALUE 'signup'"))
            print("Added signup")
        except Exception as e:
            print(f"Error adding signup: {e}")
        await conn.commit()

asyncio.run(update_enum())
