"use client";

import { Check, Trash2, X } from "lucide-react";
import { CertaintyBadge, SeverityBadge, TypeBadge } from "@/components/finding-badges";
import { Button } from "@/components/ui/button";
import { SOURCE_LABEL, shortRule } from "@/lib/labels";
import type { Finding, FindingDecision } from "@/lib/schema";
import { cn } from "@/lib/utils";

type Props = {
  finding: Finding;
  decision: FindingDecision | null;
  selected: boolean;
  focusedTurnId: string | null;
  onSelect: () => void;
  onTurnClick: (turnId: string) => void;
  onDecide: (decision: FindingDecision | null) => void;
  onRemove: () => void;
};

export function FindingCard({ finding, decision, selected, focusedTurnId, onSelect, onTurnClick, onDecide, onRemove }: Props) {
  const dismissed = decision === "dismissed";
  return (
    <article
      className={cn(
        "flex flex-col gap-2 rounded-lg border bg-card p-3 transition-colors",
        selected && "border-primary ring-1 ring-primary/40",
        dismissed && "opacity-60",
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className="flex flex-col gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
      >
        <div className="flex flex-wrap items-center gap-1">
          <SeverityBadge severity={finding.severity} />
          <TypeBadge type={finding.type} />
          <CertaintyBadge certainty={finding.certainty} />
          <span className="ml-auto text-xs text-muted-foreground">{SOURCE_LABEL[finding.source]}</span>
        </div>
        <p className="text-xs font-medium text-muted-foreground">{shortRule(finding.rule)}</p>
        {finding.summaryExcerpt && (
          <blockquote className={cn("border-l-2 pl-2 text-sm", dismissed && "line-through")}>
            “{finding.summaryExcerpt}”
          </blockquote>
        )}
        <p className="text-sm leading-relaxed">{finding.explanation}</p>
        {finding.suggestedCorrection && (
          <p className="text-xs text-muted-foreground">
            <span className="font-medium">Suggested fix:</span> {finding.suggestedCorrection}
          </p>
        )}
      </button>

      {finding.validationNotes.length > 0 && (
        <p className="rounded-sm bg-muted px-2 py-1 text-xs text-muted-foreground">{finding.validationNotes.join(" ")}</p>
      )}

      <div className="flex flex-wrap items-center gap-1">
        {finding.turnIds.length > 0 && <span className="text-xs text-muted-foreground">Evidence</span>}
        {finding.turnIds.map((turnId) => (
          <Button
            key={turnId}
            variant={turnId === focusedTurnId ? "default" : "outline"}
            size="xs"
            className="font-mono"
            aria-pressed={turnId === focusedTurnId}
            aria-label={`Show turn ${turnId} in the transcript`}
            onClick={() => onTurnClick(turnId)}
          >
            {turnId}
          </Button>
        ))}
        <div className="ml-auto flex gap-1">
          {finding.source === "reviewer" ? (
            <Button variant="ghost" size="sm" onClick={onRemove}>
              <Trash2 data-icon="inline-start" />
              Remove
            </Button>
          ) : (
            <>
              <Button
                variant={decision === "confirmed" ? "secondary" : "outline"}
                size="sm"
                aria-pressed={decision === "confirmed"}
                onClick={() => onDecide(decision === "confirmed" ? null : "confirmed")}
              >
                <Check data-icon="inline-start" />
                {decision === "confirmed" ? "Confirmed" : "Confirm"}
              </Button>
              <Button
                variant={dismissed ? "secondary" : "ghost"}
                size="sm"
                aria-pressed={dismissed}
                onClick={() => onDecide(dismissed ? null : "dismissed")}
              >
                <X data-icon="inline-start" />
                {dismissed ? "Dismissed" : "Dismiss"}
              </Button>
            </>
          )}
        </div>
      </div>
    </article>
  );
}
