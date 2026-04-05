export const dynamic = "force-dynamic";

import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { distillationOutputs, distillationSessions } from "@/lib/db/schema";
import { apiRateLimiter } from "@/lib/rate-limit";

async function getUser() {
	const { data } = await auth.getSession();
	return data?.user ?? null;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

	const session = await db.query.distillationSessions.findFirst({
		where: and(eq(distillationSessions.id, id), eq(distillationSessions.userId, user.id)),
	});

	if (!session) {
		return NextResponse.json({ error: "Session not found" }, { status: 404 });
	}

	// Fetch output if session is complete
	let output = null;
	if (session.status === "complete") {
		output = await db.query.distillationOutputs.findFirst({
			where: eq(distillationOutputs.sessionId, id),
		});
	}

	return NextResponse.json({ session, output });
}
