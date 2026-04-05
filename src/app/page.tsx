import { Mic } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
	return (
		<div className="flex min-h-screen flex-col items-center justify-center px-4">
			<div className="flex flex-col items-center gap-6 text-center max-w-md">
				<div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
					<Mic className="h-8 w-8" />
				</div>

				<div className="space-y-2">
					<h1 className="text-4xl font-bold tracking-tight">Distill</h1>
					<p className="text-lg text-muted-foreground">
						Turn your raw ideas into a 3-minute script in your own voice. Drop a voice memo, video,
						or notes — get a tight brief ready to film.
					</p>
				</div>

				<div className="flex flex-col gap-3 w-full sm:flex-row sm:justify-center">
					<Button asChild size="lg" className="w-full sm:w-auto">
						<Link href="/signup">Get Started</Link>
					</Button>
					<Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
						<Link href="/login">Sign In</Link>
					</Button>
				</div>
			</div>
		</div>
	);
}
