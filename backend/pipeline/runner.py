import asyncio
import logging
from fastapi import APIRouter
from fastapi.responses import JSONResponse

from models.session import PipelineRunRequest
from db.connection import AsyncSessionLocal
from db import queries
from tasks.pipeline_tasks import run_pipeline

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/pipeline/run")
async def trigger_pipeline(request: PipelineRunRequest):
    """
    Receive a pipeline run request from Next.js and dispatch to Celery.
    Returns immediately — pipeline runs async.
    """
    # Load voice profile if provided
    voice_profile_dict = None
    if request.voiceProfileId:
        async with AsyncSessionLocal() as db:
            profile = await queries.get_voice_profile(db, request.voiceProfileId)
            if profile:
                voice_profile_dict = profile.model_dump()

    initial_state = {
        "session_id": request.sessionId,
        "user_id": request.userId,
        "input_type": request.inputType,
        "input_text": request.inputText,
        "input_url": request.inputUrl,
        "user_intent": request.userIntent,
        "voice_profile": voice_profile_dict,
        # Initialized to None — filled by agents
        "idea_dump": None,
        "transcription_quality": None,
        "content_blueprint": None,
        "final_script": None,
        "timing_markers": None,
        "alt_openers": None,
        "what_got_cut": None,
        "voice_match_score": None,
        "readability_score": None,
        "word_count": None,
        "estimated_runtime_seconds": None,
        "error": None,
    }

    task = run_pipeline.delay(initial_state)
    logger.info(f"[Runner] Dispatched pipeline task {task.id} for session {request.sessionId}")

    return JSONResponse({"status": "queued", "taskId": task.id, "sessionId": request.sessionId})
