"""
downloader.py — Universal media downloader.

Supports:
  - YouTube, Vimeo, Dailymotion, Twitter/X, Instagram, TikTok (via yt-dlp)
  - Google Drive sharing links (via requests + gdown fallback)
  - Direct file URLs (mp4, mp3, wav, webm, m4a, ogg, mov)

Returns (local_file_path, file_type_ext) ready to be handed to the pipeline.
"""

import os
import re
import uuid
import asyncio
import requests
from loguru import logger
from app.core.config import AUDIO_UPLOAD_DIR, VIDEO_UPLOAD_DIR

SUPPORTED_AUDIO_EXTS = {"mp3", "wav", "m4a", "ogg", "webm"}
SUPPORTED_VIDEO_EXTS = {"mp4", "mov", "webm", "mkv"}

DIRECT_URL_PATTERN = re.compile(
    r"\.(mp4|mov|webm|mkv|mp3|wav|m4a|ogg)(\?.*)?$", re.IGNORECASE
)
GDRIVE_PATTERN = re.compile(
    r"drive\.google\.com/(?:file/d/|open\?id=|uc\?.*id=)([\w-]+)"
)


def _detect_ext(path: str) -> str:
    """Detect extension from a local file path."""
    _, ext = os.path.splitext(path)
    return ext.lstrip(".").lower()


def _storage_dir(ext: str) -> str:
    if ext in SUPPORTED_VIDEO_EXTS:
        return VIDEO_UPLOAD_DIR
    return AUDIO_UPLOAD_DIR


def _download_direct(url: str, dest_path: str) -> None:
    """Download a direct file URL using requests streaming."""
    headers = {"User-Agent": "Mozilla/5.0"}
    with requests.get(url, stream=True, headers=headers, timeout=120) as r:
        r.raise_for_status()
        with open(dest_path, "wb") as f:
            for chunk in r.iter_content(chunk_size=1024 * 1024):
                if chunk:
                    f.write(chunk)


def _download_gdrive(file_id: str, dest_path: str) -> None:
    """Download a Google Drive file by ID using the export/download API."""
    import gdown
    url = f"https://drive.google.com/uc?id={file_id}"
    gdown.download(url, dest_path, quiet=False)


def _download_ytdlp(url: str, session_id: int) -> tuple[str, str]:
    """
    Download from any yt-dlp supported site.
    Returns (file_path, ext).
    Prefers best audio quality to save storage & processing time.
    """
    import yt_dlp

    uid = f"{session_id}_url_{uuid.uuid4().hex[:8]}"
    output_template = os.path.join(AUDIO_UPLOAD_DIR, f"{uid}.%(ext)s")

    ydl_opts = {
        "format": "bestaudio/best",
        "outtmpl": output_template,
        "quiet": True,
        "no_warnings": True,
        "postprocessors": [{
            "key": "FFmpegExtractAudio",
            "preferredcodec": "mp3",
            "preferredquality": "64",
        }],
        "ffmpeg_location": _find_ffmpeg(),
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=True)
        # After postprocessing the file will be .mp3
        expected_path = os.path.join(AUDIO_UPLOAD_DIR, f"{uid}.mp3")
        if os.path.exists(expected_path):
            return expected_path, "mp3"
        # Fallback: find any created file matching uid
        for fname in os.listdir(AUDIO_UPLOAD_DIR):
            if fname.startswith(uid):
                ext = _detect_ext(fname)
                return os.path.join(AUDIO_UPLOAD_DIR, fname), ext

    raise RuntimeError("yt-dlp download completed but output file not found")


def _find_ffmpeg() -> str:
    """Return path to ffmpeg binary."""
    import shutil
    project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    local = os.path.join(project_root, "ffmpeg.exe")
    if os.path.exists(local):
        return project_root
    found = shutil.which("ffmpeg")
    if found:
        return os.path.dirname(found)
    return ""


async def download_media_from_url(url: str, session_id: int) -> tuple[str, str]:
    """
    Universal download entry point.
    Returns (absolute_file_path, file_type_ext).
    Runs blocking I/O in a thread pool to avoid blocking the event loop.
    """
    def _sync_download():
        url_stripped = url.strip()
        logger.info(f"[Downloader] URL: {url_stripped}")

        # 1. Google Drive
        gdrive_match = GDRIVE_PATTERN.search(url_stripped)
        if gdrive_match:
            file_id = gdrive_match.group(1)
            dest = os.path.join(AUDIO_UPLOAD_DIR, f"{session_id}_media_gdrive.mp4")
            logger.info(f"[Downloader] Google Drive file_id={file_id}")
            _download_gdrive(file_id, dest)
            ext = _detect_ext(dest)
            return dest, ext

        # 2. Direct file URL
        if DIRECT_URL_PATTERN.search(url_stripped):
            m = DIRECT_URL_PATTERN.search(url_stripped)
            ext = m.group(1).lower()
            storage = _storage_dir(ext)
            dest = os.path.join(storage, f"{session_id}_media.{ext}")
            logger.info(f"[Downloader] Direct URL → {ext}")
            _download_direct(url_stripped, dest)
            return dest, ext

        # 3. yt-dlp (YouTube, Vimeo, TikTok, etc.)
        logger.info(f"[Downloader] yt-dlp fallback")
        return _download_ytdlp(url_stripped, session_id)

    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _sync_download)
