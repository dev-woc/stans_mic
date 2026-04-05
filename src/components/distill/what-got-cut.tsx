"use client";

import { ChevronDown, ChevronUp, Scissors } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { CutIdea } from "@/types";

interface WhatGotCutProps {
	cutIdeas: CutIdea[];
}

export function WhatGotCut({ cutIdeas }: WhatGotCutProps) {
	const [isOpen, setIsOpen] = useState(false);

	if (cutIdeas.length === 0) return null;

	return (
		<div className="border rounded-lg overflow-hidden">
			<button
				type="button"
				className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors"
				onClick={() => setIsOpen((p) => !p)}
			>
				<div className="flex items-center gap-2">
					<Scissors className="h-4 w-4 text-muted-foreground" />
					<span className="text-sm font-medium">
						What got cut ({cutIdeas.length} idea{cutIdeas.length !== 1 ? "s" : ""})
					</span>
				</div>
				{isOpen ? (
					<ChevronUp className="h-4 w-4 text-muted-foreground" />
				) : (
					<ChevronDown className="h-4 w-4 text-muted-foreground" />
				)}
			</button>

			{isOpen && (
				<div className="divide-y">
					{cutIdeas.map((idea) => (
						<div
							key={idea.idea.slice(0, 40)}
							className="flex items-start justify-between gap-4 px-4 py-3"
						>
							<div className="flex-1 space-y-0.5">
								<p className="text-sm">{idea.idea}</p>
								<p className="text-xs text-muted-foreground">{idea.reason}</p>
							</div>
							<Button
								variant="ghost"
								size="sm"
								className="shrink-0 text-xs"
								onClick={() => toast.info("Reinstate is coming in the next release.")}
							>
								Reinstate
							</Button>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
