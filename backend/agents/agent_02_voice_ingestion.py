"""
Agent 02 — Voice Ingestion Agent
Analyzes creator content to build/update the Voice Profile.
This agent runs as a background job (not in the main pipeline) — triggered by:
  1. Content uploaded via /api/ingest
  2. Feedback signals (accept/edit/reject) after each output
"""
import asyncio
import json
import os

import anthropic

from db.connection import AsyncSessionLocal
from db import queries


VOICE_ANALYSIS_SYSTEM = """You are an expert in analyzing how people communicate.

Analyze this transcribed content and extract voice attributes.

Return a JSON object:
{
  "vocabulary_level": "simple|conversational|technical|mixed",
  "avg_sentence_length": 0.0,
  "sentence_rhythm": "punchy|flowing|mixed",
  "energy_signature": "high|calm|builds|deadpan",
  "opener_pattern": "description of how they open content",
  "closer_pattern": "description of how they close content",
  "transition_style": "hard_cuts|smooth_bridges|rhetorical_questions|callback_loops|mixed",
  "pacing_wpm": 0,
  "filler_patterns": ["list", "of", "verbal", "tics"],
  "cultural_markers": ["detected", "slang", "references"],
  "direct_address_rate": 0.0,
  "plain_summary": "Plain English description of this creator's voice (2-3 sentences)"
}

Be specific and evidence-based. Extract actual patterns, not generalizations."""


async def analyze_content_for_voice(content_id: str, transcription: str) -> dict:
    """
    Analyze transcribed content and update the voice profile.
    Called after a piece of content is successfully transcribed.
    """
    client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        system=VOICE_ANALYSIS_SYSTEM,
        messages=[
            {
                "role": "user",
                "content": f"Analyze this creator's content:\n\n{transcription[:8000]}",
            }
        ],
    )

    raw = message.content[0].text
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]

    return json.loads(raw.strip())


async def update_profile_from_feedback(
    voice_profile_id: str,
    feedback_type: str,
    edited_content: str | None,
    rejection_reason: str | None,
) -> None:
    """
    Lightweight weight update based on user feedback signal.
    Full recalibration happens when enough feedback accumulates (threshold: 5+ edits).
    """
    # For MVP: log feedback signal — full weight recalculation is V1.1
    # In production: compare edited_content to original to extract delta attributes
    pass
