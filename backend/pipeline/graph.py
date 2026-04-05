"""
LangGraph pipeline: 4-node sequential graph for the Distill pipeline.
State flows: ingest → compress → calibrate → save_output
"""
from typing import Any, Optional, TypedDict

from langgraph.graph import END, StateGraph


class PipelineState(TypedDict):
    # Input
    session_id: str
    user_id: str
    input_type: str
    input_text: Optional[str]
    input_url: Optional[str]
    user_intent: Optional[str]
    # Agent 01 output
    idea_dump: Optional[dict]
    transcription_quality: Optional[float]
    # Voice profile context
    voice_profile: Optional[dict]
    # Agent 03 output
    content_blueprint: Optional[dict]
    # Agent 04 output
    final_script: Optional[str]
    timing_markers: Optional[list]
    alt_openers: Optional[list]
    what_got_cut: Optional[list]
    voice_match_score: Optional[float]
    readability_score: Optional[float]
    word_count: Optional[int]
    estimated_runtime_seconds: Optional[int]
    # Error tracking
    error: Optional[str]


def build_pipeline() -> Any:
    """Build and compile the LangGraph pipeline."""
    from agents.agent_01_input_ingestion import run_ingestion_agent
    from agents.agent_03_compression import run_compression_agent
    from agents.agent_04_voice_calibration import run_calibration_agent
    from pipeline.save_output import save_output_node

    workflow = StateGraph(PipelineState)

    workflow.add_node("ingest", run_ingestion_agent)
    workflow.add_node("compress", run_compression_agent)
    workflow.add_node("calibrate", run_calibration_agent)
    workflow.add_node("save_output", save_output_node)

    workflow.set_entry_point("ingest")
    workflow.add_edge("ingest", "compress")
    workflow.add_edge("compress", "calibrate")
    workflow.add_edge("calibrate", "save_output")
    workflow.add_edge("save_output", END)

    return workflow.compile()


# Singleton compiled graph — imported by runner and tasks
graph = build_pipeline()
