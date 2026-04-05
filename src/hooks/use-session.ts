"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
	AgentStep,
	DistillationOutput,
	DistillationSession,
	FeedbackType,
	InputType,
	PipelineProgress,
	SessionStatus,
} from "@/types";

const STEP_META: Record<string, { label: string; percent: number }> = {
	ingestion: { label: "Analyzing your ideas...", percent: 25 },
	compression: { label: "Building your 3-minute structure...", percent: 60 },
	calibration: { label: "Calibrating to your voice...", percent: 85 },
	done: { label: "Done!", percent: 100 },
};

function deriveProgress(session: DistillationSession): PipelineProgress {
	const step = session.agentStep as AgentStep | null;
	const meta = step ? STEP_META[step] : null;
	return {
		sessionId: session.id,
		status: session.status as SessionStatus,
		agentStep: step,
		stepLabel: meta?.label ?? "Starting pipeline...",
		percentComplete: meta?.percent ?? 5,
	};
}

interface UseSessionReturn {
	session: DistillationSession | null;
	output: DistillationOutput | null;
	progress: PipelineProgress | null;
	isPolling: boolean;
	error: string | null;
	createSession: (params: CreateSessionParams) => Promise<string | null>;
	submitFeedback: (
		type: FeedbackType,
		editedContent?: string,
		rejectionReason?: string,
	) => Promise<void>;
	stopPolling: () => void;
}

interface CreateSessionParams {
	voiceProfileId?: string;
	inputType: InputType;
	inputText?: string;
	inputUrl?: string;
	userIntent?: string;
}

export function useSession(initialSessionId?: string): UseSessionReturn {
	const router = useRouter();
	const [session, setSession] = useState<DistillationSession | null>(null);
	const [output, setOutput] = useState<DistillationOutput | null>(null);
	const [progress, setProgress] = useState<PipelineProgress | null>(null);
	const [isPolling, setIsPolling] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

	const stopPolling = useCallback(() => {
		if (intervalRef.current) {
			clearInterval(intervalRef.current);
			intervalRef.current = null;
		}
		setIsPolling(false);
	}, []);

	const pollSession = useCallback(
		async (sessionId: string) => {
			try {
				const res = await fetch(`/api/sessions/${sessionId}`);
				if (res.status === 401) {
					router.push("/login");
					stopPolling();
					return;
				}
				if (!res.ok) throw new Error("Failed to fetch session");

				const data = await res.json();
				const s: DistillationSession = data.session;
				setSession(s);
				setProgress(deriveProgress(s));

				if (s.status === "complete" && data.output) {
					setOutput(data.output);
					stopPolling();
				} else if (s.status === "failed") {
					setError(s.errorMessage ?? "Pipeline failed. Please try again.");
					stopPolling();
				}
			} catch (err) {
				setError(err instanceof Error ? err.message : "Failed to load session");
				stopPolling();
			}
		},
		[router, stopPolling],
	);

	const startPolling = useCallback(
		(sessionId: string) => {
			setIsPolling(true);
			pollSession(sessionId);
			intervalRef.current = setInterval(() => pollSession(sessionId), 2000);
		},
		[pollSession],
	);

	// If a session ID is provided on mount, start polling immediately
	useEffect(() => {
		if (initialSessionId) {
			startPolling(initialSessionId);
		}
		return () => stopPolling();
	}, [initialSessionId, startPolling, stopPolling]);

	const createSession = useCallback(
		async (params: CreateSessionParams): Promise<string | null> => {
			setError(null);
			try {
				const res = await fetch("/api/sessions", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(params),
				});
				if (res.status === 401) {
					router.push("/login");
					return null;
				}
				if (!res.ok) {
					const data = await res.json();
					throw new Error(data.error ?? "Failed to create session");
				}
				const data = await res.json();
				const newSession: DistillationSession = data.session;
				setSession(newSession);
				setProgress(deriveProgress(newSession));
				startPolling(newSession.id);
				return newSession.id;
			} catch (err) {
				setError(err instanceof Error ? err.message : "Failed to start distillation");
				return null;
			}
		},
		[router, startPolling],
	);

	const submitFeedback = useCallback(
		async (type: FeedbackType, editedContent?: string, rejectionReason?: string) => {
			if (!session) return;
			try {
				await fetch(`/api/sessions/${session.id}/feedback`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						feedbackType: type,
						editedContent,
						rejectionReason,
					}),
				});
			} catch {
				// Non-critical — feedback can be retried silently
			}
		},
		[session],
	);

	return {
		session,
		output,
		progress,
		isPolling,
		error,
		createSession,
		submitFeedback,
		stopPolling,
	};
}
