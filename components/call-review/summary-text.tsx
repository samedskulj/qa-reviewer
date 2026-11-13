import { Fragment } from "react";
import type { Finding } from "@/lib/schema";
import { locateExcerpt } from "@/lib/transcript";
import { cn } from "@/lib/utils";

type Span = { start: number; end: number; finding: Finding };

/** Non-overlapping excerpt spans, earliest first; material findings win overlaps. */
function excerptSpans(summary: string, findings: Finding[]): Span[] {
  const candidates = findings
    .filter((finding) => finding.summaryExcerpt)
    .map((finding) => ({ span: locateExcerpt(summary, finding.summaryExcerpt ?? ""), finding }))
    .filter((item): item is { span: { start: number; end: number }; finding: Finding } => item.span !== null)
    .sort((a, b) => (a.finding.severity === b.finding.severity ? 0 : a.finding.severity === "material" ? -1 : 1));
  const chosen: Span[] = [];
  for (const { span, finding } of candidates) {
    if (chosen.some((other) => span.start < other.end && other.start < span.end)) continue;
    chosen.push({ ...span, finding });
  }
  return chosen.sort((a, b) => a.start - b.start);
}

export function SummaryText({
  summary,
  findings,
  selectedId,
  onSelect,
}: {
  summary: string;
  findings: Finding[];
  selectedId: string | null;
  onSelect: (findingId: string) => void;
}) {
  const spans = excerptSpans(summary, findings);
  let cursor = 0;
  const parts: React.ReactNode[] = [];
  for (const span of spans) {
    parts.push(<Fragment key={`text-${cursor}`}>{summary.slice(cursor, span.start)}</Fragment>);
    const material = span.finding.severity === "material";
    parts.push(
      <button
        key={span.finding.id}
        type="button"
        onClick={() => onSelect(span.finding.id)}
        className={cn(
          "rounded-sm px-0.5 text-left underline decoration-2 underline-offset-4 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
          material ? "decoration-destructive" : "decoration-warning",
          span.finding.id === selectedId && (material ? "bg-destructive/15" : "bg-warning/25"),
        )}
      >
        {summary.slice(span.start, span.end)}
      </button>,
    );
    cursor = span.end;
  }
  parts.push(<Fragment key="text-end">{summary.slice(cursor)}</Fragment>);

  return <p className="rounded-lg border bg-card p-3 text-sm leading-relaxed">{parts}</p>;
}
