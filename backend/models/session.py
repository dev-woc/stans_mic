from pydantic import BaseModel
from typing import Optional


class PipelineRunRequest(BaseModel):
    sessionId: str
    userId: str
    inputType: str  # text|audio|video|youtube|tiktok|mixed
    inputText: Optional[str] = None
    inputUrl: Optional[str] = None
    voiceProfileId: Optional[str] = None
    userIntent: Optional[str] = None


class TimingMarker(BaseModel):
    time: str   # e.g. "[0:00]"
    label: str  # e.g. "HOOK"
    word_offset: int


class CutIdea(BaseModel):
    idea: str
    reason: str


class PipelineOutput(BaseModel):
    session_id: str
    final_script: str
    timing_markers: list[TimingMarker]
    what_got_cut: list[CutIdea]
    alt_openers: list[str]
    voice_match_score: float
    readability_score: float
    word_count: int
    estimated_runtime_seconds: int


class IngestRequest(BaseModel):
    contentId: str
    userId: str
    voiceProfileId: str
    contentType: str   # 'own' | 'reference'
    sourceType: str    # 'youtube' | 'tiktok' | 'upload' | 'text'
    sourceUrl: Optional[str] = None
    borrowTags: list[str] = []


class UpdateWeightsRequest(BaseModel):
    sessionId: str
    feedbackType: str   # 'accept' | 'edit' | 'reject'
    editedContent: Optional[str] = None
    rejectionReason: Optional[str] = None
