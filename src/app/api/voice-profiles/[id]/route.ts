export const dynamic = "force-dynamic";

import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { voiceProfiles } from "@/lib/db/schema";
import { apiRateLimiter } from "@/lib/rate-limit";
import { updateVoiceProfileSchema } from "@/lib/validations";

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
	const profile = await db.query.voiceProfiles.findFirst({
		where: and(eq(voiceProfiles.id, id), eq(voiceProfiles.userId, user.id)),
	});

	if (!profile) {
		return NextResponse.json({ error: "Voice profile not found" }, { status: 404 });
	}

	return NextResponse.json({ voiceProfile: profile });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

	// Verify ownership before update
	const existing = await db.query.voiceProfiles.findFirst({
		where: and(eq(voiceProfiles.id, id), eq(voiceProfiles.userId, user.id)),
	});
	if (!existing) {
		return NextResponse.json({ error: "Voice profile not found" }, { status: 404 });
	}

	const body = await request.json();
	const result = updateVoiceProfileSchema.safeParse(body);
	if (!result.success) {
		return NextResponse.json({ error: result.error.issues[0]?.message }, { status: 400 });
	}

	const updateData: Record<string, unknown> = {
		updatedAt: new Date(),
		version: existing.version + 1,
	};
	if (result.data.profileName !== undefined) updateData.profileName = result.data.profileName;
	if (result.data.vocabularyLevel !== undefined)
		updateData.vocabularyLevel = result.data.vocabularyLevel;
	if (result.data.sentenceRhythm !== undefined)
		updateData.sentenceRhythm = result.data.sentenceRhythm;
	if (result.data.energySignature !== undefined)
		updateData.energySignature = result.data.energySignature;
	if (result.data.pacingWpm !== undefined) updateData.pacingWpm = result.data.pacingWpm;
	if (result.data.openerPattern !== undefined) updateData.openerPattern = result.data.openerPattern;
	if (result.data.closerPattern !== undefined) updateData.closerPattern = result.data.closerPattern;
	if (result.data.transitionStyle !== undefined)
		updateData.transitionStyle = result.data.transitionStyle;
	if (result.data.plainSummary !== undefined) updateData.plainSummary = result.data.plainSummary;

	const [updated] = await db
		.update(voiceProfiles)
		.set(updateData)
		.where(and(eq(voiceProfiles.id, id), eq(voiceProfiles.userId, user.id)))
		.returning();

	return NextResponse.json({ voiceProfile: updated });
}

export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
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

	const { id } = await params;
	const deleted = await db
		.delete(voiceProfiles)
		.where(and(eq(voiceProfiles.id, id), eq(voiceProfiles.userId, user.id)))
		.returning();

	if (deleted.length === 0) {
		return NextResponse.json({ error: "Voice profile not found" }, { status: 404 });
	}

	return NextResponse.json({ success: true });
}
