import subprocess
import os

# Set up clean, healthy static ffmpeg binaries in PATH
# First, check if there is a local ffmpeg in the project root
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
local_ffmpeg = os.path.join(PROJECT_ROOT, "ffmpeg.exe")

if os.path.exists(local_ffmpeg):
    if PROJECT_ROOT not in os.environ["PATH"]:
        os.environ["PATH"] = PROJECT_ROOT + os.pathsep + os.environ["PATH"]
else:
    try:
        import static_ffmpeg
        static_ffmpeg.add_paths()
    except Exception as ex:
        print(f"Warning: failed to add static ffmpeg paths: {ex}")

class FFmpegClient:
    @staticmethod
    def extract_audio(input_path: str, output_path: str) -> str:
        command = [
            "ffmpeg", "-y", "-i", input_path,
            "-vn", "-ar", "16000", "-ac", "1", "-b:a", "64k", output_path
        ]
        try:
            result = subprocess.run(command, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            return output_path
        except subprocess.CalledProcessError as e:
            raise Exception(f"FFmpeg error: {e.stderr.decode('utf-8', errors='ignore')}")

    @staticmethod
    def get_duration(file_path: str) -> int:
        command = [
            "ffprobe", "-v", "error", "-show_entries",
            "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", file_path
        ]
        try:
            result = subprocess.run(command, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            return int(float(result.stdout.decode().strip()))
        except (subprocess.CalledProcessError, FileNotFoundError):
            return 0
