"use client";

import { Loader2, Mic, Type, Youtube } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { InputType } from "@/types";

interface InputPanelProps {
	onSubmit: (params: {
		inputType: InputType;
		inputText?: string;
		inputUrl?: string;
		userIntent?: string;
	}) => Promise<void>;
	isSubmitting?: boolean;
}

export function InputPanel({ onSubmit, isSubmitting = false }: InputPanelProps) {
	const [activeTab, setActiveTab] = useState<"text" | "youtube" | "tiktok">("text");
	const [text, setText] = useState("");
	const [url, setUrl] = useState("");
	const [userIntent, setUserIntent] = useState("");

	const isValid = (() => {
		if (activeTab === "text") return text.length >= 10;
		if (activeTab === "youtube" || activeTab === "tiktok") {
			try {
				new URL(url);
				return url.length > 0;
			} catch {
				return false;
			}
		}
		return false;
	})();

	const handleSubmit = async () => {
		if (!isValid || isSubmitting) return;
		if (activeTab === "text") {
			await onSubmit({ inputType: "text", inputText: text, userIntent: userIntent || undefined });
		} else {
			await onSubmit({
				inputType: activeTab as InputType,
				inputUrl: url,
				userIntent: userIntent || undefined,
			});
		}
	};

	return (
		<div className="flex flex-col gap-6 w-full max-w-2xl mx-auto">
			<Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
				<TabsList className="w-full">
					<TabsTrigger value="text" className="flex-1 gap-2">
						<Type className="h-4 w-4" />
						Text / Notes
					</TabsTrigger>
					<TabsTrigger value="youtube" className="flex-1 gap-2">
						<Youtube className="h-4 w-4" />
						YouTube
					</TabsTrigger>
					<TabsTrigger value="tiktok" className="flex-1 gap-2">
						<Mic className="h-4 w-4" />
						TikTok
					</TabsTrigger>
				</TabsList>

				<TabsContent value="text" className="space-y-3 mt-4">
					<div className="space-y-2">
						<Label htmlFor="raw-text">Your raw ideas</Label>
						<Textarea
							id="raw-text"
							placeholder="Dump everything here. A voice memo transcript, scattered bullet points, a half-finished script, a rant — anything. Don't clean it up."
							value={text}
							onChange={(e) => setText(e.target.value)}
							className="min-h-[240px] resize-none"
						/>
						<p className="text-xs text-muted-foreground text-right">
							{text.length} characters
							{text.length < 10 && text.length > 0 && (
								<span className="text-destructive ml-1">— needs at least 10 characters</span>
							)}
						</p>
					</div>
				</TabsContent>

				<TabsContent value="youtube" className="space-y-3 mt-4">
					<div className="space-y-2">
						<Label htmlFor="yt-url">YouTube URL</Label>
						<Input
							id="yt-url"
							type="url"
							placeholder="https://youtube.com/watch?v=..."
							value={url}
							onChange={(e) => setUrl(e.target.value)}
						/>
						<p className="text-xs text-muted-foreground">
							Paste a YouTube video URL. Distill will extract and transcribe the audio.
						</p>
					</div>
				</TabsContent>

				<TabsContent value="tiktok" className="space-y-3 mt-4">
					<div className="space-y-2">
						<Label htmlFor="tt-url">TikTok URL</Label>
						<Input
							id="tt-url"
							type="url"
							placeholder="https://tiktok.com/@user/video/..."
							value={url}
							onChange={(e) => setUrl(e.target.value)}
						/>
						<p className="text-xs text-muted-foreground">
							Paste a TikTok video URL. Distill will extract and transcribe the audio.
						</p>
					</div>
				</TabsContent>
			</Tabs>

			{/* Optional intent */}
			<div className="space-y-2">
				<Label htmlFor="intent" className="text-sm text-muted-foreground">
					What's this for? <span className="font-normal">(optional)</span>
				</Label>
				<Input
					id="intent"
					placeholder="e.g. YouTube intro, standalone take, response to a trend..."
					value={userIntent}
					onChange={(e) => setUserIntent(e.target.value)}
					maxLength={200}
				/>
			</div>

			<Button
				size="lg"
				className="w-full text-base"
				disabled={!isValid || isSubmitting}
				onClick={handleSubmit}
			>
				{isSubmitting ? (
					<>
						<Loader2 className="mr-2 h-5 w-5 animate-spin" />
						Distilling...
					</>
				) : (
					"Distill It"
				)}
			</Button>
		</div>
	);
}
