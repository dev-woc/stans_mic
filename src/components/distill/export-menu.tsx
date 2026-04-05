"use client";

import { Copy, FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ExportMenuProps {
	script: string;
	children?: React.ReactNode;
}

export function ExportMenu({ script, children }: ExportMenuProps) {
	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(script);
			toast.success("Copied to clipboard!");
		} catch {
			toast.error("Failed to copy. Please select and copy manually.");
		}
	};

	const handlePrint = () => {
		// Print-optimized: open a print-ready window
		const printWindow = window.open("", "_blank");
		if (!printWindow) return;

		printWindow.document.write(`
			<!DOCTYPE html>
			<html>
				<head>
					<title>Distill Script</title>
					<style>
						body { font-family: Georgia, serif; max-width: 680px; margin: 40px auto; line-height: 1.8; font-size: 16px; color: #111; }
						.marker { background: #f3f4f6; border-radius: 4px; padding: 1px 6px; font-size: 12px; font-family: monospace; margin-right: 4px; }
						@media print { body { margin: 20px; } }
					</style>
				</head>
				<body>
					<pre style="white-space: pre-wrap; font-family: inherit;">${script.replace(/\[(\d+:\d+)\]/g, '<span class="marker">[$1]</span>')}</pre>
				</body>
			</html>
		`);
		printWindow.document.close();
		printWindow.print();
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				{children ?? <Button variant="outline">Export</Button>}
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuItem onClick={handleCopy} className="gap-2">
					<Copy className="h-4 w-4" />
					Copy to clipboard
				</DropdownMenuItem>
				<DropdownMenuItem onClick={handlePrint} className="gap-2">
					<FileText className="h-4 w-4" />
					Download PDF
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
