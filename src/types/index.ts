import type { InferSelectModel } from "drizzle-orm";
import type {
	distillationOutputs,
	distillationSessions,
	ingestedContent,
	profiles,
	sessionFeedback,
	voiceProfiles,
} from "@/lib/db/schema";

// Drizzle-inferred row types
export type Profile = InferSelectModel<typeof profiles>;
export type VoiceProfile = InferSelectModel<typeof voiceProfiles>;
export type IngestedContent = InferSelectModel<typeof ingestedContent>;
export type DistillationSession = InferSelectModel<typeof distillationSessions>;
export type DistillationOutput = InferSelectModel<typeof distillationOutputs>;
export type SessionFeedback = InferSelectModel<typeof sessionFeedback>;

// Discriminated union literals
export type SessionStatus = "pending" | "processing" | "complete" | "failed";
export type AgentStep = "ingestion" | "compression" | "calibration" | "done";
export type InputType = "text" | "audio" | "video" | "youtube" | "tiktok" | "mixed";
export type FeedbackType = "accept" | "edit" | "reject";
export type ContentType = "own" | "reference";
export type ProcessingStatus = "pending" | "processing" | "complete" | "failed";

// Output sub-shapes
export interface TimingMarker {
	time: string;
	label: string;
	wordOffset: number;
}

export interface CutIdea {
	idea: string;
	reason: string;
}

// Client-side state shapes
export interface PipelineProgress {
	sessionId: string;
	status: SessionStatus;
	agentStep: AgentStep | null;
	stepLabel: string;
	percentComplete: number;
}

export interface OutputState {
	session: DistillationSession;
	output: DistillationOutput | null;
	feedback: SessionFeedback | null;
}

// API response shapes
export interface SessionWithOutput {
	session: DistillationSession;
	output: DistillationOutput | null;
}

export interface VoiceProfileWithContent {
	profile: VoiceProfile;
	ingestedContent: IngestedContent[];
}
