"""
Transcription service.
Primary: OpenAI Whisper API
Fallback: AssemblyAI (better noise handling)
"""
import os
from typing import Optional


async def transcribe_audio(file_path: str, use_fallback: bool = False) -> tuple[str, float]:
    """
    Transcribe an audio file.
    Returns (transcription_text, confidence_score 0-1).
    """
    if use_fallback:
        return await _transcribe_assemblyai(file_path)
    try:
        return await _transcribe_whisper(file_path)
    except Exception:
        # Auto-fallback to AssemblyAI on Whisper failure
        return await _transcribe_assemblyai(file_path)


async def _transcribe_whisper(file_path: str) -> tuple[str, float]:
    from openai import AsyncOpenAI

    client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    with open(file_path, "rb") as f:
        response = await client.audio.transcriptions.create(
            model="whisper-1",
            file=f,
            response_format="verbose_json",
        )
    # verbose_json includes segments with confidence; approximate overall confidence
    confidence = 0.9  # Whisper doesn't return a single confidence score; use 0.9 as default
    if hasattr(response, "segments") and response.segments:
        avg_no_speech = sum(s.get("no_speech_prob", 0) for s in response.segments) / len(response.segments)
        confidence = 1.0 - avg_no_speech
    return response.text, confidence


async def _transcribe_assemblyai(file_path: str) -> tuple[str, float]:
    import assemblyai as aai

    aai.settings.api_key = os.getenv("ASSEMBLYAI_API_KEY")
    transcriber = aai.Transcriber()
    transcript = transcriber.transcribe(file_path)
    if transcript.status == aai.TranscriptStatus.error:
        raise RuntimeError(f"AssemblyAI transcription failed: {transcript.error}")
    confidence = transcript.confidence or 0.8
    return transcript.text or "", confidence


def is_low_quality_audio(confidence: float) -> bool:
    """Flag audio that may produce unreliable transcription."""
    return confidence < 0.6
