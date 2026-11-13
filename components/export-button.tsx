"use client";

import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { QueueItem } from "@/lib/queue";
import { useReviews } from "@/lib/review-store";

function download(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

const csvCell = (value: string) => `"${value.replace(/"/g, '""')}"`;

export function ExportButton({ calls }: { calls: QueueItem[] }) {
  const { reviews } = useReviews();

  function handleExport() {
    const exportedAt = new Date().toISOString();
    const rows = calls.map((call) => {
      const review = reviews[call.id];
      const findings = [...call.findings, ...(review?.manualFindings ?? [])].map((finding) => ({
        ...finding,
        decision: review?.decisions[finding.id] ?? (finding.source === "reviewer" ? "confirmed" : "pending"),
      }));
      return {
        callId: call.id,
        verdict: review?.verdict ?? null,
        suggestedVerdict: call.suggestedVerdict,
        note: review?.note ?? "",
        reviewedAt: review?.updatedAt ?? null,
        findings,
      };
    });
    download(`qa-review-${exportedAt.slice(0, 10)}.json`, JSON.stringify({ exportedAt, calls: rows }, null, 2), "application/json");

    const header = ["call_id", "verdict", "finding_id", "decision", "source", "severity", "certainty", "type", "rule", "summary_excerpt", "turn_ids", "explanation"];
    const lines = rows.flatMap((row) =>
      row.findings
        .filter((finding) => finding.decision === "confirmed")
        .map((finding) =>
          [row.callId, row.verdict ?? "", finding.id, finding.decision, finding.source, finding.severity, finding.certainty, finding.type, finding.rule, finding.summaryExcerpt ?? "", finding.turnIds.join(" "), finding.explanation]
            .map(csvCell)
            .join(","),
        ),
    );
    download(`qa-confirmed-findings-${exportedAt.slice(0, 10)}.csv`, [header.join(","), ...lines].join("\n"), "text/csv");
    toast.success("Review exported", { description: "Downloaded the full review (JSON) and confirmed findings (CSV)." });
  }

  return (
    <Button variant="outline" onClick={handleExport}>
      <Download data-icon="inline-start" />
      Export review
    </Button>
  );
}
