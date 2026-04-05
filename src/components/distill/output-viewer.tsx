"use client";

import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import type { DistillationOutput } from "@/types";

interface OutputViewerProps {
	output: DistillationOutput;
	isEditing: boolean;
	onEditChange: (content: string) => void;
}

export function OutputViewer({ output, isEditing, onEditChange }: OutputViewerProps) {
	const score = output.voiceMatchScore ?? 0;
	const scorePercent = Math.round(score * 100);

	const scoreColor =
		score >= 0.8
			? "bg-green-500/15 text-green-700 border-green-500/30"
			: score >= 0.7
				? "bg-yellow-500/15 text-yellow-700 border-yellow-500/30"
				: "bg-red-500/15 text-red-700 border-red-500/30";

	// Parse script to highlight timing markers
	const renderScript = (script: string) => {
		const parts = script.split(/(\[\d+:\d+\][^[]*)/g);
		return parts.map((part) => {
			const markerMatch = part.match(/^\[(\d+:\d+)\](.*)/s);
			if (markerMatch) {
				return (
					<span key={`marker-${markerMatch[1]}`}>
						<Badge variant="outline" className="font-mono text-xs mr-1 py-0">
							{markerMatch[1]}
						</Badge>
						{markerMatch[2]}
					</span>
				);
			}
			return <span key={`text-${part.slice(0, 30)}`}>{part}</span>;
		});
	};

	if (isEditing) {
		return (
			<div className="space-y-3">
				<div className="flex items-center justify-between">
					<p className="text-sm text-muted-foreground">Edit your script</p>
					<Badge variant="outline" className={scoreColor}>
						{scorePercent}% voice match
					</Badge>
				</div>
				<Textarea
					defaultValue={output.finalScript}
					onChange={(e) => onEditChange(e.target.value)}
					className="min-h-[400px] font-mono text-sm leading-relaxed"
				/>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<span className="text-sm text-muted-foreground">
						~{output.wordCount} words · {Math.floor((output.estimatedRuntimeSeconds ?? 180) / 60)}:
						{String((output.estimatedRuntimeSeconds ?? 180) % 60).padStart(2, "0")} min
					</span>
				</div>
				<Badge variant="outline" className={scoreColor}>
					{scorePercent}% voice match
					{score < 0.7 && " · calibrate profile"}
				</Badge>
			</div>

			<div className="bg-card border rounded-lg p-6">
				<p className="text-base leading-relaxed whitespace-pre-wrap">
					{renderScript(output.finalScript)}
				</p>
			</div>
		</div>
	);
}
