import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { ingestedContent } from "@/lib/db/schema";
import { apiRateLimiter } from "@/lib/rate-limit";

async function getUser() {
	const { data } = await auth.getSession();
	return data?.user ?? null;
}

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ jobId: string }> },
) {
	const ip = request.headers.get("x-forwarded-for") ?? "anonymous";
	const { success } = apiRateLimiter.check(ip);
	if (!success) {
		return NextResponse.json({ error: "Too many requests" }, { status: 429 });
	}

	const user = await getUser();
	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { jobId } = await params;

	// jobId is the ingestedContent.id — backend writes status updates directly to the DB
	const content = await db.query.ingestedContent.findFirst({
		where: and(eq(ingestedContent.id, jobId), eq(ingestedContent.userId, user.id)),
	});

	if (!content) {
		return NextResponse.json({ error: "Ingestion job not found" }, { status: 404 });
	}

	return NextResponse.json({
		contentId: content.id,
		status: content.processingStatus,
		errorMessage: content.errorMessage,
	});
}
