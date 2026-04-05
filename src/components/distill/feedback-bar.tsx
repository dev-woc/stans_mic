"use client";

import { Check, Edit2, RotateCcw } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

interface FeedbackBarProps {
	isEditing: boolean;
	onAccept: () => void;
	onEdit: () => void;
	onReject: (reason: string) => void;
}

const REJECTION_REASONS = [
	{ value: "too_formal", label: "Too formal" },
	{ value: "too_casual", label: "Too casual" },
	{ value: "wrong_energy", label: "Wrong energy" },
	{ value: "wrong_structure", label: "Wrong structure" },
	{ value: "missed_point", label: "Missed the point" },
	{ value: "other", label: "Other" },
] as const;

export function FeedbackBar({ isEditing, onAccept, onEdit, onReject }: FeedbackBarProps) {
	const [showRejectDialog, setShowRejectDialog] = useState(false);

	return (
		<>
			<div className="fixed bottom-0 left-0 right-0 border-t bg-card/95 backdrop-blur-sm p-4 z-50">
				<div className="mx-auto max-w-7xl flex items-center justify-center gap-3">
					<Button size="lg" className="flex-1 max-w-xs" onClick={onAccept}>
						<Check className="mr-2 h-5 w-5" />
						{isEditing ? "Save & Export" : "Looks Good — Export"}
					</Button>

					{!isEditing && (
						<Button variant="outline" size="lg" className="flex-1 max-w-xs" onClick={onEdit}>
							<Edit2 className="mr-2 h-5 w-5" />
							Edit & Export
						</Button>
					)}

					<Button
						variant="ghost"
						size="lg"
						className="text-muted-foreground"
						onClick={() => setShowRejectDialog(true)}
					>
						<RotateCcw className="mr-2 h-5 w-5" />
						Start Over
					</Button>
				</div>
			</div>

			<Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>What was wrong with this draft?</DialogTitle>
						<DialogDescription>
							Your feedback helps Distill learn your voice better over time.
						</DialogDescription>
					</DialogHeader>
					<div className="grid grid-cols-2 gap-2 pt-2">
						{REJECTION_REASONS.map((reason) => (
							<Button
								key={reason.value}
								variant="outline"
								className="h-auto py-3 text-left justify-start"
								onClick={() => {
									onReject(reason.value);
									setShowRejectDialog(false);
								}}
							>
								{reason.label}
							</Button>
						))}
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
