import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(request: NextRequest) {
	// Check for Neon Auth session cookie
	const allCookies = request.cookies.getAll();
	const sessionCookie = allCookies.find((c) => c.name.includes("neon-auth.session_token"));

	if (!sessionCookie?.value) {
		const loginUrl = new URL("/login", request.url);
		loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
		return NextResponse.redirect(loginUrl);
	}

	return NextResponse.next();
}

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
