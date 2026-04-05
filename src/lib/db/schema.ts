import { relations } from "drizzle-orm";
import {
	index,
	integer,
	json,
	pgTable,
	real,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

// Profiles — user identity (stripped down from link-in-bio version)
export const profiles = pgTable(
	"profiles",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		userId: text("user_id").notNull().unique(),
		displayName: text("display_name").notNull().default(""),
		avatarUrl: text("avatar_url").notNull().default(""),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [index("idx_profiles_user_id").on(table.userId)],
);

// Voice Profiles — persistent 10-attribute voice model per creator
export const voiceProfiles = pgTable(
	"voice_profiles",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		userId: text("user_id").notNull(),
		profileName: text("profile_name").notNull().default("Main Voice"),
		// Voice attributes
		vocabularyLevel: text("vocabulary_level").notNull().default("conversational"), // simple|conversational|technical|mixed
		avgSentenceLength: real("avg_sentence_length"),
		sentenceRhythm: text("sentence_rhythm").notNull().default("mixed"), // punchy|flowing|mixed
		energySignature: text("energy_signature").notNull().default("calm"), // high|calm|builds|deadpan
		openerPattern: text("opener_pattern"),
		closerPattern: text("closer_pattern"),
		transitionStyle: text("transition_style"),
		pacingWpm: integer("pacing_wpm").notNull().default(130),
		fillerPatterns: json("filler_patterns").$type<string[]>().notNull().default([]),
		culturalMarkers: json("cultural_markers").$type<string[]>().notNull().default([]),
		directAddressRate: real("direct_address_rate"),
		// Content tracking
		ownContentCount: integer("own_content_count").notNull().default(0),
		referenceContentIds: json("reference_content_ids").$type<string[]>().notNull().default([]),
		referenceWeights: json("reference_weights")
			.$type<Record<string, number>>()
			.notNull()
			.default({}),
		// Confidence + metadata
		confidenceScore: real("confidence_score").notNull().default(0),
		version: integer("version").notNull().default(1),
		plainSummary: text("plain_summary"),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [index("idx_voice_profiles_user_id").on(table.userId)],
);

// Ingested Content — own videos + reference creator content for voice calibration
export const ingestedContent = pgTable(
	"ingested_content",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		userId: text("user_id").notNull(),
		voiceProfileId: uuid("voice_profile_id").references(() => voiceProfiles.id, {
			onDelete: "cascade",
		}),
		contentType: text("content_type").notNull(), // 'own' | 'reference'
		sourceType: text("source_type").notNull(), // 'youtube' | 'tiktok' | 'upload' | 'text'
		sourceUrl: text("source_url"),
		filePath: text("file_path"),
		transcription: text("transcription"),
		durationSeconds: integer("duration_seconds"),
		borrowTags: json("borrow_tags").$type<string[]>().notNull().default([]), // ['energy','structure','humor']
		processingStatus: text("processing_status").notNull().default("pending"), // pending|processing|complete|failed
		errorMessage: text("error_message"),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("idx_ingested_content_user_id").on(table.userId),
		index("idx_ingested_content_voice_profile_id").on(table.voiceProfileId),
	],
);

// Distillation Sessions — each run of the 4-agent pipeline
export const distillationSessions = pgTable(
	"distillation_sessions",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		userId: text("user_id").notNull(),
		voiceProfileId: uuid("voice_profile_id").references(() => voiceProfiles.id),
		status: text("status").notNull().default("pending"), // pending|processing|complete|failed
		agentStep: text("agent_step"), // ingestion|compression|calibration|done
		inputType: text("input_type").notNull(), // text|audio|video|youtube|tiktok|mixed
		inputText: text("input_text"),
		inputFilePath: text("input_file_path"),
		inputUrl: text("input_url"),
		userIntent: text("user_intent"),
		errorMessage: text("error_message"),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("idx_distillation_sessions_user_id").on(table.userId),
		index("idx_distillation_sessions_status").on(table.status),
	],
);

// Distillation Outputs — final pipeline output per session
export const distillationOutputs = pgTable(
	"distillation_outputs",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		sessionId: uuid("session_id")
			.notNull()
			.references(() => distillationSessions.id, { onDelete: "cascade" }),
		finalScript: text("final_script").notNull(),
		timingMarkers: json("timing_markers")
			.$type<Array<{ time: string; label: string; wordOffset: number }>>()
			.notNull()
			.default([]),
		whatGotCut: json("what_got_cut")
			.$type<Array<{ idea: string; reason: string }>>()
			.notNull()
			.default([]),
		altOpeners: json("alt_openers").$type<string[]>().notNull().default([]),
		voiceMatchScore: real("voice_match_score"),
		readabilityScore: real("readability_score"),
		wordCount: integer("word_count"),
		estimatedRuntimeSeconds: integer("estimated_runtime_seconds"),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [uniqueIndex("idx_distillation_outputs_session_id").on(table.sessionId)],
);

// Session Feedback — accept/edit/reject signals that update Voice Profile weights
export const sessionFeedback = pgTable(
	"session_feedback",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		sessionId: uuid("session_id")
			.notNull()
			.references(() => distillationSessions.id, { onDelete: "cascade" }),
		feedbackType: text("feedback_type").notNull(), // 'accept' | 'edit' | 'reject'
		editedContent: text("edited_content"),
		rejectionReason: text("rejection_reason"), // 'too_formal'|'wrong_energy'|'missed_point'|'other'
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [index("idx_session_feedback_session_id").on(table.sessionId)],
);

// Relations
export const profilesRelations = relations(profiles, ({ many }) => ({
	voiceProfiles: many(voiceProfiles),
}));

export const voiceProfilesRelations = relations(voiceProfiles, ({ many }) => ({
	ingestedContent: many(ingestedContent),
	distillationSessions: many(distillationSessions),
}));

export const ingestedContentRelations = relations(ingestedContent, ({ one }) => ({
	voiceProfile: one(voiceProfiles, {
		fields: [ingestedContent.voiceProfileId],
		references: [voiceProfiles.id],
	}),
}));

export const distillationSessionsRelations = relations(distillationSessions, ({ one }) => ({
	voiceProfile: one(voiceProfiles, {
		fields: [distillationSessions.voiceProfileId],
		references: [voiceProfiles.id],
	}),
	output: one(distillationOutputs, {
		fields: [distillationSessions.id],
		references: [distillationOutputs.sessionId],
	}),
	feedback: one(sessionFeedback, {
		fields: [distillationSessions.id],
		references: [sessionFeedback.sessionId],
	}),
}));

export const distillationOutputsRelations = relations(distillationOutputs, ({ one }) => ({
	session: one(distillationSessions, {
		fields: [distillationOutputs.sessionId],
		references: [distillationSessions.id],
	}),
}));

export const sessionFeedbackRelations = relations(sessionFeedback, ({ one }) => ({
	session: one(distillationSessions, {
		fields: [sessionFeedback.sessionId],
		references: [distillationSessions.id],
	}),
}));
