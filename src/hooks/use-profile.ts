"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { LinkItem, Profile } from "@/types";

interface UseProfileReturn {
	profile: Profile | null;
	links: LinkItem[];
	isLoading: boolean;
	error: string | null;
	refetch: () => Promise<void>;
}

export function useProfile(): UseProfileReturn {
	const router = useRouter();
	const [profile, setProfile] = useState<Profile | null>(null);
	const [links, setLinks] = useState<LinkItem[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// biome-ignore lint/correctness/useExhaustiveDependencies: router.push is stable
	const fetchProfile = useCallback(async () => {
		setIsLoading(true);
		setError(null);

		try {
			const res = await fetch("/api/profile");
			if (!res.ok) {
				if (res.status === 401) {
					router.push("/login");
					return;
				}
				throw new Error("Failed to fetch profile");
			}

			const data = await res.json();
			setProfile(data.profile);
			setLinks(data.links ?? []);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load profile");
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchProfile();
	}, [fetchProfile]);

	return { profile, links, isLoading, error, refetch: fetchProfile };
}
