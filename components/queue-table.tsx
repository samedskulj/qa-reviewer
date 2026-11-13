"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleCheck, CircleDashed, CircleDot } from "lucide-react";
import { SeverityBadge, VerdictBadge } from "@/components/finding-badges";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { countBySeverity, type QueueItem } from "@/lib/queue";
import { reviewStatus, useReviews, type ReviewStatus } from "@/lib/review-store";
import { cn } from "@/lib/utils";

const STATUS: Record<ReviewStatus, { label: string; icon: typeof CircleCheck; className: string }> = {
  not_started: { label: "Not started", icon: CircleDashed, className: "text-muted-foreground" },
  in_progress: { label: "In progress", icon: CircleDot, className: "text-primary" },
  reviewed: { label: "Reviewed", icon: CircleCheck, className: "text-success" },
};

/** Calls with material suggestions first, so reviewers see the riskiest summaries first. */
function byRisk(a: QueueItem, b: QueueItem) {
  const ca = countBySeverity(a.findings);
  const cb = countBySeverity(b.findings);
  return cb.material - ca.material || cb.minor - ca.minor || a.id.localeCompare(b.id);
}

export function QueueTable({ calls }: { calls: QueueItem[] }) {
  const router = useRouter();
  const { reviews } = useReviews();
  const sorted = [...calls].sort(byRisk);
  const reviewedCount = calls.filter((call) => reviewStatus(reviews[call.id]) === "reviewed").length;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        {reviewedCount} of {calls.length} reviewed · sorted by suggested risk
      </p>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">Call</TableHead>
              <TableHead className="hidden md:table-cell">Summary</TableHead>
              <TableHead className="w-36">Suggested issues</TableHead>
              <TableHead className="hidden w-28 sm:table-cell">AI verdict</TableHead>
              <TableHead className="w-32">Your review</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((call) => {
              const counts = countBySeverity(call.findings);
              const review = reviews[call.id];
              const status = STATUS[reviewStatus(review)];
              const StatusIcon = status.icon;
              return (
                <TableRow
                  key={call.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/calls/${call.id}`)}
                >
                  <TableCell className="font-mono text-xs">
                    <Link href={`/calls/${call.id}`} className="hover:underline" onClick={(event) => event.stopPropagation()}>
                      {call.id}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden max-w-0 md:table-cell">
                    <p className="truncate text-muted-foreground">
                      {call.summary.replace(/^(DPA completed|No DPA stated with agent)\.\s*/i, "")}
                    </p>
                  </TableCell>
                  <TableCell>
                    <IssueCounts material={counts.material} minor={counts.minor} />
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {call.suggestedVerdict ? <VerdictBadge verdict={call.suggestedVerdict} /> : <span className="text-xs text-muted-foreground">None</span>}
                  </TableCell>
                  <TableCell>
                    {review?.verdict ? (
                      <VerdictBadge verdict={review.verdict} />
                    ) : (
                      <span className={cn("flex items-center gap-1 text-xs", status.className)}>
                        <StatusIcon className="size-3.5" aria-hidden />
                        {status.label}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function IssueCounts({ material, minor }: { material: number; minor: number }) {
  if (material === 0 && minor === 0) return <span className="text-xs text-muted-foreground">None suggested</span>;
  return (
    <span className="flex gap-1">
      {material > 0 && <SeverityBadge severity="material" label={`${material} material`} />}
      {minor > 0 && <SeverityBadge severity="minor" label={`${minor} minor`} />}
    </span>
  );
}
