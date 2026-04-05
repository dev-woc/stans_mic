"use client";

import { AlertCircle, ArrowLeft, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useState } from "react";
import { AltOpeners } from "@/components/distill/alt-openers";
import { ExportMenu } from "@/components/distill/export-menu";
import { FeedbackBar } from "@/components/distill/feedback-bar";
import { OutputViewer } from "@/components/distill/output-viewer";
import { PipelineProgress } from "@/components/distill/pipeline-progress";
import { WhatGotCut } from "@/components/distill/what-got-cut";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useSession } from "@/hooks/use-session";
import type { CutIdea } from "@/types";

export default function OutputPage({ params }: { params: Promise<{ sessionId: string }> }) {
	const { sessionId } = use(params);
	const router = useRouter();

	const { session, output, progress, error, submitFeedback } = useSession(sessionId);
	const [isEditing, setIsEditing] = useState(false);
	const [editedScript, setEditedScript] = useState("");

	// Derive current script (swapped opener applies locally)
	const [currentScript, setCurrentScript] = useState<string | null>(null);
	const displayScript = currentScript ?? output?.finalScript ?? "";

	const handleAccept = async () => {
		if (isEditing && editedScript) {
			await submitFeedback("edit", editedScript);
		} else {
			await submitFeedback("accept");
		}
	};

	const handleReject = async (reason: string) => {
		await submitFeedback("reject", undefined, reason);
		router.push("/distill");
	};

	const handleSwapOpener = (opener: string) => {
		if (!output) return;
		// Replace the content from [0:00] up to the first [0:20] or first section break
		const script = output.finalScript;
		const firstMarkerMatch = script.match(/\[0:[12][0-9]\]/);
		if (firstMarkerMatch?.index) {
			setCurrentScript(`${opener}\n\n${script.slice(firstMarkerMatch.index)}`);
		} else {
			setCurrentScript(opener);
		}
	};

	// --- Loading / error states ---
	if (error) {
		return (
			<div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4">
				<AlertCircle className="h-12 w-12 text-destructive" />
				<div className="text-center space-y-2">
					<p className="font-medium">Something went wrong</p>
					<p className="text-sm text-muted-foreground">{error}</p>
				</div>
				<Button asChild>
					<Link href="/distill">
						<RotateCcw className="mr-2 h-4 w-4" />
						Try again
					</Link>
				</Button>
			</div>
		);
	}

	if (!session || session.status === "pending" || session.status === "processing") {
		return (
			<div className="mx-auto max-w-3xl px-4 py-12">
				<PipelineProgress progress={progress} />
			</div>
		);
	}

	if (!output) {
		return (
			<div className="flex min-h-[60vh] items-center justify-center">
				<p className="text-muted-foreground">No output found for this session.</p>
			</div>
		);
	}

	const cutIdeas = (output.whatGotCut ?? []) as CutIdea[];
	const altOpeners = (output.altOpeners ?? []) as string[];

	return (
		<div className="mx-auto max-w-3xl px-4 py-8 pb-28 space-y-8">
			{/* Back nav */}
			<div className="flex items-center justify-between">
				<Button variant="ghost" size="sm" asChild>
					<Link href="/distill">
						<ArrowLeft className="mr-2 h-4 w-4" />
						New distillation
					</Link>
				</Button>
				<ExportMenu script={displayScript}>
					<Button variant="outline" size="sm">
						Export
					</Button>
				</ExportMenu>
			</div>

			{/* Output */}
			<OutputViewer
				output={{ ...output, finalScript: displayScript }}
				isEditing={isEditing}
				onEditChange={setEditedScript}
			/>

			{/* Alt openers */}
			{altOpeners.length > 0 && (
				<>
					<Separator />
					<AltOpeners altOpeners={altOpeners} onSwap={handleSwapOpener} />
				</>
			)}

			{/* What got cut */}
			{cutIdeas.length > 0 && (
				<>
					<Separator />
					<WhatGotCut cutIdeas={cutIdeas} />
				</>
			)}

			{/* Feedback bar — fixed bottom */}
			<FeedbackBar
				isEditing={isEditing}
				onAccept={handleAccept}
				onEdit={() => {
					setEditedScript(displayScript);
					setIsEditing(true);
				}}
				onReject={handleReject}
			/>
		</div>
	);
}
