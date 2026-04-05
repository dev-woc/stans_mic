"use client";

import { FileText, Loader2, Mic, Type, Youtube } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { DistillationSession } from "@/types";

const INPUT_TYPE_ICONS: Record<string, React.ReactNode> = {
	text: <Type className="h-4 w-4" />,
	youtube: <Youtube className="h-4 w-4" />,
	tiktok: <Mic className="h-4 w-4" />,
	audio: <Mic className="h-4 w-4" />,
	video: <FileText className="h-4 w-4" />,
};

const STATUS_BADGE: Record<string, string> = {
	complete: "bg-green-500/10 text-green-700 border-green-500/20",
	processing: "bg-blue-500/10 text-blue-700 border-blue-500/20",
	pending: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
	failed: "bg-red-500/10 text-red-700 border-red-500/20",
};

export default function HistoryPage() {
	const [sessions, setSessions] = useState<DistillationSession[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const fetchSessions = useCallback(async () => {
		setIsLoading(true);
		try {
			const res = await fetch("/api/sessions");
			if (!res.ok) throw new Error("Failed to fetch sessions");
			const data = await res.json();
			setSessions(data.sessions ?? []);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load history");
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchSessions();
	}, [fetchSessions]);

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

	return (
		<div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold">History</h1>
					<p className="text-muted-foreground text-sm">Your past distillations</p>
				</div>
				<Button asChild>
					<Link href="/distill">New distillation</Link>
				</Button>
			</div>

			{sessions.length === 0 ? (
				<div className="flex flex-col items-center justify-center py-20 gap-4">
					<p className="text-muted-foreground">No distillations yet.</p>
					<Button asChild>
						<Link href="/distill">Start your first one</Link>
					</Button>
				</div>
			) : (
				<div className="space-y-3">
					{sessions.map((session) => (
						<Card key={session.id} className="hover:bg-muted/30 transition-colors">
							<CardContent className="pt-4 pb-4">
								<div className="flex items-center justify-between gap-4">
									<div className="flex items-center gap-3 min-w-0">
										<span className="text-muted-foreground shrink-0">
											{INPUT_TYPE_ICONS[session.inputType] ?? <FileText className="h-4 w-4" />}
										</span>
										<div className="min-w-0">
											<p className="text-sm font-medium truncate">
												{session.inputText
													? session.inputText.slice(0, 80).replace(/\n/g, " ") +
														(session.inputText.length > 80 ? "…" : "")
													: (session.inputUrl ?? "Session")}
											</p>
											<p className="text-xs text-muted-foreground">
												{new Date(session.createdAt).toLocaleDateString("en-US", {
													month: "short",
													day: "numeric",
													year: "numeric",
												})}
											</p>
										</div>
									</div>
									<div className="flex items-center gap-2 shrink-0">
										<Badge
											variant="outline"
											className={`capitalize text-xs ${STATUS_BADGE[session.status] ?? ""}`}
										>
											{session.status}
										</Badge>
										{session.status === "complete" && (
											<Button variant="outline" size="sm" asChild>
												<Link href={`/output/${session.id}`}>View</Link>
											</Button>
										)}
									</div>
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			)}
		</div>
	);
}
