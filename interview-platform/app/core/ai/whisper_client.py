import os
import asyncio
from groq import AsyncGroq
from tenacity import retry, wait_exponential, stop_after_attempt

from app.core.config import GROQ_API_KEY

class WhisperClient:
    @staticmethod
    @retry(wait=wait_exponential(multiplier=1, min=4, max=10), stop=stop_after_attempt(3))
    async def transcribe(
        audio_path: str,
        prompt: str = None,
        language: str = None,
        temperature: float = 0.0
    ) -> str:
        if not GROQ_API_KEY:
            raise RuntimeError("GROQ_API_KEY is not configured")
            
        client = AsyncGroq(api_key=GROQ_API_KEY)
        with open(audio_path, "rb") as file:
            kwargs = {
                "file": (os.path.basename(audio_path), file.read()),
                "model": "whisper-large-v3-turbo",
                "response_format": "verbose_json",
                "temperature": temperature
            }
            if prompt:
                kwargs["prompt"] = prompt
            if language:
                kwargs["language"] = language

            transcription = await client.audio.transcriptions.create(**kwargs)
        
        return transcription.text
