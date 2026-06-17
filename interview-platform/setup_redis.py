"""
setup_redis.py — Download Redis locally into the project.

This script ensures redis-server.exe exists in redis/.
One-time download, then stored inside the project.
Uses native Python libraries for safe and fast downloading with progress tracking.
"""

import os
import sys
import urllib.request
import urllib.error
import zipfile
import shutil

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REDIS_DIR = os.path.join(SCRIPT_DIR, "redis")
REDIS_EXE = os.path.join(REDIS_DIR, "redis-server.exe")

REDIS_VERSION = "5.0.14"
REDIS_URL = f"https://github.com/tporadowski/redis/releases/download/v{REDIS_VERSION}/Redis-x64-{REDIS_VERSION}.zip"

def redis_exists():
    """Check if redis-server.exe actually exists."""
    if os.path.exists(REDIS_EXE):
        size = os.path.getsize(REDIS_EXE)
        print(f"✅ Redis found: {REDIS_EXE} ({size:,} bytes)")
        return True
    return False

def download_and_extract_redis():
    """Download and extract Redis using native Python libraries with progress."""
    print(f"📥 Downloading Redis {REDIS_VERSION}...")
    print(f"   URL: {REDIS_URL}\n")
    
    os.makedirs(REDIS_DIR, exist_ok=True)
    
    zip_path = os.path.join(REDIS_DIR, "redis.zip")
    temp_extract_dir = os.path.join(REDIS_DIR, "temp_extract")
    
    try:
        print("[1/3] Downloading...")
        # استخدام User-Agent أكثر واقعية وتحديد وقت أقصى للاتصال
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
        req = urllib.request.Request(REDIS_URL, headers=headers)
        
        with urllib.request.urlopen(req, timeout=15) as response, open(zip_path, 'wb') as out_file:
            total_length = response.getheader('Content-Length')
            
            if total_length is None: # السيرفر لم يرسل حجم الملف
                out_file.write(response.read())
            else:
                total_length = int(total_length)
                downloaded = 0
                chunk_size = 8192 # تحميل 8 كيلوبايت في كل لفة
                
                while True:
                    buffer = response.read(chunk_size)
                    if not buffer:
                        break
                    
                    downloaded += len(buffer)
                    out_file.write(buffer)
                    
                    # طباعة شريط التقدم بالميجابايت
                    downloaded_mb = downloaded / (1024 * 1024)
                    total_mb = total_length / (1024 * 1024)
                    print(f"\r      Progress: {downloaded_mb:.2f} MB / {total_mb:.2f} MB", end="", flush=True)
        
        print("\n[OK] Download completed!")
        
        print("[2/3] Extracting ZIP...")
        os.makedirs(temp_extract_dir, exist_ok=True)
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(temp_extract_dir)
        print("[OK] Extracted")
        
        print("[3/3] Locating and moving Redis files...")
        found_exe = False
        
        for root, dirs, files in os.walk(temp_extract_dir):
            for file in files:
                if file.lower().endswith(".exe") or file.lower().endswith(".conf"):
                    src_path = os.path.join(root, file)
                    dst_path = os.path.join(REDIS_DIR, file)
                    
                    if os.path.exists(dst_path):
                        os.remove(dst_path)
                        
                    shutil.move(src_path, dst_path)
                    
                    if file.lower() == "redis-server.exe":
                        found_exe = True
        
        if found_exe:
            final_size = os.path.getsize(REDIS_EXE)
            print(f"[OK] Found and moved: {REDIS_EXE} ({final_size:,} bytes)")
            return True
        else:
            print("❌ redis-server.exe not found in archive!")
            return False
            
    except urllib.error.URLError as e:
        print(f"\n❌ Network/Download Error: {e.reason}")
        print("   -> It seems there is an issue with the internet connection or GitHub is unreachable.")
        return False
    except TimeoutError:
        print("\n❌ Download timed out. The connection was too slow or blocked.")
        return False
    except Exception as e:
        print(f"\n❌ Unexpected Error: {e}")
        return False
        
    finally:
        print("🧹 Cleaning up temporary files...")
        if os.path.exists(zip_path):
            try: os.remove(zip_path)
            except OSError: pass
        if os.path.exists(temp_extract_dir):
            try: shutil.rmtree(temp_extract_dir)
            except OSError: pass

def main():
    """Main setup logic."""
    print("=" * 60)
    print("  Redis Setup for AI Interview Platform")
    print("=" * 60)
    print()
    
    if redis_exists():
        print("✅ Redis already available. No download needed.")
        return 0
    
    print(f"Redis will be saved to: {REDIS_DIR}")
    print()
    
    if download_and_extract_redis():
        print()
        print("=" * 60)
        print("✅ Redis Setup Complete!")
        print("=" * 60)
        print()
        print("Run the app now:")
        print("   python run.py")
        return 0
    else:
        print()
        print("=" * 60)
        print("❌ Setup Failed")
        print("=" * 60)
        print("Options:")
        print("1. Check your internet connection or Firewall/VPN.")
        print(f"2. Manually download and extract from: {REDIS_URL}")
        return 1

if __name__ == "__main__":
    sys.exit(main())