import asyncio
import logging
from typing import Optional

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from tasks.celery_app import celery_app
from models.session import IngestRequest
from db.connection import AsyncSessionLocal
from db import queries
from agents.agent_02_voice_ingestion import analyze_content_for_voice

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/ingest")
async def queue_ingestion(request: IngestRequest):
    """Queue a content ingestion job for Voice Profile building."""
    ingest_content.delay(
        content_id=request.contentId,
        user_id=request.userId,
        voice_profile_id=request.voiceProfileId,
        content_type=request.contentType,
        source_type=request.sourceType,
        source_url=request.sourceUrl,
        borrow_tags=request.borrowTags,
    )
    return JSONResponse({"status": "queued", "contentId": request.contentId})


@router.post("/voice-profiles/{profile_id}/update-weights")
async def update_voice_weights(profile_id: str, payload: dict):
    """Trigger background weight update from feedback signal."""
    update_voice_profile_weights.delay(
        voice_profile_id=profile_id,
        session_id=payload.get("sessionId"),
        feedback_type=payload.get("feedbackType"),
        edited_content=payload.get("editedContent"),
        rejection_reason=payload.get("rejectionReason"),
    )
    return JSONResponse({"status": "queued"})


@celery_app.task(bind=True, max_retries=2)
def ingest_content(
    self,
    content_id: str,
    user_id: str,
    voice_profile_id: str,
    content_type: str,
    source_type: str,
    source_url: Optional[str] = None,
    borrow_tags: list = [],
) -> None:
    asyncio.get_event_loop().run_until_complete(
        _ingest_content_async(
            content_id, user_id, voice_profile_id, content_type, source_type, source_url
        )
    )


async def _ingest_content_async(
    content_id: str,
    user_id: str,
    voice_profile_id: str,
    content_type: str,
    source_type: str,
    source_url: Optional[str],
) -> None:
    import tempfile

    async with AsyncSessionLocal() as db:
        await queries.update_ingested_content_status(db, content_id, "processing")

    try:
        transcription = ""
        duration_seconds = None

        if source_type in ("youtube", "tiktok"):
            from services.media_extraction import extract_audio_from_url
            from services.transcription import transcribe_audio

            with tempfile.TemporaryDirectory() as tmpdir:
                audio_path = await extract_audio_from_url(source_url, output_dir=tmpdir)
                transcription, _ = await transcribe_audio(audio_path)

        # Run voice analysis on the transcription
        if transcription and content_type == "own":
            voice_attributes = await analyze_content_for_voice(content_id, transcription)

            # Update voice profile with extracted attributes (simple merge for now)
            async with AsyncSessionLocal() as db:
                await db.execute(
                    __import__("sqlalchemy").text("""
                        UPDATE voice_profiles SET
                            plain_summary = :summary,
                            pacing_wpm = COALESCE(:pacing_wpm, pacing_wpm),
                            vocabulary_level = COALESCE(:vocabulary_level, vocabulary_level),
                            sentence_rhythm = COALESCE(:sentence_rhythm, sentence_rhythm),
                            energy_signature = COALESCE(:energy_signature, energy_signature),
                            own_content_count = own_content_count + 1,
                            confidence_score = LEAST(1.0, confidence_score + 0.1),
                            version = version + 1,
                            updated_at = NOW()
                        WHERE id = :profile_id
                    """),
                    {
                        "profile_id": voice_profile_id,
                        "summary": voice_attributes.get("plain_summary"),
                        "pacing_wpm": voice_attributes.get("pacing_wpm"),
                        "vocabulary_level": voice_attributes.get("vocabulary_level"),
                        "sentence_rhythm": voice_attributes.get("sentence_rhythm"),
                        "energy_signature": voice_attributes.get("energy_signature"),
                    },
                )
                await db.commit()

        async with AsyncSessionLocal() as db:
            await queries.update_ingested_content_status(
                db, content_id, "complete", transcription=transcription
            )

    except Exception as e:
        async with AsyncSessionLocal() as db:
            await queries.update_ingested_content_status(
                db, content_id, "failed", error_message=str(e)[:500]
            )
        logger.error(f"Ingestion failed for content {content_id}: {e}")


@celery_app.task
def update_voice_profile_weights(
    voice_profile_id: str,
    session_id: str,
    feedback_type: str,
    edited_content: Optional[str],
    rejection_reason: Optional[str],
) -> None:
    from agents.agent_02_voice_ingestion import update_profile_from_feedback
    asyncio.get_event_loop().run_until_complete(
        update_profile_from_feedback(
            voice_profile_id, feedback_type, edited_content, rejection_reason
        )
    )
