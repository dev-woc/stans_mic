import { describe, expect, it } from "vitest";
import {
	createSessionSchema,
	createVoiceProfileSchema,
	ingestContentSchema,
	profileSchema,
	sessionFeedbackSchema,
	updateVoiceProfileSchema,
} from "../validations";

describe("createSessionSchema", () => {
	it("accepts valid text input", () => {
		const result = createSessionSchema.safeParse({
			inputType: "text",
			inputText: "This is a test idea that is long enough",
		});
		expect(result.success).toBe(true);
	});

	it("rejects text input with less than 10 characters", () => {
		const result = createSessionSchema.safeParse({
			inputType: "text",
			inputText: "short",
		});
		expect(result.success).toBe(false);
	});

	it("rejects text input type with missing inputText", () => {
		const result = createSessionSchema.safeParse({ inputType: "text" });
		expect(result.success).toBe(false);
	});

	it("accepts valid YouTube URL input", () => {
		const result = createSessionSchema.safeParse({
			inputType: "youtube",
			inputUrl: "https://youtube.com/watch?v=abc123",
		});
		expect(result.success).toBe(true);
	});

	it("rejects youtube type with missing URL", () => {
		const result = createSessionSchema.safeParse({ inputType: "youtube" });
		expect(result.success).toBe(false);
	});

	it("rejects youtube type with invalid URL", () => {
		const result = createSessionSchema.safeParse({
			inputType: "youtube",
			inputUrl: "not-a-url",
		});
		expect(result.success).toBe(false);
	});

	it("accepts optional voiceProfileId as UUID", () => {
		const result = createSessionSchema.safeParse({
			inputType: "text",
			inputText: "This is a valid test input text",
			voiceProfileId: "550e8400-e29b-41d4-a716-446655440000",
		});
		expect(result.success).toBe(true);
	});

	it("rejects invalid voiceProfileId format", () => {
		const result = createSessionSchema.safeParse({
			inputType: "text",
			inputText: "This is a valid test input text",
			voiceProfileId: "not-a-uuid",
		});
		expect(result.success).toBe(false);
	});

	it("accepts audio input type without text or URL (file upload)", () => {
		const result = createSessionSchema.safeParse({ inputType: "audio" });
		expect(result.success).toBe(true);
	});
});

describe("sessionFeedbackSchema", () => {
	it("accepts accept feedback", () => {
		const result = sessionFeedbackSchema.safeParse({ feedbackType: "accept" });
		expect(result.success).toBe(true);
	});

	it("accepts edit feedback with edited content", () => {
		const result = sessionFeedbackSchema.safeParse({
			feedbackType: "edit",
			editedContent: "This is the edited version of the script",
		});
		expect(result.success).toBe(true);
	});

	it("accepts reject feedback with reason", () => {
		const result = sessionFeedbackSchema.safeParse({
			feedbackType: "reject",
			rejectionReason: "too_formal",
		});
		expect(result.success).toBe(true);
	});

	it("rejects invalid feedback type", () => {
		const result = sessionFeedbackSchema.safeParse({ feedbackType: "invalid" });
		expect(result.success).toBe(false);
	});

	it("rejects invalid rejection reason", () => {
		const result = sessionFeedbackSchema.safeParse({
			feedbackType: "reject",
			rejectionReason: "not_a_valid_reason",
		});
		expect(result.success).toBe(false);
	});
});

describe("createVoiceProfileSchema", () => {
	it("accepts valid profile name", () => {
		const result = createVoiceProfileSchema.safeParse({ profileName: "Main Voice" });
		expect(result.success).toBe(true);
	});

	it("uses default name when not provided", () => {
		const result = createVoiceProfileSchema.safeParse({});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.profileName).toBe("Main Voice");
		}
	});

	it("rejects name over 50 characters", () => {
		const result = createVoiceProfileSchema.safeParse({
			profileName: "A".repeat(51),
		});
		expect(result.success).toBe(false);
	});
});

describe("updateVoiceProfileSchema", () => {
	it("accepts partial updates", () => {
		const result = updateVoiceProfileSchema.safeParse({
			vocabularyLevel: "conversational",
			pacingWpm: 130,
		});
		expect(result.success).toBe(true);
	});

	it("rejects invalid vocabulary level", () => {
		const result = updateVoiceProfileSchema.safeParse({
			vocabularyLevel: "very_complex",
		});
		expect(result.success).toBe(false);
	});

	it("rejects pacing WPM below 60", () => {
		const result = updateVoiceProfileSchema.safeParse({ pacingWpm: 10 });
		expect(result.success).toBe(false);
	});

	it("rejects pacing WPM above 250", () => {
		const result = updateVoiceProfileSchema.safeParse({ pacingWpm: 300 });
		expect(result.success).toBe(false);
	});
});

describe("ingestContentSchema", () => {
	it("accepts valid YouTube own content", () => {
		const result = ingestContentSchema.safeParse({
			voiceProfileId: "550e8400-e29b-41d4-a716-446655440000",
			contentType: "own",
			sourceType: "youtube",
			sourceUrl: "https://youtube.com/watch?v=abc123",
		});
		expect(result.success).toBe(true);
	});

	it("accepts reference content with borrow tags", () => {
		const result = ingestContentSchema.safeParse({
			voiceProfileId: "550e8400-e29b-41d4-a716-446655440000",
			contentType: "reference",
			sourceType: "youtube",
			sourceUrl: "https://youtube.com/watch?v=xyz",
			borrowTags: ["energy", "humor"],
		});
		expect(result.success).toBe(true);
	});

	it("rejects invalid content type", () => {
		const result = ingestContentSchema.safeParse({
			voiceProfileId: "550e8400-e29b-41d4-a716-446655440000",
			contentType: "invalid",
			sourceType: "youtube",
		});
		expect(result.success).toBe(false);
	});
});

describe("profileSchema", () => {
	it("accepts valid display name and empty avatar", () => {
		const result = profileSchema.safeParse({ displayName: "Jordan", avatarUrl: "" });
		expect(result.success).toBe(true);
	});

	it("accepts valid avatar URL", () => {
		const result = profileSchema.safeParse({
			displayName: "Jordan",
			avatarUrl: "https://example.com/avatar.jpg",
		});
		expect(result.success).toBe(true);
	});

	it("rejects display name over 50 chars", () => {
		const result = profileSchema.safeParse({
			displayName: "A".repeat(51),
			avatarUrl: "",
		});
		expect(result.success).toBe(false);
	});

	it("rejects invalid avatar URL", () => {
		const result = profileSchema.safeParse({
			displayName: "Jordan",
			avatarUrl: "not-a-url",
		});
		expect(result.success).toBe(false);
	});
});
