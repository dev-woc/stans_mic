"use client";

import { CheckCircle2, Loader2, Mic, Scissors, Sparkles, Zap } from "lucide-react";
import type { AgentStep, PipelineProgress as PipelineProgressType } from "@/types";

interface PipelineProgressProps {
	progress: PipelineProgressType | null;
}

const STEPS: {
	key: AgentStep | "start";
	label: string;
	sublabel: string;
	icon: React.ReactNode;
}[] = [
	{
		key: "ingestion",
		label: "Ingesting",
		sublabel: "Extracting your ideas",
		icon: <Zap className="h-5 w-5" />,
	},
	{
		key: "compression",
		label: "Compressing",
		sublabel: "Building 3-min structure",
		icon: <Scissors className="h-5 w-5" />,
	},
	{
		key: "calibration",
		label: "Calibrating",
		sublabel: "Applying your voice",
		icon: <Mic className="h-5 w-5" />,
	},
	{
		key: "done",
		label: "Done",
		sublabel: "Script ready",
		icon: <Sparkles className="h-5 w-5" />,
	},
];

const STEP_ORDER: (AgentStep | null)[] = ["ingestion", "compression", "calibration", "done"];

function getStepIndex(step: AgentStep | null): number {
	if (!step) return -1;
	return STEP_ORDER.indexOf(step);
}

export function PipelineProgress({ progress }: PipelineProgressProps) {
	const currentIndex = getStepIndex(progress?.agentStep ?? null);

	return (
		<div className="flex flex-col items-center gap-8 py-12">
			<div className="text-center space-y-2">
				<p className="text-lg font-medium text-foreground">
					{progress?.stepLabel ?? "Starting pipeline..."}
				</p>
				<p className="text-sm text-muted-foreground">This usually takes under 90 seconds</p>
			</div>

			<div className="flex items-center gap-2">
				{STEPS.map((step, index) => {
					const isComplete = currentIndex > index;
					const isActive = currentIndex === index;
					const _isPending = currentIndex < index;

					return (
						<div key={step.key} className="flex items-center gap-2">
							<div className="flex flex-col items-center gap-2">
								<div
									className={`flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all ${
										isComplete
											? "border-primary bg-primary text-primary-foreground"
											: isActive
												? "border-primary bg-primary/10 text-primary"
												: "border-muted bg-muted/30 text-muted-foreground"
									}`}
								>
									{isComplete ? (
										<CheckCircle2 className="h-5 w-5" />
									) : isActive ? (
										<Loader2 className="h-5 w-5 animate-spin" />
									) : (
										step.icon
									)}
								</div>
								<div className="text-center">
									<p
										className={`text-xs font-medium ${
											isActive
												? "text-primary"
												: isComplete
													? "text-foreground"
													: "text-muted-foreground"
										}`}
									>
										{step.label}
									</p>
									<p className="text-xs text-muted-foreground hidden sm:block">{step.sublabel}</p>
								</div>
							</div>

							{index < STEPS.length - 1 && (
								<div
									className={`h-0.5 w-8 sm:w-16 transition-all ${
										currentIndex > index ? "bg-primary" : "bg-muted"
									}`}
								/>
							)}
						</div>
					);
				})}
			</div>

			{/* Progress bar */}
			<div className="w-full max-w-sm">
				<div className="h-1.5 rounded-full bg-muted overflow-hidden">
					<div
						className="h-full bg-primary rounded-full transition-all duration-500"
						style={{ width: `${progress?.percentComplete ?? 5}%` }}
					/>
				</div>
			</div>
		</div>
	);
}
