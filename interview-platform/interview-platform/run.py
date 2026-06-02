"""
run.py — Local development server launcher.
Automatically manages native Redis, Celery Worker, and FastAPI lifecycles.

Usage:
    python run.py              # Start all services seamlessly
"""

import sys
import os
import subprocess
import socket
import time
import uvicorn
import signal

# Track processes globally for signal handling
ACTIVE_PROCESSES = []

def cleanup_and_exit_tree():
    """Forcefully kill the entire process tree using OS taskkill to prevent Windows orphans."""
    print("\n👋 Gracefully stopping Celery and Redis...")
    for name, proc in ACTIVE_PROCESSES:
        try:
            proc.terminate()
        except Exception:
            pass
            
    print("💥 Forcefully terminating Uvicorn reload process tree...")
    # taskkill /T kills the process and all child processes spawned by it (like Uvicorn reloader/workers)
    try:
        subprocess.run(f"taskkill /F /T /PID {os.getpid()}", shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except Exception:
        pass
    sys.exit(0)

def signal_handler(sig, frame):
    cleanup_and_exit_tree()

# Register standard terminate/interrupt signals
signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

def is_redis_running(host="127.0.0.1", port=6379):
    """Check if Redis is already running on the given port."""
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(1)
    try:
        s.connect((host, port))
        s.close()
        return True
    except (socket.timeout, ConnectionRefusedError):
        return False

def start_services():
    global ACTIVE_PROCESSES
    
    print("=" * 60)
    print("        AI Interview Platform - Single Entry Launcher")
    print("=" * 60)
    print()

    # 1. Start Redis
    if is_redis_running():
        print("🟢 Redis is already running on port 6379 (Docker/Service). Skipping launch.")
    else:
        print("🚀 Starting local Native Windows Redis Server in a separate window...")
        redis_exe = os.path.join("redis", "redis-server.exe")
        redis_conf = os.path.join("redis", "redis.windows.conf")
        if os.path.exists(redis_exe):
            try:
                # Start Redis in a separate console window for stability and visibility
                p = subprocess.Popen(
                    [redis_exe, redis_conf],
                    creationflags=subprocess.CREATE_NEW_CONSOLE if os.name == 'nt' else 0
                )
                ACTIVE_PROCESSES.append(("Redis Server", p))
                
                # Wait for Redis to bind
                redis_started = False
                for _ in range(10):
                    if is_redis_running():
                        print("🟢 Native Redis Server started successfully!")
                        redis_started = True
                        break
                    time.sleep(0.5)
                
                if not redis_started:
                    print("⚠️ Redis started but port 6379 is not responding yet. Checking logs in the opened terminal.")
            except Exception as e:
                print(f"⚠️ Failed to start local Redis: {e}")
        else:
            print("⚠️ Local Redis executable not found. Please ensure Redis is running manually.")

    # 2. Start Celery Worker
    print("🚀 Starting Celery Worker (concurrency=1) in background...")
    try:
        p_celery = subprocess.Popen(
            [sys.executable, "run_celery.py"],
            creationflags=subprocess.CREATE_NEW_CONSOLE if os.name == 'nt' else 0
        )
        ACTIVE_PROCESSES.append(("Celery Worker", p_celery))
        print("🟢 Celery Worker launched (separate terminal opened for logs).")
    except Exception as e:
        print(f"⚠️ Failed to start Celery Worker: {e}")

    print()
    print("🟢 Starting FastAPI server on http://127.0.0.1:8000 ...")
    print("    Docs: http://127.0.0.1:8000/docs")
    print("=" * 60)
    print()

    # 3. Start FastAPI programmatically in-process
    try:
        uvicorn.run(
            "app.main:app",
            host="127.0.0.1",
            port=8000,
            reload=True,
            reload_dirs=["app"]
        )
    except Exception:
        cleanup_and_exit_tree()

if __name__ == "__main__":
    # Ensure working directory is the script's directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)
    start_services()
