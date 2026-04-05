# Feature: Distill MVP — Full Build

The following plan should be complete, but validate documentation and codebase patterns before implementing each phase. Read the referenced files before touching them.

Pay special attention to naming of existing utils, types, and schema exports. The codebase uses Drizzle ORM with `drizzle-orm/neon-http`, not the Node.js WebSocket driver. Auth is `@neondatabase/auth` — all session checks flow through `auth.getSession()` from `@/lib/auth/server`.

---

## Feature Description

Distill is an AI agentic tool that converts raw creator input (voice memos, videos, typed notes, YouTube/TikTok URLs) into a tight 3-minute, creator-voiced script in under 90 seconds. It runs four agents in sequence, building on a persistent **Voice Profile** that learns how the creator communicates and improves with every session. The longer a creator uses Distill, the more the output sounds like them — that compounding accuracy is the core retention moat.

## User Story

As a creator with a raw voice memo I recorded in the car,
I want to drop it into Distill and get back a structured 3-minute script in my own voice in under 90 seconds,
So that I can film it that evening without hours of prep.

## Problem Statement

Creators have more to say than they can deliver. The gap between unfiltered thought and a tight, filmable script costs hours of cognitive work. AI writing tools help with structure but output generic text that sounds nothing like the creator — so they spend more time editing the AI than writing from scratch.

## Solution Statement

Four agents work in sequence: (1) Input Ingestion converts any raw format to structured idea material, (2) Voice Ingestion builds/updates the creator's persistent Voice Profile, (3) Compression & Structure extracts 3-4 ideas into a timed 3-minute blueprint, (4) Voice Calibration rewrites the blueprint in the creator's specific voice. The Voice Profile persists across sessions and improves with every accept/edit/reject signal.

## Feature Metadata

**Feature Type**: New Capability  
**Estimated Complexity**: High  
**Primary Systems Affected**: Database schema, Next.js frontend (all routes + API), Python FastAPI backend (new service)  
**Dependencies**: Claude API (claude-sonnet-4-6), OpenAI Whisper API, AssemblyAI (fallback), yt-dlp CLI, FFmpeg, Celery + Redis, LangGraph

---

## CONTEXT REFERENCES

### Relevant Codebase Files — READ BEFORE IMPLEMENTING

- `src/lib/db/schema.ts` (full file) — Current Drizzle schema pattern. Note: uses `pgTable`, `uuid`, `text`, `integer`, `timestamp`, `index`, `uniqueIndex` from `drizzle-orm/pg-core`. Relations defined separately with `relations()`. This file will be **replaced** with Distill schema.
- `src/lib/db/index.ts` (full file) — DB connection pattern: `neon()` → `drizzle(sql, { schema })`. Keep as-is.
- `src/types/index.ts` (full file) — Type export pattern: `InferSelectModel` from Drizzle, plus hand-written interfaces. This file will be **replaced** with Distill types.
- `src/lib/validations.ts` (full file) — Zod schema pattern. Uses `.safeParse()`. This file will be **replaced** with Distill validations.
- `src/app/api/profile/route.ts` (full file) — API route pattern: rate limit → auth check → db query → `NextResponse.json()`. Mirror this pattern in all new API routes.
- `src/hooks/use-profile.ts` (full file) — Client data hook pattern: `useCallback`, `useEffect`, `useState`, redirects on 401. Mirror for new hooks.
- `src/app/(dashboard)/editor/page.tsx` (full file) — Dashboard page pattern with tabs, layout modes, save flow. This page will be **replaced** with the Distill workspace.
- `src/app/(dashboard)/layout.tsx` (full file) — Dashboard nav pattern. Update branding; add nav items for Distill sections.
- `src/middleware.ts` (full file) — Auth middleware: checks `neon-auth.session_token` cookie, redirects on missing. Update matcher to cover new routes.
- `src/lib/rate-limit.ts` — Rate limiter implementation. Use same `apiRateLimiter.check(ip)` in all new API routes.
- `drizzle.config.ts` — Points to `./src/lib/db/schema.ts`. Do not change.

### New Files to Create

**Database & Types:**
- `src/lib/db/schema.ts` — Replace with Distill schema (voice_profiles, distillation_sessions, distillation_outputs, ingested_content, session_feedback)
- `src/types/index.ts` — Replace with Distill types inferred from new schema

**Validations:**
- `src/lib/validations.ts` — Replace with Distill Zod schemas

**Next.js API Routes:**
- `src/app/api/voice-profiles/route.ts` — GET (list user's profiles), POST (create)
- `src/app/api/voice-profiles/[id]/route.ts` — GET, PUT, DELETE
- `src/app/api/sessions/route.ts` — GET (list), POST (create session + trigger pipeline)
- `src/app/api/sessions/[id]/route.ts` — GET (status + output polling)
- `src/app/api/sessions/[id]/feedback/route.ts` — POST (accept/edit/reject signal)
- `src/app/api/ingest/route.ts` — POST (upload own content or reference for Voice Profile building)
- `src/app/api/ingest/status/[jobId]/route.ts` — GET (polling for ingestion job status)

**Next.js Pages:**
- `src/app/(dashboard)/distill/page.tsx` — Main input page (replaces /editor)
- `src/app/(dashboard)/output/[sessionId]/page.tsx` — Output review page
- `src/app/(dashboard)/voice-profile/page.tsx` — Voice Profile setup wizard + view/edit
- `src/app/(dashboard)/history/page.tsx` — Past distillation sessions

**Client Hooks:**
- `src/hooks/use-voice-profile.ts` — Fetch/manage voice profiles
- `src/hooks/use-session.ts` — Create/poll distillation sessions
- `src/hooks/use-pipeline-status.ts` — SSE or polling hook for real-time agent progress

**Components:**
- `src/components/distill/input-panel.tsx` — Input area: text textarea, audio/video upload, URL input, tab switcher
- `src/components/distill/pipeline-progress.tsx` — Live agent step progress display (4 steps)
- `src/components/distill/output-viewer.tsx` — Script with inline timing markers, voice match score
- `src/components/distill/what-got-cut.tsx` — Collapsible panel: deprioritized ideas with reinstate buttons
- `src/components/distill/alt-openers.tsx` — 2 alternate hook variants with swap/request-third buttons
- `src/components/distill/feedback-bar.tsx` — Full Accept / Edit / Reject CTA bar
- `src/components/distill/export-menu.tsx` — Copy to clipboard, PDF download
- `src/components/voice-profile/setup-wizard.tsx` — Multi-step onboarding: upload own content → reference creators → calibrate
- `src/components/voice-profile/profile-summary.tsx` — Plain-language display of 10 voice attributes with edit controls
- `src/components/voice-profile/content-uploader.tsx` — Handles YouTube URL, TikTok URL, file upload, type tagging (own vs reference)

**Python FastAPI Backend (new `backend/` directory):**
- `backend/main.py` — FastAPI app, CORS, routes
- `backend/requirements.txt` — All Python dependencies
- `backend/agents/agent_01_input_ingestion.py` — Converts raw input to structured Idea Dump
- `backend/agents/agent_02_voice_ingestion.py` — Builds/updates Voice Profile from ingested content
- `backend/agents/agent_03_compression.py` — 3-minute structure extraction
- `backend/agents/agent_04_voice_calibration.py` — Voice-aware rewrite
- `backend/pipeline/graph.py` — LangGraph graph definition: node wiring, conditional edges
- `backend/pipeline/runner.py` — Pipeline entrypoint, injects Voice Profile context
- `backend/tasks/pipeline_tasks.py` — Celery tasks wrapping pipeline execution
- `backend/tasks/ingestion_tasks.py` — Celery tasks for voice profile content ingestion
- `backend/services/transcription.py` — Whisper primary + AssemblyAI fallback
- `backend/services/media_extraction.py` — yt-dlp wrapper for YouTube/TikTok URLs
- `backend/services/voice_profiler.py` — Extracts 10 voice attributes via Claude API
- `backend/models/voice_profile.py` — Pydantic models for Voice Profile
- `backend/models/session.py` — Pydantic models for session/output
- `backend/db/connection.py` — SQLAlchemy async connection to same Neon Postgres
- `backend/db/queries.py` — DB reads/writes for sessions, outputs, profiles
- `backend/.env.example` — Required env vars
- `docker-compose.yml` (repo root) — Redis + backend service

### Relevant Documentation

- [LangGraph Docs — Conceptual Guide](https://langchain-ai.github.io/langgraph/concepts/)
  - Node/edge/state definition, conditional edges for retry logic
  - Why: The 4-agent pipeline uses LangGraph for orchestration
- [LangGraph — How to add node retry policies](https://langchain-ai.github.io/langgraph/how-tos/node-retries/)
  - Why: Each agent step retries up to 2x on failure (PRD requirement)
- [Anthropic Claude API — Messages](https://docs.anthropic.com/en/api/messages)
  - Why: All 4 agents call `claude-sonnet-4-6` via Anthropic SDK
- [OpenAI Whisper API](https://platform.openai.com/docs/guides/speech-to-text)
  - Why: Agent 01 transcribes audio/video via Whisper
- [AssemblyAI Transcription](https://www.assemblyai.com/docs/getting-started/transcribe-an-audio-file)
  - Why: Fallback transcription for noisy audio
- [yt-dlp GitHub](https://github.com/yt-dlp/yt-dlp)
  - Why: URL media extraction for YouTube, TikTok, Vimeo
- [FastAPI Background Tasks / Celery integration](https://fastapi.tiangolo.com/tutorial/background-tasks/)
  - Why: Pipeline runs async; Celery handles job queue
- [Drizzle ORM — PostgreSQL](https://orm.drizzle.team/docs/get-started/neon-new)
  - Why: All schema changes follow existing Drizzle patterns
- [Neon Auth Next.js](https://neon.tech/docs/guides/neon-auth-nextjs)
  - Why: Auth pattern must stay consistent with `@neondatabase/auth`

### Patterns to Follow

**API Route Pattern** (from `src/app/api/profile/route.ts`):
```typescript
export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "anonymous";
  const { success } = apiRateLimiter.check(ip);
  if (!success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const user = await getUser(); // calls auth.getSession() from @/lib/auth/server
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const result = mySchema.safeParse(body);
  if (!result.success) return NextResponse.json({ error: result.error.issues[0]?.message }, { status: 400 });

  const [row] = await db.insert(myTable).values({ ... }).returning();
  return NextResponse.json({ data: row }, { status: 201 });
}
```

**Drizzle Schema Pattern** (from `src/lib/db/schema.ts`):
```typescript
export const myTable = pgTable("my_table", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  // ...
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("idx_my_table_user_id").on(table.userId),
]);
```

**Client Hook Pattern** (from `src/hooks/use-profile.ts`):
```typescript
export function useMyHook() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/...");
      if (res.status === 401) { router.push("/login"); return; }
      // ...
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);
  return { data, isLoading, error, refetch: fetch };
}
```

**Zod Validation Pattern** (from `src/lib/validations.ts`):
```typescript
export const mySchema = z.object({
  field: z.string().max(100, "Field must be at most 100 characters"),
});
```

**Naming Conventions:**
- Files: `kebab-case.ts` / `kebab-case.tsx`
- Components: `PascalCase`
- Hooks: `use-kebab-case.ts`, exported as `useMyHook`
- DB tables: `snake_case` (postgres), camelCase (Drizzle field names)
- API routes: `/api/resource` (plural) → `route.ts`, `/api/resource/[id]` → `route.ts`

---

## IMPLEMENTATION PLAN

### Phase 1: Database Schema + Types Overhaul

Replace the link-in-bio schema entirely with the Distill schema. This is the foundation — everything builds on these tables.

**New tables:**
- `profiles` — keep user identity (id, userId, displayName, avatarUrl) — strip out slug/theme/links
- `voice_profiles` — persistent voice model (all 10 attributes + metadata)
- `ingested_content` — own content + reference content uploaded for voice analysis
- `distillation_sessions` — each run of the 4-agent pipeline
- `distillation_outputs` — final script + timing markers + what got cut + alt openers
- `session_feedback` — accept/edit/reject signals per output

**Remove tables:** `link_items`, `click_events`

### Phase 2: Python FastAPI Backend

Set up the separate Python service in `backend/`. This is the AI execution layer. The Next.js frontend calls it via internal API (or direct fetch in dev).

**Key decisions:**
- FastAPI handles HTTP endpoints; Celery + Redis handles async pipeline jobs
- LangGraph wires the 4 agents with retry logic (2x per node on failure)
- Voice Profile is injected as a structured context object into Agent 03 and Agent 04 (not a free-text prompt)
- Progressive status updates written to `distillation_sessions.agent_step` column, polled by frontend

### Phase 3: Voice Profile Setup Wizard

Before a user can distill, they need a Voice Profile with sufficient confidence. The wizard:
1. Prompts to upload min 3 own videos (or 15min audio) — links or file uploads
2. Optionally add reference creators (URL + tagging what to borrow)
3. Triggers Agent 02 (Voice Ingestion) in background
4. On completion, shows plain-language profile summary for review/edit

Low-confidence profiles (< 3 videos / < 15min audio) are flagged visually but the user can still proceed.

### Phase 4: Distillation Input UI + Pipeline Execution

The main workspace. Five input modes in a tabbed UI:
- **Text** — simple textarea
- **Audio** — drag-drop upload (mp3, m4a, wav, aac ≤500MB)
- **Video** — drag-drop upload (mp4, mov, webm ≤2GB)
- **YouTube URL** — paste field
- **TikTok URL** — paste field

On submit: POST to `/api/sessions` → backend triggers pipeline → frontend polls status → progressive step indicators shown.

### Phase 5: Output Review UI + Feedback Loop

The output page shows:
- Final 3-min script with `[0:00]` timing markers inline
- Voice match confidence score + which attributes drove/hurt it
- What Got Cut panel (collapsible, each item has a Reinstate button)
- 2 alternate opener variants with Swap button
- Loosen/Tighten slider (post-generation)
- Feedback bar: Full Accept | Edit | Reject
- Export: Copy | PDF

Feedback signals → POST `/api/sessions/[id]/feedback` → backend updates Voice Profile weights.

### Phase 6: Branding Cleanup + Polish

Update all remaining old-project references, fix nav, update `package.json` name.

---

## STEP-BY-STEP TASKS

### TASK 1: UPDATE `package.json` name field

- **UPDATE** `package.json` line 2: `"name": "distill"` (was `"link-in-bio-page-builder"`)
- **VALIDATE**: `cat package.json | grep '"name"'` → should read `"distill"`

---

### TASK 2: UPDATE dashboard nav branding

- **UPDATE** `src/app/(dashboard)/layout.tsx`
- **IMPLEMENT**: Replace `LinkBio` text with `Distill`, replace `Edit` nav link pointing to `/editor` with one pointing to `/distill`, replace `Analytics` with `History` (pointing to `/history`), add `Voice` link pointing to `/voice-profile`
- **PATTERN**: `src/app/(dashboard)/layout.tsx` existing nav structure
- **VALIDATE**: Visual check — `npm run dev`, open `/editor`, confirm nav shows Distill branding

---

### TASK 3: REPLACE database schema with Distill schema

- **UPDATE** `src/lib/db/schema.ts` — complete replacement
- **IMPLEMENT**: Define 6 tables:

```typescript
// profiles — stripped down (keep userId, displayName, avatarUrl; remove slug/theme)
export const profiles = pgTable("profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().unique(),
  displayName: text("display_name").notNull().default(""),
  avatarUrl: text("avatar_url").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("idx_profiles_user_id").on(table.userId)]);

// voice_profiles — 10 voice attributes + metadata
export const voiceProfiles = pgTable("voice_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  profileName: text("profile_name").notNull().default("Main Voice"),
  vocabularyLevel: text("vocabulary_level").notNull().default("conversational"),
  avgSentenceLength: real("avg_sentence_length"),
  sentenceRhythm: text("sentence_rhythm").notNull().default("mixed"),
  energySignature: text("energy_signature").notNull().default("calm"),
  openerPattern: text("opener_pattern"),
  closerPattern: text("closer_pattern"),
  pacingWpm: integer("pacing_wpm").notNull().default(130),
  fillerPatterns: json("filler_patterns").$type<string[]>().notNull().default([]),
  culturalMarkers: json("cultural_markers").$type<string[]>().notNull().default([]),
  directAddressRate: real("direct_address_rate"),
  transitionStyle: text("transition_style"),
  ownContentCount: integer("own_content_count").notNull().default(0),
  referenceContentIds: json("reference_content_ids").$type<string[]>().notNull().default([]),
  referenceWeights: json("reference_weights").$type<Record<string, number>>().notNull().default({}),
  confidenceScore: real("confidence_score").notNull().default(0),
  version: integer("version").notNull().default(1),
  plainSummary: text("plain_summary"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("idx_voice_profiles_user_id").on(table.userId)]);

// ingested_content — own videos + reference content
export const ingestedContent = pgTable("ingested_content", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  voiceProfileId: uuid("voice_profile_id").references(() => voiceProfiles.id, { onDelete: "cascade" }),
  contentType: text("content_type").notNull(), // 'own' | 'reference'
  sourceType: text("source_type").notNull(),   // 'youtube' | 'tiktok' | 'upload' | 'text'
  sourceUrl: text("source_url"),
  filePath: text("file_path"),                  // S3/local path for uploaded files
  transcription: text("transcription"),
  durationSeconds: integer("duration_seconds"),
  borrowTags: json("borrow_tags").$type<string[]>().notNull().default([]), // ['energy','structure','humor']
  processingStatus: text("processing_status").notNull().default("pending"), // pending|processing|complete|failed
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("idx_ingested_content_user_id").on(table.userId),
  index("idx_ingested_content_voice_profile_id").on(table.voiceProfileId),
]);

// distillation_sessions — each pipeline run
export const distillationSessions = pgTable("distillation_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  voiceProfileId: uuid("voice_profile_id").references(() => voiceProfiles.id),
  status: text("status").notNull().default("pending"), // pending|processing|complete|failed
  agentStep: text("agent_step"),                        // ingestion|compression|calibration|done
  inputType: text("input_type").notNull(),              // text|audio|video|youtube|tiktok|mixed
  inputText: text("input_text"),                        // for text inputs, stored directly
  inputFilePath: text("input_file_path"),               // for uploads
  inputUrl: text("input_url"),                          // for URL inputs
  userIntent: text("user_intent"),                      // optional 'this is for YouTube intro'
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("idx_distillation_sessions_user_id").on(table.userId),
  index("idx_distillation_sessions_status").on(table.status),
]);

// distillation_outputs — pipeline output
export const distillationOutputs = pgTable("distillation_outputs", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: uuid("session_id").notNull().references(() => distillationSessions.id, { onDelete: "cascade" }),
  finalScript: text("final_script").notNull(),
  timingMarkers: json("timing_markers").$type<Array<{ time: string; label: string; wordOffset: number }>>().notNull().default([]),
  whatGotCut: json("what_got_cut").$type<Array<{ idea: string; reason: string }>>().notNull().default([]),
  altOpeners: json("alt_openers").$type<string[]>().notNull().default([]),
  voiceMatchScore: real("voice_match_score"),
  readabilityScore: real("readability_score"),
  wordCount: integer("word_count"),
  estimatedRuntimeSeconds: integer("estimated_runtime_seconds"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("idx_distillation_outputs_session_id").on(table.sessionId),
]);

// session_feedback — accept/edit/reject signals
export const sessionFeedback = pgTable("session_feedback", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: uuid("session_id").notNull().references(() => distillationSessions.id, { onDelete: "cascade" }),
  feedbackType: text("feedback_type").notNull(), // 'accept' | 'edit' | 'reject'
  editedContent: text("edited_content"),          // diff: what user changed
  rejectionReason: text("rejection_reason"),      // 'too_formal'|'wrong_energy'|'missed_point'|'other'
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("idx_session_feedback_session_id").on(table.sessionId)]);
```

- **IMPORTS**: `import { real, json, ... } from "drizzle-orm/pg-core"` — note `real` and `json` need to be added to the existing pg-core import
- **GOTCHA**: `json` columns require `.$type<T>()` for TypeScript inference; `real` is for float columns (Drizzle does not have a `float` export from pg-core)
- **GOTCHA**: Remove all `linkItems`, `clickEvents` exports. Remove their `relations` exports. Update relations to reflect new tables.
- **VALIDATE**: `npm run db:push` — should apply schema changes to Neon without errors

---

### TASK 4: REPLACE types with Distill types

- **UPDATE** `src/types/index.ts` — complete replacement
- **IMPLEMENT**: Infer all types from new schema tables. Add client-side state interfaces for pipeline progress, output state, voice profile editing.

```typescript
import type { InferSelectModel } from "drizzle-orm";
import type { profiles, voiceProfiles, ingestedContent, distillationSessions, distillationOutputs, sessionFeedback } from "@/lib/db/schema";

export type Profile = InferSelectModel<typeof profiles>;
export type VoiceProfile = InferSelectModel<typeof voiceProfiles>;
export type IngestedContent = InferSelectModel<typeof ingestedContent>;
export type DistillationSession = InferSelectModel<typeof distillationSessions>;
export type DistillationOutput = InferSelectModel<typeof distillationOutputs>;
export type SessionFeedback = InferSelectModel<typeof sessionFeedback>;

export type SessionStatus = "pending" | "processing" | "complete" | "failed";
export type AgentStep = "ingestion" | "compression" | "calibration" | "done";
export type InputType = "text" | "audio" | "video" | "youtube" | "tiktok" | "mixed";
export type FeedbackType = "accept" | "edit" | "reject";
export type ContentType = "own" | "reference";

export interface TimingMarker { time: string; label: string; wordOffset: number; }
export interface CutIdea { idea: string; reason: string; }

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
```

- **VALIDATE**: `npm run lint` — no type errors

---

### TASK 5: REPLACE validations with Distill schemas

- **UPDATE** `src/lib/validations.ts` — complete replacement
- **IMPLEMENT**:

```typescript
import { z } from "zod";

export const createSessionSchema = z.object({
  voiceProfileId: z.string().uuid().optional(),
  inputType: z.enum(["text", "audio", "video", "youtube", "tiktok", "mixed"]),
  inputText: z.string().min(10, "Input must be at least 10 characters").max(50000).optional(),
  inputUrl: z.string().url("Must be a valid URL").optional(),
  userIntent: z.string().max(200).optional(),
}).refine((d) => {
  if (d.inputType === "text") return !!d.inputText;
  if (d.inputType === "youtube" || d.inputType === "tiktok") return !!d.inputUrl;
  return true; // audio/video require file upload handled separately
}, { message: "Text input required for text type; URL required for YouTube/TikTok" });

export const sessionFeedbackSchema = z.object({
  feedbackType: z.enum(["accept", "edit", "reject"]),
  editedContent: z.string().optional(),
  rejectionReason: z.enum(["too_formal", "too_casual", "wrong_energy", "wrong_structure", "missed_point", "other"]).optional(),
});

export const createVoiceProfileSchema = z.object({
  profileName: z.string().min(1).max(50).default("Main Voice"),
});

export const updateVoiceProfileSchema = z.object({
  profileName: z.string().min(1).max(50).optional(),
  vocabularyLevel: z.enum(["simple", "conversational", "technical", "mixed"]).optional(),
  sentenceRhythm: z.enum(["punchy", "flowing", "mixed"]).optional(),
  energySignature: z.enum(["high", "calm", "builds", "deadpan"]).optional(),
  pacingWpm: z.number().int().min(60).max(250).optional(),
  openerPattern: z.string().max(200).optional(),
  closerPattern: z.string().max(200).optional(),
  plainSummary: z.string().max(1000).optional(),
});

export const ingestContentSchema = z.object({
  voiceProfileId: z.string().uuid(),
  contentType: z.enum(["own", "reference"]),
  sourceType: z.enum(["youtube", "tiktok", "upload", "text"]),
  sourceUrl: z.string().url().optional(),
  borrowTags: z.array(z.enum(["energy", "structure", "humor", "directness", "pacing", "vocabulary"])).optional().default([]),
});

export const profileSchema = z.object({
  displayName: z.string().max(50, "Name must be at most 50 characters"),
  avatarUrl: z.string().url("Must be a valid URL").or(z.literal("")),
});
```

- **VALIDATE**: `npm run lint` — no errors

---

### TASK 6: CREATE Next.js API route — Voice Profiles

- **CREATE** `src/app/api/voice-profiles/route.ts`
- **IMPLEMENT**: 
  - `GET` — returns all voice profiles for the authenticated user
  - `POST` — creates a new voice profile (using `createVoiceProfileSchema`)
- **PATTERN**: Mirror `src/app/api/profile/route.ts` auth + rate limit + Drizzle pattern exactly
- **IMPORTS**: `auth` from `@/lib/auth/server`, `db` from `@/lib/db`, `voiceProfiles` from `@/lib/db/schema`, `apiRateLimiter` from `@/lib/rate-limit`, `createVoiceProfileSchema` from `@/lib/validations`
- **VALIDATE**: `curl -X POST http://localhost:3000/api/voice-profiles -H "Content-Type: application/json" -d '{"profileName":"Main Voice"}' ` → expect 401 (not logged in)

---

### TASK 7: CREATE Next.js API route — Voice Profile by ID

- **CREATE** `src/app/api/voice-profiles/[id]/route.ts`
- **IMPLEMENT**: 
  - `GET` — returns single voice profile (must belong to user)
  - `PUT` — updates voice profile attributes (using `updateVoiceProfileSchema`)
  - `DELETE` — deletes voice profile
- **GOTCHA**: Always verify `voiceProfile.userId === user.id` before returning or mutating — never trust the URL param alone
- **VALIDATE**: `npm run lint` — no errors

---

### TASK 8: CREATE Next.js API route — Distillation Sessions

- **CREATE** `src/app/api/sessions/route.ts`
- **IMPLEMENT**:
  - `GET` — returns paginated session list for user (most recent first, limit 20)
  - `POST` — creates a new session record in DB, triggers pipeline via HTTP call to FastAPI backend, returns `{ sessionId, status: "pending" }`
- **IMPLEMENT POST flow**:
  1. Validate body with `createSessionSchema`
  2. Create `distillation_sessions` row with `status: "pending"`
  3. Fire-and-forget POST to `process.env.BACKEND_URL/api/v1/pipeline/run` with `{ sessionId, userId, inputType, inputText, inputUrl, voiceProfileId }`
  4. Return `{ session }` immediately — do NOT await the pipeline
- **GOTCHA**: Backend URL must come from env var `BACKEND_URL` (default `http://localhost:8000` in dev). Handle backend unreachable gracefully — update session status to "failed" and return 503.
- **VALIDATE**: Session row created in DB after POST

---

### TASK 9: CREATE Next.js API route — Session by ID (polling)

- **CREATE** `src/app/api/sessions/[id]/route.ts`
- **IMPLEMENT**:
  - `GET` — returns session + output (if complete). This is the polling endpoint. Frontend calls it every 2 seconds while `status !== "complete" && status !== "failed"`.
  - Response shape: `{ session: DistillationSession, output: DistillationOutput | null }`
- **GOTCHA**: Verify session belongs to user before returning
- **VALIDATE**: `npm run lint`

---

### TASK 10: CREATE Next.js API route — Session Feedback

- **CREATE** `src/app/api/sessions/[id]/feedback/route.ts`
- **IMPLEMENT**:
  - `POST` — saves feedback, triggers background Voice Profile weight update via backend
  - Validates with `sessionFeedbackSchema`
  - Inserts into `session_feedback`
  - Fires POST to `BACKEND_URL/api/v1/voice-profiles/[voiceProfileId]/update-weights` with feedback payload
- **VALIDATE**: `npm run lint`

---

### TASK 11: CREATE Next.js API route — Content Ingestion

- **CREATE** `src/app/api/ingest/route.ts`
- **IMPLEMENT**:
  - `POST` — accepts JSON payload with `ingestContentSchema` (for URL sources)
  - Creates `ingested_content` row with `processingStatus: "pending"`
  - POSTs to `BACKEND_URL/api/v1/ingest` to queue transcription + voice analysis
  - Returns `{ contentId, status: "pending" }`
- **NOTE**: File uploads (audio/video) use a separate upload mechanism. For MVP, accept `sourceUrl` only (YouTube/TikTok/text). File upload can be added in Phase 2.
- **VALIDATE**: Row created in `ingested_content`

---

### TASK 12: CREATE Next.js API route — Ingest status polling

- **CREATE** `src/app/api/ingest/status/[jobId]/route.ts`
- **IMPLEMENT**:
  - `GET` — proxies status check to backend OR reads `processingStatus` from `ingested_content` table (simpler: just read from DB, backend updates the row directly)
  - Returns `{ status, contentId }`
- **VALIDATE**: `npm run lint`

---

### TASK 13: CREATE Python backend scaffold

- **CREATE** `backend/` directory with:

```
backend/
├── main.py
├── requirements.txt
├── .env.example
├── agents/
│   ├── __init__.py
│   ├── agent_01_input_ingestion.py
│   ├── agent_02_voice_ingestion.py
│   ├── agent_03_compression.py
│   └── agent_04_voice_calibration.py
├── pipeline/
│   ├── __init__.py
│   ├── graph.py
│   └── runner.py
├── tasks/
│   ├── __init__.py
│   ├── celery_app.py
│   ├── pipeline_tasks.py
│   └── ingestion_tasks.py
├── services/
│   ├── __init__.py
│   ├── transcription.py
│   └── media_extraction.py
├── models/
│   ├── __init__.py
│   ├── voice_profile.py
│   └── session.py
└── db/
    ├── __init__.py
    ├── connection.py
    └── queries.py
```

- **CREATE** `backend/requirements.txt`:
```
fastapi==0.115.0
uvicorn[standard]==0.30.0
langgraph==0.2.0
langchain-anthropic==0.2.0
anthropic==0.40.0
openai==1.50.0           # for Whisper API
assemblyai==0.30.0
celery[redis]==5.4.0
redis==5.1.0
psycopg2-binary==2.9.10
sqlalchemy[asyncio]==2.0.35
asyncpg==0.30.0
yt-dlp==2024.11.18
pydantic==2.9.0
python-dotenv==1.0.1
python-multipart==0.0.12  # for file uploads
boto3==1.35.0             # S3 for file storage
```

- **CREATE** `backend/.env.example`:
```
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
ASSEMBLYAI_API_KEY=
DATABASE_URL=          # same Neon URL as Next.js
REDIS_URL=redis://localhost:6379
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=
FRONTEND_URL=http://localhost:3000
```

- **VALIDATE**: `cd backend && pip install -r requirements.txt` — no errors

---

### TASK 14: CREATE backend main.py + FastAPI app

- **CREATE** `backend/main.py`:
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

app = FastAPI(title="Distill Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:3000")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health():
    return {"status": "ok"}

# Register routers (add as each module is implemented)
from pipeline.runner import router as pipeline_router
from tasks.ingestion_tasks import router as ingest_router
app.include_router(pipeline_router, prefix="/api/v1")
app.include_router(ingest_router, prefix="/api/v1")
```

- **VALIDATE**: `cd backend && uvicorn main:app --reload` → `curl http://localhost:8000/health` → `{"status":"ok"}`

---

### TASK 15: CREATE LangGraph pipeline state + graph

- **CREATE** `backend/pipeline/graph.py`
- **IMPLEMENT** LangGraph `StateGraph` with 4 nodes:

```python
from langgraph.graph import StateGraph, END
from typing import TypedDict, Optional, List

class PipelineState(TypedDict):
    session_id: str
    user_id: str
    input_type: str
    input_text: Optional[str]
    input_url: Optional[str]
    # Agent 01 output
    idea_dump: Optional[dict]           # structured ideas, tone markers, confidence
    transcription_quality: Optional[float]
    # Agent 02 context
    voice_profile: Optional[dict]       # injected from DB; updated by agent 02 signals
    # Agent 03 output
    content_blueprint: Optional[dict]   # hook, bridge, points, closer, what_got_cut, alt_openers
    # Agent 04 output
    final_script: Optional[str]
    timing_markers: Optional[list]
    voice_match_score: Optional[float]
    word_count: Optional[int]
    error: Optional[str]

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

graph = workflow.compile()
```

- **GOTCHA**: Each node function must accept `state: PipelineState` and return a partial dict to merge into state. Do NOT mutate the state dict directly — return updates.
- **VALIDATE**: `python -c "from pipeline.graph import graph; print('Graph compiled OK')"` — no errors

---

### TASK 16: CREATE Agent 01 — Input Ingestion Agent

- **CREATE** `backend/agents/agent_01_input_ingestion.py`
- **IMPLEMENT**:
  - For `input_type = "text"`: pass directly to Claude for idea thread extraction
  - For `input_type = "youtube" | "tiktok"`: call `services/media_extraction.py` to get audio via yt-dlp → transcribe via Whisper
  - For `input_type = "audio" | "video"`: load from S3/local path → transcribe via Whisper
  - Claude call: extract distinct idea threads, emotional tone markers per section, rough word count, identify 3-8 distinct ideas
  - Output: `idea_dump` dict with `{ transcription, idea_threads: [{id, text, tone, priority}], total_words, input_duration_seconds, transcription_confidence }`
  - Update DB: `distillation_sessions.agent_step = "ingestion"` + `status = "processing"` at start
- **IMPORTS**: `anthropic.Anthropic`, `services.transcription.transcribe_audio`, `services.media_extraction.extract_media`
- **GOTCHA**: Always write DB status update at the START of each agent node so frontend polling can show progress
- **VALIDATE**: Unit test with a text input — confirm `idea_dump` has required keys

---

### TASK 17: CREATE Agent 03 — Compression & Structure Agent

- **CREATE** `backend/agents/agent_03_compression.py`
- **IMPLEMENT**: 
  - Compute word count target from `voice_profile.pacing_wpm * 3` (default 390 at 130 wpm). Hard limits: 340–410 words at standard pacing, scaled by profile pacing.
  - Claude system prompt: inject the word count ceiling and floor as hard constraints. The agent MUST justify every inclusion and cut.
  - Claude call with `idea_dump.idea_threads` and voice profile structural patterns → produce structured blueprint
  - Output: `content_blueprint` dict with `{ hook, bridge, points: [{text, word_count}], closer, total_word_count, estimated_runtime_seconds, what_got_cut: [{idea, reason}], alt_openers: [str, str] }`
  - Update DB: `agent_step = "compression"`
- **GOTCHA**: Word count hard constraint enforced in the prompt — if Claude returns a blueprint that's > 410 or < 340 words, retry the call once before flagging.
- **VALIDATE**: Blueprint word count within 340–410 range

---

### TASK 18: CREATE Agent 04 — Voice Calibration Agent

- **CREATE** `backend/agents/agent_04_voice_calibration.py`
- **IMPLEMENT**:
  - Inject full Voice Profile as structured JSON context (NOT free-text) into Claude system prompt
  - Rewrite the `content_blueprint` in the creator's voice — never change the substance, only how it sounds
  - Add inline timing markers based on pacing: `[0:00]`, `[0:20]`, `[0:35]` etc.
  - Compute `voice_match_score` (0–1): attribute-by-attribute diff between target profile and output analysis
  - If `voice_match_score < 0.70`, include a `low_confidence_flag` in output — frontend will surface a recalibration prompt
  - Output: `{ final_script, timing_markers, voice_match_score, readability_score, word_count }`
  - Update DB: `agent_step = "calibration"`
- **GOTCHA**: Voice Profile must be injected as a structured dict in the `system` message, not interpolated as free text. Use a dedicated `<voice_profile>` XML tag block for clarity.
- **VALIDATE**: Final script word count within target range; `voice_match_score` is a float 0–1

---

### TASK 19: CREATE pipeline runner + FastAPI route

- **CREATE** `backend/pipeline/runner.py`
- **IMPLEMENT**:
  - `POST /api/v1/pipeline/run` endpoint
  - Receives `{ sessionId, userId, inputType, inputText, inputUrl, voiceProfileId }`
  - Loads voice profile from DB
  - Dispatches Celery task: `pipeline_tasks.run_pipeline.delay(state)`
  - Returns `{ jobId, status: "queued" }` immediately
- **CREATE** `backend/tasks/pipeline_tasks.py`:
  - `@celery_app.task` that calls `graph.invoke(initial_state)`
  - On completion: writes final output to `distillation_outputs` table, updates `distillation_sessions.status = "complete"`
  - On failure: updates `distillation_sessions.status = "failed"`, stores error message
- **VALIDATE**: `curl -X POST http://localhost:8000/api/v1/pipeline/run -H "Content-Type: application/json" -d '{"sessionId":"test","userId":"test","inputType":"text","inputText":"This is a test idea about productivity"}' ` → job queued

---

### TASK 20: CREATE client hook — `use-session.ts`

- **CREATE** `src/hooks/use-session.ts`
- **IMPLEMENT**: 
  - `createSession(params)` — POST `/api/sessions`, returns `sessionId`
  - Polling loop: while `status` is `pending | processing`, poll `/api/sessions/[id]` every 2000ms
  - Exposes `{ session, output, progress, isPolling, error, createSession, stopPolling }`
  - `progress` is derived from `session.agentStep` → maps to `{ stepLabel, percentComplete }`
- **PATTERN**: Mirror `use-profile.ts` hook structure
- **GOTCHA**: Clear polling interval on unmount (`useEffect` cleanup). Use `useRef` for the interval ID.
- **VALIDATE**: `npm run lint` — no type errors

---

### TASK 21: CREATE client hook — `use-voice-profile.ts`

- **CREATE** `src/hooks/use-voice-profile.ts`
- **IMPLEMENT**: 
  - Fetches list of voice profiles for user
  - Exposes `{ voiceProfiles, activeProfile, isLoading, error, refetch, createProfile, updateProfile }`
- **PATTERN**: Mirror `use-profile.ts`
- **VALIDATE**: `npm run lint`

---

### TASK 22: CREATE pipeline progress component

- **CREATE** `src/components/distill/pipeline-progress.tsx`
- **IMPLEMENT**: Shows 4 steps (Ingesting → Compressing → Calibrating → Done) with visual active/complete state. Receives `agentStep: AgentStep | null` prop. Each step has a label and icon. Active step shows spinner.
- **PATTERN**: Use shadcn/ui primitives (`Card`, etc.), Lucide icons
- **VALIDATE**: Visual — renders correct step highlight for each `agentStep` value

---

### TASK 23: CREATE input panel component

- **CREATE** `src/components/distill/input-panel.tsx`
- **IMPLEMENT**: Tabbed UI — Text | Audio | Video | YouTube | TikTok
  - **Text tab**: `<Textarea>` with character count, min 10 chars
  - **Audio/Video tabs**: Drag-drop file zone (accept correct MIME types), shows file name + size after selection
  - **YouTube/TikTok tabs**: URL `<Input>`, validates URL format
  - Optional: `<Input>` for "user intent" (`userIntent` field) — small text below: "What's this for? (optional)"
  - Submit button: "Distill It" — disabled until valid input
  - On submit: calls `createSession` from `use-session.ts`
- **GOTCHA**: File upload for audio/video → for MVP, show a "Coming soon" state or wire to a `/api/upload` endpoint returning a signed S3 URL. Text + URL inputs are fully functional in Phase 1.
- **VALIDATE**: Submit with text input → session created → redirects to output page

---

### TASK 24: CREATE output viewer component

- **CREATE** `src/components/distill/output-viewer.tsx`
- **IMPLEMENT**: Renders `finalScript` with inline timing markers highlighted (e.g., `[0:00]` in a muted badge). Voice match score shown as a percentage badge (green > 80%, yellow 70-80%, red < 70%). Editable inline (textarea) when user clicks Edit.
- **VALIDATE**: Renders correctly with sample output data

---

### TASK 25: CREATE what-got-cut panel

- **CREATE** `src/components/distill/what-got-cut.tsx`
- **IMPLEMENT**: Collapsible section. Each cut idea shows the idea text + reason. "Reinstate" button on each — sends a POST to regenerate with that idea included (V2; for MVP just shows a toast "Reinstate coming soon").
- **VALIDATE**: Renders cut ideas correctly

---

### TASK 26: CREATE alt openers component

- **CREATE** `src/components/distill/alt-openers.tsx`
- **IMPLEMENT**: Shows 2 alternate opening variants. "Use This Hook" button swaps it into the main script (updates local state). "Request Another" button triggers a new API call to backend to generate a third variant.
- **VALIDATE**: Swap button correctly updates parent script state

---

### TASK 27: CREATE feedback bar component

- **CREATE** `src/components/distill/feedback-bar.tsx`
- **IMPLEMENT**: Fixed bottom bar with 3 actions:
  - **"Looks Good — Export"** → sends `feedbackType: "accept"` then opens export menu
  - **"Edit & Export"** → switches output viewer to edit mode, save triggers `feedbackType: "edit"` with edited content
  - **"Start Over"** → sends `feedbackType: "reject"`, shows rejection reason selector, then redirects to input page
- **VALIDATE**: Each button triggers the correct feedback POST

---

### TASK 28: CREATE export menu component

- **CREATE** `src/components/distill/export-menu.tsx`
- **IMPLEMENT**: Dropdown with two options:
  - **Copy to clipboard**: `navigator.clipboard.writeText(finalScript)` + toast "Copied!"
  - **Download PDF**: Uses `window.print()` with a print-optimized CSS (`@media print`) for MVP. Full PDF generation (with `jsPDF` or server-side) is V2.
- **VALIDATE**: Copy to clipboard works in browser

---

### TASK 29: CREATE distillation input page

- **CREATE** `src/app/(dashboard)/distill/page.tsx`
- **IMPLEMENT**: 
  - Full-page centered layout
  - Shows active Voice Profile name + confidence (if low confidence: amber warning banner)
  - Renders `<InputPanel>` centered
  - On session creation: redirects to `/output/[sessionId]`
  - If no voice profile exists: shows a prompt to set one up first (link to `/voice-profile`)
- **PATTERN**: Loading/error states mirror `editor/page.tsx`
- **VALIDATE**: Page renders, input submits, redirect happens

---

### TASK 30: CREATE output review page

- **CREATE** `src/app/(dashboard)/output/[sessionId]/page.tsx`
- **IMPLEMENT**:
  - Fetches session + output via `use-session.ts`
  - While `status === "pending" | "processing"`: shows `<PipelineProgress>` with current agent step
  - When `status === "complete"`: shows full output UI (`<OutputViewer>`, `<WhatGotCut>`, `<AltOpeners>`, `<FeedbackBar>`)
  - When `status === "failed"`: shows error message + "Try Again" button
- **GOTCHA**: `sessionId` comes from `params` in Next.js App Router: `const { sessionId } = await params;` (async params in Next.js 15)
- **VALIDATE**: Full flow: create session → see progress → see output

---

### TASK 31: CREATE voice profile wizard page

- **CREATE** `src/app/(dashboard)/voice-profile/page.tsx`
- **IMPLEMENT**: Multi-step wizard:
  1. **Step 1 — Own Content**: Add YouTube/TikTok URLs of own videos (min 3 recommended). Shows ingestion status per URL.
  2. **Step 2 — Reference Creators**: Add reference URLs with borrow tags (energy/structure/humor/directness).
  3. **Step 3 — Review Profile**: Shows `<ProfileSummary>` with plain-language description of the 10 attributes. Edit controls for manual overrides.
  - "Build My Profile" button triggers ingestion for all added content
  - Low-confidence warning if < 3 own items
- **VALIDATE**: Can add URLs, submit triggers ingestion, status updates

---

### TASK 32: CREATE history page

- **CREATE** `src/app/(dashboard)/history/page.tsx`
- **IMPLEMENT**: List of past sessions. Each row shows: date, input type icon, status badge, first ~60 chars of final script (if complete), link to output page.
- **VALIDATE**: Renders session list correctly

---

### TASK 33: UPDATE middleware matcher

- **UPDATE** `src/middleware.ts`
- **IMPLEMENT**: Update `config.matcher` to protect new routes:
```typescript
export const config = {
  matcher: [
    "/distill",
    "/distill/:path*",
    "/output/:path*",
    "/voice-profile",
    "/voice-profile/:path*",
    "/history",
    "/history/:path*",
  ],
};
```
- Remove old `/editor`, `/analytics`, `/settings` from matcher
- **VALIDATE**: Visiting `/distill` while logged out → redirects to `/login`

---

### TASK 34: CREATE docker-compose.yml

- **CREATE** `docker-compose.yml` at repo root:
```yaml
version: "3.9"
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
  
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - REDIS_URL=redis://redis:6379
    env_file:
      - ./backend/.env
    depends_on:
      - redis
    command: uvicorn main:app --host 0.0.0.0 --port 8000 --reload

  worker:
    build: ./backend
    env_file:
      - ./backend/.env
    environment:
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
    command: celery -A tasks.celery_app worker --loglevel=info
```
- **CREATE** `backend/Dockerfile`:
```dockerfile
FROM python:3.12-slim
WORKDIR /app
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
```
- **VALIDATE**: `docker-compose up redis` — Redis starts on port 6379

---

### TASK 35: UPDATE `src/app/(dashboard)/layout.tsx` — final Distill nav

- **UPDATE** `src/app/(dashboard)/layout.tsx`
- **IMPLEMENT**: Replace all remaining link-in-bio content:
  - Brand: "Distill" (with Mic icon from lucide-react)
  - Nav links: `Distill` → `/distill`, `Voice` → `/voice-profile`, `History` → `/history`
  - Remove Analytics link
- **VALIDATE**: Nav renders correctly at `/distill`

---

### TASK 36: DELETE legacy link-in-bio files

- **DELETE** (or repurpose) the following files that are no longer relevant to Distill:
  - `src/components/editor/` — all files (link-list, link-item, add-link-button, profile-form, editor-toolbar)
  - `src/components/preview/preview-panel.tsx`
  - `src/components/themes/minimal.tsx`
  - `src/app/api/links/` — entire directory
  - `src/app/api/links/[id]/` — directory
  - `src/app/api/links/reorder/` — directory
  - `src/app/api/slug/` — directory
  - `src/app/(dashboard)/editor/page.tsx` — replaced by `/distill/page.tsx`
  - `tests/e2e/` scripts for editor/links/reorder (keep `run-all.sh` scaffold, update test list)
  - `.agents/plans/phase-1-profile-editor-live-preview.md` — outdated plan
- **GOTCHA**: Delete these AFTER the new routes and pages are working, not before
- **VALIDATE**: `npm run build` — no missing import errors

---

### TASK 37: UPDATE e2e tests

- **UPDATE** `tests/e2e/run-all.sh`
- **IMPLEMENT**: Replace old test scripts with Distill test scripts:
  - `tests/e2e/signup.sh` — keep as-is (auth still the same)
  - `tests/e2e/distill-text.sh` — test: login → POST text session → poll until complete → verify output page
  - `tests/e2e/voice-profile.sh` — test: login → add YouTube URL → trigger ingestion → poll status
- **VALIDATE**: `npm run test:e2e` (with dev server running)

---

### TASK 38: SAVE project memory

- After the schema migration runs successfully (`npm run db:push`), document the new schema in memory.
- Update `MEMORY.md` with a project memory: "Distill schema migration complete — new tables: voice_profiles, ingested_content, distillation_sessions, distillation_outputs, session_feedback. Old link_items/click_events removed."

---

## TESTING STRATEGY

### Unit Tests

Test framework: Vitest (existing). Test files in `src/lib/__tests__/`.

- `src/lib/__tests__/validations.test.ts` — **replace** with Distill schema tests: test `createSessionSchema`, `sessionFeedbackSchema`, `updateVoiceProfileSchema` with valid + invalid inputs
- `src/lib/__tests__/pipeline-progress.test.ts` — test agent step → progress label/percent mapping logic

### Integration Tests

- E2E via `tests/e2e/distill-text.sh`: full flow from text input submission to output display using `curl` against running dev server

### Edge Cases

- Session submitted but backend is down → session stays `pending`, frontend shows "Processing is taking longer than expected" after 30s
- Voice Profile with `confidence_score < 0.3` → warning shown but user can still submit
- Voice match score < 70% → output page shows "Your Voice Profile may need more calibration" banner
- Text input with < 10 characters → `createSessionSchema` rejects before API call
- Polling response when session is `failed` → show error + retry button, do NOT infinite poll

---

## VALIDATION COMMANDS

### Level 1: Syntax & Style
```bash
npm run lint         # Biome check
npm run lint:fix     # Auto-fix
```

### Level 2: Unit Tests
```bash
npm run test:run     # Vitest
```

### Level 3: Schema Migration
```bash
npm run db:push      # Push Distill schema to Neon
npm run db:studio    # Open Drizzle Studio to verify tables
```

### Level 4: Backend
```bash
cd backend && uvicorn main:app --reload   # FastAPI server
celery -A tasks.celery_app worker --loglevel=info  # Worker
curl http://localhost:8000/health         # Health check
```

### Level 5: Integration
```bash
npm run dev          # Next.js dev server
npm run test:e2e     # E2E suite
```

---

## ACCEPTANCE CRITERIA

- [ ] All link-in-bio references removed from source code
- [ ] Distill schema applied to Neon DB (6 tables, no old tables)
- [ ] Text input → session created → pipeline runs → output displayed (end-to-end)
- [ ] Pipeline progress shown in UI with 4 agent steps
- [ ] Output includes: script with timing markers, voice match score, what got cut, 2 alt openers
- [ ] Accept/Edit/Reject feedback saves to DB and triggers Voice Profile weight update
- [ ] Copy to clipboard export works
- [ ] Voice Profile wizard allows adding YouTube/TikTok URLs
- [ ] Low-confidence Voice Profile shows warning but does not block use
- [ ] Session with `failed` status shows error and retry option
- [ ] `npm run lint` passes with zero errors
- [ ] `npm run test:run` passes

---

## COMPLETION CHECKLIST

- [ ] Tasks 1–5: Foundation (schema, types, validations, branding)
- [ ] Tasks 6–12: Next.js API routes
- [ ] Tasks 13–19: Python backend + LangGraph pipeline
- [ ] Tasks 20–21: Client hooks
- [ ] Tasks 22–32: UI components + pages
- [ ] Tasks 33–35: Middleware + nav + final cleanup
- [ ] Task 36: Delete legacy files
- [ ] Tasks 37–38: Tests + memory
- [ ] `npm run build` passes with zero errors

---

## NOTES

**Two-service architecture**: The Next.js app is the frontend + lightweight API proxy. The Python FastAPI service is the AI execution layer. In dev: Next.js on :3000, FastAPI on :8000. Next.js API routes proxy pipeline triggers to FastAPI; polling happens via Next.js API routes reading from the shared Neon DB. This avoids exposing the backend directly to the browser and keeps auth centralized in Next.js.

**File uploads**: For MVP, audio/video file upload is stubbed with a "Coming soon" state. Only text + YouTube/TikTok URLs are fully wired. Add S3 pre-signed upload URL + FFmpeg processing in V1.1.

**Voice Profile on first use**: New users won't have a Voice Profile with calibrated content. For MVP, allow creating a "skeleton" Voice Profile with defaults (conversational, 130 wpm, mixed rhythm) so they can use Distill immediately while calibration content processes in the background.

**Database shared between services**: Both Next.js (via Drizzle + Neon HTTP) and FastAPI (via SQLAlchemy + asyncpg) connect to the same Neon Postgres. The backend writes session status updates; Next.js reads them. This works because Neon is serverless Postgres — no connection pooling conflicts at MVP scale.

**LangGraph version**: Use `langgraph>=0.2.0`. The `StateGraph` API stabilized in 0.2. Do NOT use the older `Graph` class from 0.1.

**Confidence Score**: 7/10. The frontend, API routes, and database schema are straightforward. The Python backend + LangGraph pipeline are more complex — the main risk is the Claude prompt engineering for Agent 03 (word count enforcement) and Agent 04 (voice match quality). Expect iteration on the system prompts before the voice match score feels accurate.
