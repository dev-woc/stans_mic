import asyncio
import logging

from tasks.celery_app import celery_app
from pipeline.graph import graph, PipelineState
from db.connection import AsyncSessionLocal
from db import queries

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, max_retries=2, default_retry_delay=10)
def run_pipeline(self, state: dict) -> dict:
    """
    Execute the 4-agent Distill pipeline.
    Retries up to 2x on failure before surfacing error to user.
    """
    session_id = state.get("session_id", "unknown")
    logger.info(f"[Pipeline] Starting session {session_id}")

    try:
        result = graph.invoke(state)
        logger.info(f"[Pipeline] Completed session {session_id}, status: complete")
        return {"status": "complete", "session_id": session_id}

    except Exception as exc:
        logger.error(f"[Pipeline] Session {session_id} failed: {exc}")

        # Update session to failed if all retries exhausted
        if self.request.retries >= self.max_retries:
            asyncio.get_event_loop().run_until_complete(_mark_failed(session_id, str(exc)))
            return {"status": "failed", "session_id": session_id, "error": str(exc)}

        raise self.retry(exc=exc)


async def _mark_failed(session_id: str, error_message: str) -> None:
    async with AsyncSessionLocal() as db:
        await queries.update_session_status(
            db,
            session_id,
            status="failed",
            error_message=error_message[:500],
        )
