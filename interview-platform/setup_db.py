"""
setup_db.py — One-time local database setup script.

Run this ONCE before starting the server:
    python setup_db.py

It will:
1. Connect to PostgreSQL as postgres/admin123
2. Create the 'ai_interview_db' database if it doesn't exist
3. Run all Alembic migrations
"""

import asyncio
import subprocess
import sys
import os

# Handle Windows console encoding for emojis
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# Try to import psycopg2 for DB creation (sync)
try:
    import psycopg2
    from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
except ImportError:
    print("❌  psycopg2 not found. Run: pip install psycopg2-binary")
    sys.exit(1)

DB_NAME     = "ai_interview_db"
DB_USER     = "postgres"
DB_PASSWORD = "admin123"
DB_HOST     = "localhost"
DB_PORT     = 5432


def create_database():
    print(f"📦  Connecting to PostgreSQL at {DB_HOST}:{DB_PORT} ...")
    try:
        conn = psycopg2.connect(
            host=DB_HOST, port=DB_PORT,
            user=DB_USER, password=DB_PASSWORD,
            dbname="postgres"
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cur = conn.cursor()

        cur.execute("SELECT 1 FROM pg_database WHERE datname = %s", (DB_NAME,))
        exists = cur.fetchone()

        if exists:
            print(f"✅  Database '{DB_NAME}' already exists — skipping creation.")
        else:
            cur.execute(f'CREATE DATABASE "{DB_NAME}"')
            print(f"✅  Database '{DB_NAME}' created successfully.")

        cur.close()
        conn.close()
    except psycopg2.OperationalError as e:
        print(f"❌  Could not connect to PostgreSQL: {e}")
        print("    Make sure PostgreSQL is running on localhost:5432")
        sys.exit(1)


def run_migrations():
    print("\n🔄  Running Alembic migrations ...")
    
    # Use the alembic executable directly to avoid shadowing by the local 'alembic' directory
    # In a venv, it's usually in the same directory as the python executable
    executable_dir = os.path.dirname(sys.executable)
    alembic_cmd = "alembic"
    
    # Check for alembic.exe (Windows) or alembic (Unix) in the current python's bin/scripts dir
    for name in ["alembic.exe", "alembic"]:
        path = os.path.join(executable_dir, name)
        if os.path.exists(path):
            alembic_cmd = path
            break

    result = subprocess.run(
        [alembic_cmd, "upgrade", "head"],
        cwd=os.path.dirname(os.path.abspath(__file__)),
        capture_output=True, text=True
    )
    if result.returncode == 0:
        print("✅  Migrations applied successfully.")
        if result.stdout:
            print(result.stdout)
    else:
        print("❌  Migration failed:")
        print(result.stderr or result.stdout)
        print("\n💡 Tip: Make sure you are running this from your virtual environment:")
        print("   .\\.venv\\Scripts\\python setup_db.py")
        sys.exit(1)


def create_storage_dirs():
    dirs = [
        "storage/uploads/resumes",
        "storage/uploads/videos",
        "storage/uploads/audio",
        "storage/processed",
    ]
    for d in dirs:
        os.makedirs(d, exist_ok=True)
    print("✅  Storage directories created.")


if __name__ == "__main__":
    print("=" * 55)
    print("  AI Interview Platform — Local Setup")
    print("=" * 55)
    create_database()
    create_storage_dirs()
    run_migrations()
    print("\n🎉  Setup complete! You can now start the server:")
    print("    python run.py")
    print("=" * 55)
