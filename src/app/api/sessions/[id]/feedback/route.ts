export const dynamic = "force-dynamic";

import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { distillationSessions, sessionFeedback } from "@/lib/db/schema";
import { apiRateLimiter } from "@/lib/rate-limit";
import { sessionFeedbackSchema } from "@/lib/validations";

async function getUser() {
	const { data } = await auth.getSession();
	return data?.user ?? null;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const ip = request.headers.get("x-forwarded-for") ?? "anonymous";
	const { success } = apiRateLimiter.check(ip);
	if (!success) {
		return NextResponse.json({ error: "Too many requests" }, { status: 429 });
	}

	const user = await getUser();
	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { id } = await params;

	// Verify session belongs to user
	const session = await db.query.distillationSessions.findFirst({
		where: and(eq(distillationSessions.id, id), eq(distillationSessions.userId, user.id)),
	});
	if (!session) {
		return NextResponse.json({ error: "Session not found" }, { status: 404 });
	}

	const body = await request.json();
	const result = sessionFeedbackSchema.safeParse(body);
	if (!result.success) {
		return NextResponse.json({ error: result.error.issues[0]?.message }, { status: 400 });
	}

	const [feedback] = await db
		.insert(sessionFeedback)
		.values({
			sessionId: id,
			feedbackType: result.data.feedbackType,
			editedContent: result.data.editedContent ?? null,
			rejectionReason: result.data.rejectionReason ?? null,
		})
		.returning();

	// Notify backend to update Voice Profile weights — fire and forget
	if (session.voiceProfileId) {
		const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8000";
		try {
			await fetch(`${backendUrl}/api/v1/voice-profiles/${session.voiceProfileId}/update-weights`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					sessionId: id,
					feedbackType: result.data.feedbackType,
					editedContent: result.data.editedContent,
					rejectionReason: result.data.rejectionReason,
				}),
				signal: AbortSignal.timeout(3000),
			});
		} catch {
			// Non-critical: weight update will be retried by backend on next sync
		}
	}

	return NextResponse.json({ feedback }, { status: 201 });
}
