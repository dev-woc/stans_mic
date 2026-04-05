export const dynamic = "force-dynamic";

import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { apiRateLimiter } from "@/lib/rate-limit";
import { profileSchema } from "@/lib/validations";

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

	const profile = await db.query.profiles.findFirst({
		where: eq(profiles.userId, user.id),
	});

	return NextResponse.json({ profile: profile ?? null });
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

	const existing = await db.query.profiles.findFirst({
		where: eq(profiles.userId, user.id),
	});
	if (existing) {
		return NextResponse.json({ error: "Profile already exists" }, { status: 409 });
	}

	const body = await request.json();
	const result = profileSchema.safeParse(body);
	if (!result.success) {
		return NextResponse.json({ error: result.error.issues[0]?.message }, { status: 400 });
	}

	const [profile] = await db
		.insert(profiles)
		.values({
			userId: user.id,
			displayName: result.data.displayName,
			avatarUrl: result.data.avatarUrl,
		})
		.returning();

	return NextResponse.json({ profile }, { status: 201 });
}

export async function PUT(request: NextRequest) {
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
	const result = profileSchema.safeParse(body);
	if (!result.success) {
		return NextResponse.json({ error: result.error.issues[0]?.message }, { status: 400 });
	}

	const [updated] = await db
		.update(profiles)
		.set({
			displayName: result.data.displayName,
			avatarUrl: result.data.avatarUrl,
			updatedAt: new Date(),
		})
		.where(eq(profiles.userId, user.id))
		.returning();

	if (!updated) {
		return NextResponse.json({ error: "Profile not found" }, { status: 404 });
	}

	return NextResponse.json({ profile: updated });
}
