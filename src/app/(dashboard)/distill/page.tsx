"use client";

import { AlertTriangle, Mic } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { InputPanel } from "@/components/distill/input-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/use-session";
import { useVoiceProfile } from "@/hooks/use-voice-profile";
import type { InputType } from "@/types";

export default function DistillPage() {
	const router = useRouter();
	const { activeProfile, isLoading: profileLoading } = useVoiceProfile();
	const { createSession } = useSession();
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleSubmit = async (params: {
		inputType: InputType;
		inputText?: string;
		inputUrl?: string;
		userIntent?: string;
	}) => {
		setIsSubmitting(true);
		try {
			const sessionId = await createSession({
				...params,
				voiceProfileId: activeProfile?.id,
			});
			if (sessionId) {
				router.push(`/output/${sessionId}`);
			}
		} finally {
			setIsSubmitting(false);
		}
	};

	const isLowConfidence = activeProfile && (activeProfile.confidenceScore ?? 0) < 0.4;

	return (
		<div className="mx-auto max-w-3xl px-4 py-12 space-y-8">
			{/* Header */}
			<div className="text-center space-y-3">
				<h1 className="text-3xl font-bold tracking-tight">Turn your chaos into your voice</h1>
				<p className="text-muted-foreground text-lg">
					Drop raw ideas — get a 3-minute script in under 90 seconds.
				</p>
			</div>

			{/* Voice profile status */}
			{!profileLoading && (
				<div className="flex items-center justify-center gap-2">
					<Mic className="h-4 w-4 text-muted-foreground" />
					{activeProfile ? (
						<>
							<span className="text-sm text-muted-foreground">Voice:</span>
							<Badge variant="outline" className="font-normal">
								{activeProfile.profileName}
							</Badge>
							{isLowConfidence && (
								<div className="flex items-center gap-1 text-yellow-600">
									<AlertTriangle className="h-3.5 w-3.5" />
									<span className="text-xs">Low confidence — add more content in</span>
									<Button
										variant="link"
										size="sm"
										className="h-auto p-0 text-xs text-yellow-600"
										onClick={() => router.push("/voice-profile")}
									>
										Voice settings
									</Button>
								</div>
							)}
						</>
					) : (
						<>
							<span className="text-sm text-muted-foreground">No voice profile yet.</span>
							<Button
								variant="link"
								size="sm"
								className="h-auto p-0 text-sm"
								onClick={() => router.push("/voice-profile")}
							>
								Set one up →
							</Button>
						</>
					)}
				</div>
			)}

			{/* Input panel */}
			<InputPanel onSubmit={handleSubmit} isSubmitting={isSubmitting} />
		</div>
	);
}
