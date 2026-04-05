"use client";

import { CheckCircle2, Loader2, Plus, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ContentType } from "@/types";

interface ContentItem {
	id: string;
	url: string;
	sourceType: "youtube" | "tiktok";
	borrowTags: string[];
	status: "idle" | "queued" | "processing" | "complete" | "failed";
}

interface ContentUploaderProps {
	voiceProfileId: string;
	contentType: ContentType;
	onItemAdded?: (contentId: string) => void;
}

const BORROW_TAGS = ["energy", "structure", "humor", "directness", "pacing", "vocabulary"] as const;

function detectSourceType(url: string): "youtube" | "tiktok" | null {
	if (url.includes("youtube.com") || url.includes("youtu.be")) return "youtube";
	if (url.includes("tiktok.com")) return "tiktok";
	return null;
}

export function ContentUploader({
	voiceProfileId,
	contentType,
	onItemAdded,
}: ContentUploaderProps) {
	const [items, setItems] = useState<ContentItem[]>([]);
	const [urlInput, setUrlInput] = useState("");
	const [selectedTags, setSelectedTags] = useState<string[]>([]);

	const handleAdd = async () => {
		const sourceType = detectSourceType(urlInput);
		if (!sourceType) {
			toast.error("Please enter a valid YouTube or TikTok URL.");
			return;
		}

		const tempId = crypto.randomUUID();
		const newItem: ContentItem = {
			id: tempId,
			url: urlInput,
			sourceType,
			borrowTags: contentType === "reference" ? selectedTags : [],
			status: "queued",
		};

		setItems((prev) => [...prev, newItem]);
		setUrlInput("");
		setSelectedTags([]);

		try {
			const res = await fetch("/api/ingest", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					voiceProfileId,
					contentType,
					sourceType,
					sourceUrl: urlInput,
					borrowTags: newItem.borrowTags,
				}),
			});

			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error ?? "Failed to queue content");
			}

			const data = await res.json();
			const contentId = data.content.id;

			setItems((prev) =>
				prev.map((item) =>
					item.id === tempId ? { ...item, id: contentId, status: "processing" } : item,
				),
			);

			onItemAdded?.(contentId);
			toast.success("Content queued for processing.");

			// Poll for completion
			const pollInterval = setInterval(async () => {
				const statusRes = await fetch(`/api/ingest/status/${contentId}`);
				if (statusRes.ok) {
					const statusData = await statusRes.json();
					if (statusData.status === "complete") {
						setItems((prev) =>
							prev.map((item) => (item.id === contentId ? { ...item, status: "complete" } : item)),
						);
						clearInterval(pollInterval);
					} else if (statusData.status === "failed") {
						setItems((prev) =>
							prev.map((item) => (item.id === contentId ? { ...item, status: "failed" } : item)),
						);
						clearInterval(pollInterval);
					}
				}
			}, 3000);
		} catch (err) {
			setItems((prev) =>
				prev.map((item) => (item.id === tempId ? { ...item, status: "failed" } : item)),
			);
			toast.error(err instanceof Error ? err.message : "Failed to add content");
		}
	};

	return (
		<div className="space-y-4">
			<div className="flex gap-2">
				<Input
					type="url"
					placeholder={
						contentType === "own"
							? "YouTube or TikTok URL of your own content"
							: "YouTube or TikTok URL of a reference creator"
					}
					value={urlInput}
					onChange={(e) => setUrlInput(e.target.value)}
					onKeyDown={(e) => e.key === "Enter" && handleAdd()}
					className="flex-1"
				/>
				<Button onClick={handleAdd} disabled={!urlInput}>
					<Plus className="h-4 w-4" />
				</Button>
			</div>

			{contentType === "reference" && (
				<div className="space-y-2">
					<Label className="text-xs text-muted-foreground">What do you want to borrow?</Label>
					<div className="flex flex-wrap gap-2">
						{BORROW_TAGS.map((tag) => (
							<Badge
								key={tag}
								variant={selectedTags.includes(tag) ? "default" : "outline"}
								className="cursor-pointer capitalize"
								onClick={() =>
									setSelectedTags((prev) =>
										prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
									)
								}
							>
								{tag}
							</Badge>
						))}
					</div>
				</div>
			)}

			{items.length > 0 && (
				<div className="space-y-2">
					{items.map((item) => (
						<div key={item.id} className="flex items-center gap-3 p-3 border rounded-lg text-sm">
							{item.status === "complete" && (
								<CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
							)}
							{item.status === "failed" && (
								<XCircle className="h-4 w-4 text-destructive shrink-0" />
							)}
							{(item.status === "queued" || item.status === "processing") && (
								<Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
							)}
							<span className="flex-1 truncate text-muted-foreground">{item.url}</span>
							<Badge variant="outline" className="capitalize shrink-0">
								{item.status}
							</Badge>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
