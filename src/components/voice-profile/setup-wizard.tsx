"use client";

import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ContentUploader } from "@/components/voice-profile/content-uploader";
import { ProfileSummary } from "@/components/voice-profile/profile-summary";
import type { VoiceProfile } from "@/types";

interface SetupWizardProps {
	voiceProfile: VoiceProfile;
	onUpdate: (updates: Partial<VoiceProfile>) => Promise<void>;
	onComplete: () => void;
}

type WizardStep = "own" | "reference" | "review";

export function SetupWizard({ voiceProfile, onUpdate, onComplete }: SetupWizardProps) {
	const [step, setStep] = useState<WizardStep>("own");
	const [ownContentCount, setOwnContentCount] = useState(voiceProfile.ownContentCount ?? 0);

	const isLowConfidence = ownContentCount < 3;

	const steps: { key: WizardStep; title: string; description: string }[] = [
		{
			key: "own",
			title: "Your own content",
			description: "Add 3+ of your own YouTube or TikTok videos so Distill can learn how you talk.",
		},
		{
			key: "reference",
			title: "Reference creators",
			description:
				"Optional: add creators whose energy or style you admire. Distill won't copy them — it extracts patterns.",
		},
		{
			key: "review",
			title: "Review your profile",
			description: "See what Distill learned about your voice. Edit anything that feels off.",
		},
	];

	const currentStepIndex = steps.findIndex((s) => s.key === step);
	const current = steps[currentStepIndex];

	return (
		<div className="space-y-6">
			{/* Step indicators */}
			<div className="flex items-center gap-2">
				{steps.map((s, i) => (
					<div key={s.key} className="flex items-center gap-2">
						<button
							type="button"
							className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors ${
								i < currentStepIndex
									? "bg-primary text-primary-foreground"
									: i === currentStepIndex
										? "border-2 border-primary text-primary"
										: "border border-muted text-muted-foreground"
							}`}
							onClick={() => i < currentStepIndex && setStep(s.key)}
						>
							{i < currentStepIndex ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
						</button>
						{i < steps.length - 1 && (
							<div className={`h-0.5 w-8 ${i < currentStepIndex ? "bg-primary" : "bg-muted"}`} />
						)}
					</div>
				))}
			</div>

			<Card>
				<CardHeader>
					<CardTitle>{current.title}</CardTitle>
					<CardDescription>{current.description}</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					{step === "own" && (
						<>
							{isLowConfidence && (
								<div className="text-sm text-yellow-700 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
									Add at least 3 videos (or ~15 minutes of content) for accurate voice calibration.
									You can use Distill with fewer, but the voice match will be approximate.
								</div>
							)}
							<ContentUploader
								voiceProfileId={voiceProfile.id}
								contentType="own"
								onItemAdded={() => setOwnContentCount((c) => c + 1)}
							/>
						</>
					)}

					{step === "reference" && (
						<ContentUploader voiceProfileId={voiceProfile.id} contentType="reference" />
					)}

					{step === "review" && <ProfileSummary profile={voiceProfile} onUpdate={onUpdate} />}

					<div className="flex justify-between pt-2">
						{currentStepIndex > 0 ? (
							<Button variant="ghost" onClick={() => setStep(steps[currentStepIndex - 1].key)}>
								Back
							</Button>
						) : (
							<div />
						)}

						{step !== "review" ? (
							<Button onClick={() => setStep(steps[currentStepIndex + 1].key)}>
								{step === "own" && isLowConfidence ? "Continue anyway" : "Continue"}
								<ArrowRight className="ml-2 h-4 w-4" />
							</Button>
						) : (
							<Button onClick={onComplete}>
								Start Distilling
								<ArrowRight className="ml-2 h-4 w-4" />
							</Button>
						)}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
