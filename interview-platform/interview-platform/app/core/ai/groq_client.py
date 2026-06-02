import os
from groq import AsyncGroq
from tenacity import retry, wait_exponential, stop_after_attempt
import asyncio
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if GROQ_API_KEY:
    GROQ_API_KEY = GROQ_API_KEY.strip('"' + "'")

class GroqClient:
    @staticmethod
    @retry(wait=wait_exponential(multiplier=1, min=4, max=10), stop=stop_after_attempt(3))
    async def transcribe(
        audio_path: str,
        prompt: str = None,
        language: str = None,
        temperature: float = 0.0
    ) -> str:
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
        
        # We can also access timestamps or metadata here using transcription.segments
        # but for the pipeline we just need the text
        return transcription.text
