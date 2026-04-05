"""
Agent 01 — Input Ingestion Agent
Converts any raw input format into a structured Idea Dump.
"""
import asyncio
import json
import os
import tempfile

import anthropic

from pipeline.graph import PipelineState
from db.connection import AsyncSessionLocal
from db import queries


IDEA_EXTRACTION_SYSTEM = """You are an expert content analyst helping creators distill their raw ideas.

Your job is to extract distinct idea threads from raw creator input.

Return a JSON object with this exact structure:
{
  "idea_threads": [
    {
      "id": "idea_1",
      "text": "...",
      "tone": "personal|informative|controversial|motivational|humorous",
      "priority": 1-10,
      "word_count": 0
    }
  ],
  "total_words": 0,
  "emotional_arc": "...",
  "strongest_idea": "idea_1",
  "suggested_structure": "narrative|listicle|argument|story|rapid-fire"
}

Extract 3-8 distinct ideas. Be specific. Preserve the creator's actual language where possible.
Rank by priority (10 = strongest hook potential)."""


def run_ingestion_agent(state: PipelineState) -> dict:
    """Synchronous wrapper — runs async ingestion in event loop."""
    return asyncio.get_event_loop().run_until_complete(_run_ingestion_async(state))


async def _run_ingestion_async(state: PipelineState) -> dict:
    session_id = state["session_id"]

    # Update status: ingestion started
    async with AsyncSessionLocal() as db:
        await queries.update_session_status(db, session_id, "processing", agent_step="ingestion")

    try:
        raw_text = await _get_raw_text(state)

        # Extract idea threads via Claude
        client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
        message = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=2048,
            system=IDEA_EXTRACTION_SYSTEM,
            messages=[
                {
                    "role": "user",
                    "content": f"Extract ideas from this raw creator input:\n\n{raw_text}",
                }
            ],
        )

        raw_response = message.content[0].text
        # Strip markdown code blocks if present
        if raw_response.startswith("```"):
            raw_response = raw_response.split("```")[1]
            if raw_response.startswith("json"):
                raw_response = raw_response[4:]

        idea_dump = json.loads(raw_response.strip())
        idea_dump["raw_text"] = raw_text

        return {
            "idea_dump": idea_dump,
            "transcription_quality": state.get("transcription_quality", 1.0),
        }

    except Exception as e:
        return {"error": f"Ingestion agent failed: {str(e)}"}


async def _get_raw_text(state: PipelineState) -> str:
    """Get raw text from the input — transcribing if necessary."""
    input_type = state["input_type"]

    if input_type == "text":
        return state.get("input_text", "")

    if input_type in ("youtube", "tiktok"):
        from services.media_extraction import extract_audio_from_url
        from services.transcription import transcribe_audio

        url = state.get("input_url", "")
        with tempfile.TemporaryDirectory() as tmpdir:
            audio_path = await extract_audio_from_url(url, output_dir=tmpdir)
            text, confidence = await transcribe_audio(audio_path)
            return text

    # For audio/video file uploads — path stored in state (from S3 download)
    if input_type in ("audio", "video"):
        from services.transcription import transcribe_audio

        file_path = state.get("input_file_path", "")
        if input_type == "video":
            from services.media_extraction import extract_audio_from_video
            file_path = await extract_audio_from_video(file_path)
        text, confidence = await transcribe_audio(file_path)
        return text

    return state.get("input_text", "")
