"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type { VoiceProfile } from "@/types";

interface ProfileSummaryProps {
	profile: VoiceProfile;
	onUpdate: (updates: Partial<VoiceProfile>) => Promise<void>;
}

export function ProfileSummary({ profile, onUpdate }: ProfileSummaryProps) {
	const [isEditing, setIsEditing] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [edits, setEdits] = useState<Partial<VoiceProfile>>({});

	const confidencePercent = Math.round((profile.confidenceScore ?? 0) * 100);
	const isLowConfidence = (profile.confidenceScore ?? 0) < 0.4;
	const ownContentCount = profile.ownContentCount ?? 0;

	const handleSave = async () => {
		setIsSaving(true);
		try {
			await onUpdate(edits);
			setIsEditing(false);
			setEdits({});
			toast.success("Voice profile updated.");
		} catch {
			toast.error("Failed to update profile.");
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<div className="space-y-6">
			{/* Confidence indicator */}
			<div
				className={`flex items-start gap-3 p-4 rounded-lg border ${isLowConfidence ? "border-yellow-500/30 bg-yellow-500/5" : "border-green-500/30 bg-green-500/5"}`}
			>
				{isLowConfidence ? (
					<AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
				) : (
					<CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
				)}
				<div className="space-y-1">
					<p className="text-sm font-medium">
						{isLowConfidence ? "Low confidence profile" : `${confidencePercent}% confidence`}
					</p>
					<p className="text-xs text-muted-foreground">
						{isLowConfidence
							? `${ownContentCount} of 3+ own content pieces added. Add more to improve accuracy.`
							: `Based on ${ownContentCount} piece${ownContentCount !== 1 ? "s" : ""} of your own content.`}
					</p>
				</div>
			</div>

			{/* Plain summary */}
			{profile.plainSummary && (
				<div className="p-4 bg-muted/30 rounded-lg">
					<p className="text-sm leading-relaxed">{profile.plainSummary}</p>
				</div>
			)}

			<Separator />

			{/* Attribute grid */}
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<AttributeRow
					label="Vocabulary"
					value={isEditing ? undefined : profile.vocabularyLevel}
					editElement={
						isEditing ? (
							<Select
								value={(edits.vocabularyLevel ?? profile.vocabularyLevel) as string}
								onValueChange={(v) => setEdits((p) => ({ ...p, vocabularyLevel: v }))}
							>
								<SelectTrigger className="h-8">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{["simple", "conversational", "technical", "mixed"].map((v) => (
										<SelectItem key={v} value={v} className="capitalize">
											{v}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						) : null
					}
				/>
				<AttributeRow
					label="Sentence rhythm"
					value={isEditing ? undefined : profile.sentenceRhythm}
					editElement={
						isEditing ? (
							<Select
								value={(edits.sentenceRhythm ?? profile.sentenceRhythm) as string}
								onValueChange={(v) => setEdits((p) => ({ ...p, sentenceRhythm: v }))}
							>
								<SelectTrigger className="h-8">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{["punchy", "flowing", "mixed"].map((v) => (
										<SelectItem key={v} value={v} className="capitalize">
											{v}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						) : null
					}
				/>
				<AttributeRow
					label="Energy"
					value={isEditing ? undefined : profile.energySignature}
					editElement={
						isEditing ? (
							<Select
								value={(edits.energySignature ?? profile.energySignature) as string}
								onValueChange={(v) => setEdits((p) => ({ ...p, energySignature: v }))}
							>
								<SelectTrigger className="h-8">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{["high", "calm", "builds", "deadpan"].map((v) => (
										<SelectItem key={v} value={v} className="capitalize">
											{v}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						) : null
					}
				/>
				<AttributeRow
					label="Pacing"
					value={isEditing ? undefined : `${profile.pacingWpm} wpm`}
					editElement={
						isEditing ? (
							<Input
								type="number"
								className="h-8"
								min={60}
								max={250}
								value={String(edits.pacingWpm ?? profile.pacingWpm)}
								onChange={(e) => setEdits((p) => ({ ...p, pacingWpm: Number(e.target.value) }))}
							/>
						) : null
					}
				/>
				{profile.openerPattern && (
					<AttributeRow label="Opener style" value={profile.openerPattern} />
				)}
				{profile.closerPattern && (
					<AttributeRow label="Closer style" value={profile.closerPattern} />
				)}
			</div>

			{/* Edit controls */}
			<div className="flex gap-2">
				{isEditing ? (
					<>
						<Button size="sm" onClick={handleSave} disabled={isSaving}>
							{isSaving ? "Saving..." : "Save overrides"}
						</Button>
						<Button
							size="sm"
							variant="ghost"
							onClick={() => {
								setIsEditing(false);
								setEdits({});
							}}
						>
							Cancel
						</Button>
					</>
				) : (
					<Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
						Edit attributes
					</Button>
				)}
			</div>
		</div>
	);
}

function AttributeRow({
	label,
	value,
	editElement,
}: {
	label: string;
	value?: string | null;
	editElement?: React.ReactNode;
}) {
	return (
		<div className="space-y-1">
			<Label className="text-xs text-muted-foreground">{label}</Label>
			{editElement ?? (
				<Badge variant="outline" className="capitalize font-normal">
					{value ?? "—"}
				</Badge>
			)}
		</div>
	);
}
