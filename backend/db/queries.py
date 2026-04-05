"""
Raw SQL queries for the Distill backend.
Uses SQLAlchemy core (text()) against the same Neon Postgres instance as the Next.js frontend.
"""
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from models.voice_profile import VoiceProfileModel


async def get_voice_profile(db: AsyncSession, profile_id: str) -> Optional[VoiceProfileModel]:
    result = await db.execute(
        text("SELECT * FROM voice_profiles WHERE id = :id LIMIT 1"),
        {"id": profile_id},
    )
    row = result.mappings().first()
    if not row:
        return None
    return VoiceProfileModel(**dict(row))


async def update_session_status(
    db: AsyncSession,
    session_id: str,
    status: str,
    agent_step: Optional[str] = None,
    error_message: Optional[str] = None,
) -> None:
    await db.execute(
        text("""
            UPDATE distillation_sessions
            SET status = :status,
                agent_step = COALESCE(:agent_step, agent_step),
                error_message = :error_message,
                updated_at = NOW()
            WHERE id = :id
        """),
        {
            "id": session_id,
            "status": status,
            "agent_step": agent_step,
            "error_message": error_message,
        },
    )
    await db.commit()


async def save_output(
    db: AsyncSession,
    session_id: str,
    final_script: str,
    timing_markers: list,
    what_got_cut: list,
    alt_openers: list,
    voice_match_score: float,
    readability_score: float,
    word_count: int,
    estimated_runtime_seconds: int,
) -> None:
    import json

    await db.execute(
        text("""
            INSERT INTO distillation_outputs
                (session_id, final_script, timing_markers, what_got_cut, alt_openers,
                 voice_match_score, readability_score, word_count, estimated_runtime_seconds)
            VALUES
                (:session_id, :final_script, :timing_markers::jsonb, :what_got_cut::jsonb,
                 :alt_openers::jsonb, :voice_match_score, :readability_score,
                 :word_count, :estimated_runtime_seconds)
            ON CONFLICT (session_id) DO UPDATE SET
                final_script = EXCLUDED.final_script,
                timing_markers = EXCLUDED.timing_markers,
                what_got_cut = EXCLUDED.what_got_cut,
                alt_openers = EXCLUDED.alt_openers,
                voice_match_score = EXCLUDED.voice_match_score,
                readability_score = EXCLUDED.readability_score,
                word_count = EXCLUDED.word_count,
                estimated_runtime_seconds = EXCLUDED.estimated_runtime_seconds
        """),
        {
            "session_id": session_id,
            "final_script": final_script,
            "timing_markers": json.dumps(timing_markers),
            "what_got_cut": json.dumps(what_got_cut),
            "alt_openers": json.dumps(alt_openers),
            "voice_match_score": voice_match_score,
            "readability_score": readability_score,
            "word_count": word_count,
            "estimated_runtime_seconds": estimated_runtime_seconds,
        },
    )
    await db.commit()


async def update_ingested_content_status(
    db: AsyncSession,
    content_id: str,
    status: str,
    transcription: Optional[str] = None,
    duration_seconds: Optional[int] = None,
    error_message: Optional[str] = None,
) -> None:
    await db.execute(
        text("""
            UPDATE ingested_content
            SET processing_status = :status,
                transcription = COALESCE(:transcription, transcription),
                duration_seconds = COALESCE(:duration_seconds, duration_seconds),
                error_message = :error_message
            WHERE id = :id
        """),
        {
            "id": content_id,
            "status": status,
            "transcription": transcription,
            "duration_seconds": duration_seconds,
            "error_message": error_message,
        },
    )
    await db.commit()


async def increment_voice_profile_content_count(
    db: AsyncSession,
    profile_id: str,
    content_type: str,
) -> None:
    if content_type == "own":
        await db.execute(
            text("""
                UPDATE voice_profiles
                SET own_content_count = own_content_count + 1,
                    updated_at = NOW()
                WHERE id = :id
            """),
            {"id": profile_id},
        )
    await db.commit()
