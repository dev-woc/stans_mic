"use client";

import { RefreshCw, Shuffle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface AltOpenersProps {
	altOpeners: string[];
	onSwap: (opener: string) => void;
}

export function AltOpeners({ altOpeners, onSwap }: AltOpenersProps) {
	const [_expanded, _setExpanded] = useState<number | null>(null);

	if (altOpeners.length === 0) return null;

	return (
		<div className="space-y-3">
			<div className="flex items-center gap-2">
				<Shuffle className="h-4 w-4 text-muted-foreground" />
				<span className="text-sm font-medium text-muted-foreground">
					{altOpeners.length} alternate opener{altOpeners.length !== 1 ? "s" : ""}
				</span>
			</div>

			<div className="space-y-2">
				{altOpeners.map((opener) => (
					<div key={opener.slice(0, 40)} className="border rounded-lg p-4 space-y-3">
						<p className="text-sm text-muted-foreground line-clamp-2">{opener}</p>
						<div className="flex gap-2">
							<Button
								variant="outline"
								size="sm"
								className="flex-1"
								onClick={() => {
									onSwap(opener);
									toast.success("Opener swapped in.");
								}}
							>
								Use This Hook
							</Button>
						</div>
					</div>
				))}

				<Button
					variant="ghost"
					size="sm"
					className="w-full text-muted-foreground"
					onClick={() => toast.info("Request another opener is coming in the next release.")}
				>
					<RefreshCw className="mr-2 h-4 w-4" />
					Request Another
				</Button>
			</div>
		</div>
	);
}
