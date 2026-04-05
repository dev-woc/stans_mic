import { desc, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { distillationSessions } from "@/lib/db/schema";
import { apiRateLimiter } from "@/lib/rate-limit";
import { createSessionSchema } from "@/lib/validations";

async function getUser() {
	const { data } = await auth.getSession();
	return data?.user ?? null;
}

export async function GET(request: NextRequest) {
	const ip = request.headers.get("x-forwarded-for") ?? "anonymous";
	const { success } = apiRateLimiter.check(ip);
	if (!success) {
		return NextResponse.json({ error: "Too many requests" }, { status: 429 });
	}

	const user = await getUser();
	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const sessions = await db.query.distillationSessions.findMany({
		where: eq(distillationSessions.userId, user.id),
		orderBy: [desc(distillationSessions.createdAt)],
		limit: 20,
	});

	return NextResponse.json({ sessions });
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
	const result = createSessionSchema.safeParse(body);
	if (!result.success) {
		return NextResponse.json({ error: result.error.issues[0]?.message }, { status: 400 });
	}

	// Create session record in DB
	const [session] = await db
		.insert(distillationSessions)
		.values({
			userId: user.id,
			voiceProfileId: result.data.voiceProfileId ?? null,
			inputType: result.data.inputType,
			inputText: result.data.inputText ?? null,
			inputUrl: result.data.inputUrl ?? null,
			userIntent: result.data.userIntent ?? null,
			status: "pending",
		})
		.returning();

	// Trigger backend pipeline — fire and forget
	const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8000";
	try {
		await fetch(`${backendUrl}/api/v1/pipeline/run`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				sessionId: session.id,
				userId: user.id,
				inputType: result.data.inputType,
				inputText: result.data.inputText,
				inputUrl: result.data.inputUrl,
				voiceProfileId: result.data.voiceProfileId,
				userIntent: result.data.userIntent,
			}),
			signal: AbortSignal.timeout(5000),
		});
	} catch {
		// Backend unreachable — session stays pending; worker will pick it up later
		// Do not fail the request — frontend will show progress while it waits
	}

	return NextResponse.json({ session }, { status: 201 });
}
