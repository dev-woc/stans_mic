from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID


class VoiceProfileModel(BaseModel):
    id: str
    user_id: str
    profile_name: str = "Main Voice"
    vocabulary_level: str = "conversational"
    avg_sentence_length: Optional[float] = None
    sentence_rhythm: str = "mixed"
    energy_signature: str = "calm"
    opener_pattern: Optional[str] = None
    closer_pattern: Optional[str] = None
    transition_style: Optional[str] = None
    pacing_wpm: int = 130
    filler_patterns: list[str] = Field(default_factory=list)
    cultural_markers: list[str] = Field(default_factory=list)
    direct_address_rate: Optional[float] = None
    own_content_count: int = 0
    reference_content_ids: list[str] = Field(default_factory=list)
    reference_weights: dict[str, float] = Field(default_factory=dict)
    confidence_score: float = 0.0
    version: int = 1
    plain_summary: Optional[str] = None

    def to_prompt_context(self) -> dict:
        """Returns a structured dict suitable for Claude system prompt injection."""
        return {
            "vocabulary_level": self.vocabulary_level,
            "avg_sentence_length": self.avg_sentence_length,
            "sentence_rhythm": self.sentence_rhythm,
            "energy_signature": self.energy_signature,
            "opener_pattern": self.opener_pattern or "not established yet",
            "closer_pattern": self.closer_pattern or "not established yet",
            "transition_style": self.transition_style or "mixed",
            "pacing_wpm": self.pacing_wpm,
            "filler_patterns": self.filler_patterns[:10],  # cap for prompt size
            "cultural_markers": self.cultural_markers[:10],
            "direct_address_rate": self.direct_address_rate,
            "confidence_score": self.confidence_score,
            "plain_summary": self.plain_summary or "Voice profile not yet calibrated.",
        }

    @property
    def word_count_target(self) -> int:
        """Target word count for a 3-minute script at this creator's pacing."""
        return self.pacing_wpm * 3

    @property
    def word_count_floor(self) -> int:
        return max(270, int(self.word_count_target * 0.87))

    @property
    def word_count_ceiling(self) -> int:
        return min(510, int(self.word_count_target * 1.13))
