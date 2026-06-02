"""
run_celery.py — Local development Celery worker launcher.

Usage:
    python run_celery.py

Design rationale:
    The Gemini rate limiter (_rate_limited_ainvoke in gemini_client.py) uses an
    in-process asyncio.Lock and a module-level timestamp variable. These are not
    shared across OS processes. Running Celery with concurrency > 1 spawns multiple
    isolated worker processes, each with its own independent rate limiter, causing
    each worker to believe it has a fresh Gemini quota — resulting in request floods.

    --concurrency=1 --pool=solo ensures a single worker process, so the in-process
    rate limiter is the sole authority on Gemini pacing. This is the correct and
    safe configuration for local development on a free-tier Gemini API key.

    For production with multiple API keys or higher quota tiers, switch to a
    Redis-backed distributed semaphore before increasing concurrency.
"""

import sys
import os
import subprocess


def start_celery():
    print("Starting Celery worker (single-process, safe for free-tier Gemini quota)...")
    print("  Concurrency : 1  (in-process rate limiter is effective)")
    print("  Pool        : solo  (no subprocess overhead)")
    print("  Queue       : default")
    print("  Loglevel    : info")
    print()

    subprocess.run([
        sys.executable, "-m", "celery",
        "-A", "app.celery_app.celery_app",
        "worker",
        "--loglevel=info",
        "--concurrency=1",
        "--pool=solo",
        "-Q", "default",
    ])


if __name__ == "__main__":
    # Ensure the working directory is the project root (where app/ lives)
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)
    try:
        start_celery()
    except KeyboardInterrupt:
        print("\n👋  Celery worker stopped by user.")
        sys.exit(0)
