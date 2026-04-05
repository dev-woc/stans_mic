"use client";

import { Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileSummary } from "@/components/voice-profile/profile-summary";
import { SetupWizard } from "@/components/voice-profile/setup-wizard";
import { useVoiceProfile } from "@/hooks/use-voice-profile";

export default function VoiceProfilePage() {
	const router = useRouter();
	const { voiceProfiles, activeProfile, isLoading, error, createProfile, updateProfile, refetch } =
		useVoiceProfile();
	const [showWizard, setShowWizard] = useState(false);
	const [isCreating, setIsCreating] = useState(false);

	const handleCreateProfile = async () => {
		setIsCreating(true);
		const profile = await createProfile();
		setIsCreating(false);
		if (profile) {
			setShowWizard(true);
			await refetch();
		}
	};

	if (isLoading) {
		return (
			<div className="flex min-h-[60vh] items-center justify-center">
				<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex min-h-[60vh] items-center justify-center">
				<p className="text-destructive">{error}</p>
			</div>
		);
	}

	// No profiles yet — show creation prompt or wizard
	if (voiceProfiles.length === 0 || showWizard) {
		return (
			<div className="mx-auto max-w-2xl px-4 py-12 space-y-6">
				<div className="space-y-2">
					<h1 className="text-2xl font-bold">Set up your Voice Profile</h1>
					<p className="text-muted-foreground">
						Distill learns how you talk from your own content. The more you give it, the more it
						sounds like you.
					</p>
				</div>

				{voiceProfiles.length === 0 ? (
					<Button
						onClick={handleCreateProfile}
						disabled={isCreating}
						size="lg"
						className="w-full sm:w-auto"
					>
						{isCreating ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Creating...
							</>
						) : (
							<>
								<Plus className="mr-2 h-4 w-4" />
								Create your Voice Profile
							</>
						)}
					</Button>
				) : (
					activeProfile && (
						<SetupWizard
							voiceProfile={activeProfile}
							onUpdate={(updates) => updateProfile(activeProfile.id, updates)}
							onComplete={() => {
								setShowWizard(false);
								router.push("/distill");
							}}
						/>
					)
				)}
			</div>
		);
	}

	// Has profiles — show management view
	return (
		<div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold">Voice Profile</h1>
					<p className="text-muted-foreground text-sm">Manage how Distill writes in your voice.</p>
				</div>
				<Button variant="outline" size="sm" onClick={handleCreateProfile} disabled={isCreating}>
					<Plus className="mr-2 h-4 w-4" />
					New profile
				</Button>
			</div>

			{voiceProfiles.length > 1 ? (
				<Tabs defaultValue={voiceProfiles[0].id}>
					<TabsList>
						{voiceProfiles.map((p) => (
							<TabsTrigger key={p.id} value={p.id}>
								{p.profileName}
							</TabsTrigger>
						))}
					</TabsList>
					{voiceProfiles.map((p) => (
						<TabsContent key={p.id} value={p.id}>
							<Card>
								<CardContent className="pt-6">
									<ProfileSummary
										profile={p}
										onUpdate={(updates) => updateProfile(p.id, updates)}
									/>
									<Separator className="my-6" />
									<Button
										variant="outline"
										onClick={() => {
											setShowWizard(true);
										}}
									>
										Add more content
									</Button>
								</CardContent>
							</Card>
						</TabsContent>
					))}
				</Tabs>
			) : (
				activeProfile && (
					<Card>
						<CardHeader>
							<CardTitle>{activeProfile.profileName}</CardTitle>
							<CardDescription>
								Your active voice profile · v{activeProfile.version}
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-6">
							<ProfileSummary
								profile={activeProfile}
								onUpdate={(updates) => updateProfile(activeProfile.id, updates)}
							/>
							<Separator />
							<Button variant="outline" onClick={() => setShowWizard(true)}>
								Add more content
							</Button>
						</CardContent>
					</Card>
				)
			)}
		</div>
	);
}
