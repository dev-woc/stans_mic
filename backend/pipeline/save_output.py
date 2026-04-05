"""
Save output node — final step in the pipeline.
Writes completed output to the database and marks session as complete.
"""
import asyncio
from pipeline.graph import PipelineState
from db.connection import AsyncSessionLocal
from db import queries


def save_output_node(state: PipelineState) -> dict:
    """Synchronous wrapper for the async save operation (Celery compatibility)."""
    asyncio.get_event_loop().run_until_complete(_save_output_async(state))
    return {"error": None}


async def _save_output_async(state: PipelineState) -> None:
    async with AsyncSessionLocal() as db:
        if state.get("error"):
            await queries.update_session_status(
                db,
                state["session_id"],
                status="failed",
                error_message=state["error"],
            )
            return

        await queries.save_output(
            db,
            session_id=state["session_id"],
            final_script=state.get("final_script", ""),
            timing_markers=state.get("timing_markers", []),
            what_got_cut=state.get("what_got_cut", []),
            alt_openers=state.get("alt_openers", []),
            voice_match_score=state.get("voice_match_score", 0.0),
            readability_score=state.get("readability_score", 0.0),
            word_count=state.get("word_count", 0),
            estimated_runtime_seconds=state.get("estimated_runtime_seconds", 180),
        )

        await queries.update_session_status(
            db,
            state["session_id"],
            status="complete",
            agent_step="done",
        )
