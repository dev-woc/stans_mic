"""
Agent 03 — Compression & Structure Agent
Extracts 3-4 core ideas and builds a tight 3-minute content blueprint.
Hard constraint: word count must stay within floor/ceiling for the creator's pacing.
"""
import asyncio
import json
import os

import anthropic

from pipeline.graph import PipelineState
from db.connection import AsyncSessionLocal
from db import queries
from models.voice_profile import VoiceProfileModel


COMPRESSION_SYSTEM = """You are an expert content architect who specializes in 3-minute creator content.

Your job: extract the strongest ideas from raw material and build a tight 3-minute content structure.

HARD CONSTRAINTS (non-negotiable):
- Total word count MUST be between {word_floor} and {word_ceiling} words
- Structure must have: HOOK (opening ~40 words), BRIDGE (~30 words), 2-3 CORE POINTS (~80 words each), CLOSER (~60 words)
- Every word must earn its place

VOICE PROFILE CONTEXT:
{voice_profile_context}

Return a JSON object:
{{
  "hook": "opening text",
  "bridge": "context/credibility text",
  "core_points": [
    {{"label": "POINT 1", "text": "...", "word_count": 0}},
    {{"label": "POINT 2", "text": "...", "word_count": 0}},
    {{"label": "POINT 3", "text": "...", "word_count": 0}}
  ],
  "closer": "closing text",
  "total_word_count": 0,
  "estimated_runtime_seconds": 0,
  "what_got_cut": [
    {{"idea": "...", "reason": "why it was cut"}},
  ],
  "alt_openers": ["alternate hook 1", "alternate hook 2"]
}}

The alt_openers should offer meaningfully different approaches (e.g., one direct/bold, one story-based).
In what_got_cut, include EVERY idea from the input that didn't make it in — so the creator can reinstate if needed."""


def run_compression_agent(state: PipelineState) -> dict:
    return asyncio.get_event_loop().run_until_complete(_run_compression_async(state))


async def _run_compression_async(state: PipelineState) -> dict:
    session_id = state["session_id"]

    async with AsyncSessionLocal() as db:
        await queries.update_session_status(db, session_id, "processing", agent_step="compression")

    try:
        idea_dump = state.get("idea_dump", {})
        voice_profile_data = state.get("voice_profile")

        # Build voice profile model (use defaults if no profile)
        if voice_profile_data:
            voice_profile = VoiceProfileModel(**voice_profile_data)
        else:
            voice_profile = VoiceProfileModel(id="default", user_id=state["user_id"])

        word_floor = voice_profile.word_count_floor
        word_ceiling = voice_profile.word_count_ceiling

        # Build the ideas text for the prompt
        ideas_text = idea_dump.get("raw_text", "")
        if idea_dump.get("idea_threads"):
            threads = idea_dump["idea_threads"]
            sorted_threads = sorted(threads, key=lambda x: x.get("priority", 0), reverse=True)
            ideas_text = "\n\n".join(
                f"[IDEA {t['id']} - Priority {t.get('priority', 5)}]: {t['text']}"
                for t in sorted_threads
            )

        user_intent = state.get("user_intent", "")
        if user_intent:
            ideas_text = f"USER INTENT: {user_intent}\n\n{ideas_text}"

        system_prompt = COMPRESSION_SYSTEM.format(
            word_floor=word_floor,
            word_ceiling=word_ceiling,
            voice_profile_context=json.dumps(voice_profile.to_prompt_context(), indent=2),
        )

        client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
        message = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=3000,
            system=system_prompt,
            messages=[
                {
                    "role": "user",
                    "content": f"Build a 3-minute content structure from these ideas:\n\n{ideas_text}",
                }
            ],
        )

        raw = message.content[0].text
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]

        blueprint = json.loads(raw.strip())

        # Enforce word count — retry once if out of range
        total_words = blueprint.get("total_word_count", 0)
        if not (word_floor <= total_words <= word_ceiling):
            correction_msg = (
                f"The word count was {total_words}. It MUST be between {word_floor} and {word_ceiling}. "
                f"Adjust the content and return the corrected JSON."
            )
            message2 = client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=3000,
                system=system_prompt,
                messages=[
                    {"role": "user", "content": f"Build a 3-minute content structure from these ideas:\n\n{ideas_text}"},
                    {"role": "assistant", "content": raw},
                    {"role": "user", "content": correction_msg},
                ],
            )
            raw2 = message2.content[0].text
            if raw2.startswith("```"):
                raw2 = raw2.split("```")[1]
                if raw2.startswith("json"):
                    raw2 = raw2[4:]
            blueprint = json.loads(raw2.strip())

        return {"content_blueprint": blueprint}

    except Exception as e:
        return {"error": f"Compression agent failed: {str(e)}"}
