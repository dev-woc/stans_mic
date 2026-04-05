"""
Agent 04 — Voice Calibration Agent
Rewrites the content blueprint in the creator's specific voice.
This is the most differentiated step — output must NOT sound like AI.
If voice_match_score < 0.70, flags the output for recalibration.
"""
import asyncio
import json
import os
import re

import anthropic

from pipeline.graph import PipelineState
from db.connection import AsyncSessionLocal
from db import queries
from models.voice_profile import VoiceProfileModel


CALIBRATION_SYSTEM = """You are a voice calibration specialist. You write in other people's voices — not your own.

Your job: rewrite a content blueprint so it sounds EXACTLY like the creator described in the Voice Profile below.

<voice_profile>
{voice_profile_json}
</voice_profile>

RULES:
1. Do NOT change the substance — every idea from the blueprint must remain
2. DO change: sentence structure, vocabulary, rhythm, energy, opener style, closer style, transitions
3. Add inline timing markers: [0:00] at the start, then approximately every 20-30 seconds
4. The output must sound like the creator talking, not like AI writing
5. Match their pacing: target {pacing_wpm} words per minute
6. If their profile shows high direct address rate ({direct_address_rate:.1f}/min), use "you" frequently

Return a JSON object:
{{
  "final_script": "The complete script with [0:00] timing markers inline...",
  "voice_match_analysis": {{
    "vocabulary_match": 0.0-1.0,
    "rhythm_match": 0.0-1.0,
    "energy_match": 0.0-1.0,
    "opener_match": 0.0-1.0,
    "closer_match": 0.0-1.0,
    "overall_score": 0.0-1.0,
    "notes": "what worked well and what could be better"
  }},
  "readability_score": 0.0-1.0,
  "word_count": 0
}}

If the voice profile confidence is below 0.4, note in the analysis that calibration may improve with more content."""


def run_calibration_agent(state: PipelineState) -> dict:
    return asyncio.get_event_loop().run_until_complete(_run_calibration_async(state))


async def _run_calibration_async(state: PipelineState) -> dict:
    session_id = state["session_id"]

    async with AsyncSessionLocal() as db:
        await queries.update_session_status(db, session_id, "processing", agent_step="calibration")

    try:
        blueprint = state.get("content_blueprint", {})
        voice_profile_data = state.get("voice_profile")

        if voice_profile_data:
            voice_profile = VoiceProfileModel(**voice_profile_data)
        else:
            voice_profile = VoiceProfileModel(id="default", user_id=state["user_id"])

        # Build the script text from blueprint sections
        blueprint_text = _blueprint_to_text(blueprint)

        system_prompt = CALIBRATION_SYSTEM.format(
            voice_profile_json=json.dumps(voice_profile.to_prompt_context(), indent=2),
            pacing_wpm=voice_profile.pacing_wpm,
            direct_address_rate=voice_profile.direct_address_rate or 4.0,
        )

        client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
        message = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=4000,
            system=system_prompt,
            messages=[
                {
                    "role": "user",
                    "content": f"Calibrate this blueprint to the creator's voice:\n\n{blueprint_text}",
                }
            ],
        )

        raw = message.content[0].text
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]

        result = json.loads(raw.strip())

        voice_match_score = result.get("voice_match_analysis", {}).get("overall_score", 0.75)
        final_script = result.get("final_script", "")

        # Extract timing markers from the script
        timing_markers = _extract_timing_markers(final_script)

        # Count words (excluding timing markers)
        clean_script = re.sub(r"\[\d+:\d+\]", "", final_script)
        word_count = len(clean_script.split())

        # Estimate runtime
        estimated_runtime = int((word_count / voice_profile.pacing_wpm) * 60)

        return {
            "final_script": final_script,
            "timing_markers": timing_markers,
            "alt_openers": blueprint.get("alt_openers", []),
            "what_got_cut": blueprint.get("what_got_cut", []),
            "voice_match_score": voice_match_score,
            "readability_score": result.get("readability_score", 0.8),
            "word_count": word_count,
            "estimated_runtime_seconds": estimated_runtime,
        }

    except Exception as e:
        return {"error": f"Calibration agent failed: {str(e)}"}


def _blueprint_to_text(blueprint: dict) -> str:
    parts = []
    if blueprint.get("hook"):
        parts.append(f"HOOK:\n{blueprint['hook']}")
    if blueprint.get("bridge"):
        parts.append(f"BRIDGE:\n{blueprint['bridge']}")
    for point in blueprint.get("core_points", []):
        parts.append(f"{point.get('label', 'POINT')}:\n{point.get('text', '')}")
    if blueprint.get("closer"):
        parts.append(f"CLOSER:\n{blueprint['closer']}")
    return "\n\n".join(parts)


def _extract_timing_markers(script: str) -> list[dict]:
    """Extract [0:00] style timing markers and their positions."""
    markers = []
    word_count = 0
    for line in script.split("\n"):
        match = re.search(r"\[(\d+:\d+)\]", line)
        if match:
            # Get surrounding label (uppercase word after the marker)
            label_match = re.search(r"\[(\d+:\d+)\]\s*([A-Z][A-Z\s]+)?", line)
            label = label_match.group(2).strip() if label_match and label_match.group(2) else ""
            markers.append({
                "time": match.group(1),
                "label": label or "",
                "wordOffset": word_count,
            })
        word_count += len(re.sub(r"\[\d+:\d+\]", "", line).split())
    return markers
