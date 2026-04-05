"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { VoiceProfile } from "@/types";

interface UseVoiceProfileReturn {
	voiceProfiles: VoiceProfile[];
	activeProfile: VoiceProfile | null;
	isLoading: boolean;
	error: string | null;
	refetch: () => Promise<void>;
	createProfile: (name?: string) => Promise<VoiceProfile | null>;
	updateProfile: (id: string, data: Partial<VoiceProfile>) => Promise<void>;
}

export function useVoiceProfile(): UseVoiceProfileReturn {
	const router = useRouter();
	const [voiceProfiles, setVoiceProfiles] = useState<VoiceProfile[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const fetchProfiles = useCallback(async () => {
		setIsLoading(true);
		setError(null);
		try {
			const res = await fetch("/api/voice-profiles");
			if (res.status === 401) {
				router.push("/login");
				return;
			}
			if (!res.ok) throw new Error("Failed to fetch voice profiles");
			const data = await res.json();
			setVoiceProfiles(data.voiceProfiles ?? []);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load voice profiles");
		} finally {
			setIsLoading(false);
		}
	}, [router]);

	useEffect(() => {
		fetchProfiles();
	}, [fetchProfiles]);

	const createProfile = useCallback(
		async (name = "Main Voice"): Promise<VoiceProfile | null> => {
			try {
				const res = await fetch("/api/voice-profiles", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ profileName: name }),
				});
				if (!res.ok) {
					const data = await res.json();
					throw new Error(data.error ?? "Failed to create profile");
				}
				const data = await res.json();
				await fetchProfiles();
				return data.voiceProfile;
			} catch (err) {
				setError(err instanceof Error ? err.message : "Failed to create voice profile");
				return null;
			}
		},
		[fetchProfiles],
	);

	const updateProfile = useCallback(
		async (id: string, updates: Partial<VoiceProfile>): Promise<void> => {
			try {
				const res = await fetch(`/api/voice-profiles/${id}`, {
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(updates),
				});
				if (!res.ok) throw new Error("Failed to update voice profile");
				await fetchProfiles();
			} catch (err) {
				setError(err instanceof Error ? err.message : "Failed to update voice profile");
			}
		},
		[fetchProfiles],
	);

	// First profile is the active one
	const activeProfile = voiceProfiles[0] ?? null;

	return {
		voiceProfiles,
		activeProfile,
		isLoading,
		error,
		refetch: fetchProfiles,
		createProfile,
		updateProfile,
	};
}
