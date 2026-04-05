import { z } from "zod";

// Session creation — triggered when user submits raw input
export const createSessionSchema = z
	.object({
		voiceProfileId: z.string().uuid().optional(),
		inputType: z.enum(["text", "audio", "video", "youtube", "tiktok", "mixed"]),
		inputText: z.string().min(10, "Input must be at least 10 characters").max(50000).optional(),
		inputUrl: z.string().url("Must be a valid URL").optional(),
		userIntent: z.string().max(200).optional(),
	})
	.refine(
		(d) => {
			if (d.inputType === "text") return !!d.inputText;
			if (d.inputType === "youtube" || d.inputType === "tiktok") return !!d.inputUrl;
			return true; // audio/video validated via file upload separately
		},
		{ message: "Text input required for text type; URL required for YouTube/TikTok" },
	);

// Feedback on a completed session — updates Voice Profile weights
export const sessionFeedbackSchema = z.object({
	feedbackType: z.enum(["accept", "edit", "reject"]),
	editedContent: z.string().optional(),
	rejectionReason: z
		.enum(["too_formal", "too_casual", "wrong_energy", "wrong_structure", "missed_point", "other"])
		.optional(),
});

// Create a new Voice Profile
export const createVoiceProfileSchema = z.object({
	profileName: z.string().min(1, "Profile name is required").max(50).default("Main Voice"),
});

// Update Voice Profile attributes (manual overrides)
export const updateVoiceProfileSchema = z.object({
	profileName: z.string().min(1).max(50).optional(),
	vocabularyLevel: z.enum(["simple", "conversational", "technical", "mixed"]).optional(),
	sentenceRhythm: z.enum(["punchy", "flowing", "mixed"]).optional(),
	energySignature: z.enum(["high", "calm", "builds", "deadpan"]).optional(),
	pacingWpm: z.number().int().min(60).max(250).optional(),
	openerPattern: z.string().max(200).optional(),
	closerPattern: z.string().max(200).optional(),
	transitionStyle: z.string().max(200).optional(),
	plainSummary: z.string().max(1000).optional(),
});

// Ingest content for Voice Profile calibration
export const ingestContentSchema = z.object({
	voiceProfileId: z.string().uuid(),
	contentType: z.enum(["own", "reference"]),
	sourceType: z.enum(["youtube", "tiktok", "upload", "text"]),
	sourceUrl: z.string().url("Must be a valid URL").optional(),
	sourceText: z.string().min(10).max(50000).optional(),
	borrowTags: z
		.array(z.enum(["energy", "structure", "humor", "directness", "pacing", "vocabulary"]))
		.optional()
		.default([]),
});

// Basic profile update (display name + avatar)
export const profileSchema = z.object({
	displayName: z.string().max(50, "Name must be at most 50 characters"),
	avatarUrl: z.string().url("Must be a valid URL").or(z.literal("")),
});
