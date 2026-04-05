import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { ingestedContent, voiceProfiles } from "@/lib/db/schema";
import { apiRateLimiter } from "@/lib/rate-limit";
import { ingestContentSchema } from "@/lib/validations";

async function getUser() {
	const { data } = await auth.getSession();
	return data?.user ?? null;
}

export async function POST(request: NextRequest) {
	const ip = request.headers.get("x-forwarded-for") ?? "anonymous";
	const { success } = apiRateLimiter.check(ip);
	if (!success) {
		return NextResponse.json({ error: "Too many requests" }, { status: 429 });
	}

	const user = await getUser();
	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const body = await request.json();
	const result = ingestContentSchema.safeParse(body);
	if (!result.success) {
		return NextResponse.json({ error: result.error.issues[0]?.message }, { status: 400 });
	}

	// Verify the voice profile belongs to the user
	const profile = await db.query.voiceProfiles.findFirst({
		where: and(eq(voiceProfiles.id, result.data.voiceProfileId), eq(voiceProfiles.userId, user.id)),
	});
	if (!profile) {
		return NextResponse.json({ error: "Voice profile not found" }, { status: 404 });
	}

	// For text source type, store directly
	const [content] = await db
		.insert(ingestedContent)
		.values({
			userId: user.id,
			voiceProfileId: result.data.voiceProfileId,
			contentType: result.data.contentType,
			sourceType: result.data.sourceType,
			sourceUrl: result.data.sourceUrl ?? null,
			transcription: result.data.sourceType === "text" ? (result.data.sourceText ?? null) : null,
			borrowTags: result.data.borrowTags ?? [],
			processingStatus: result.data.sourceType === "text" ? "complete" : "pending",
		})
		.returning();

	// For URL-based sources, trigger backend ingestion job — fire and forget
	if (result.data.sourceType !== "text") {
		const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8000";
		try {
			await fetch(`${backendUrl}/api/v1/ingest`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					contentId: content.id,
					userId: user.id,
					voiceProfileId: result.data.voiceProfileId,
					contentType: result.data.contentType,
					sourceType: result.data.sourceType,
					sourceUrl: result.data.sourceUrl,
					borrowTags: result.data.borrowTags,
				}),
				signal: AbortSignal.timeout(5000),
			});
		} catch {
			// Backend unreachable — processingStatus stays "pending", worker will pick it up
		}
	}

	return NextResponse.json({ content }, { status: 201 });
}
