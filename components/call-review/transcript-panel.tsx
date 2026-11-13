import type { Severity, Turn } from "@/lib/schema";
import { cn } from "@/lib/utils";

/** Colour of the evidence highlight: the selected finding's severity, or "ok" for a passed check. */
export type HighlightTone = Severity | "ok" | null;

const TONE_CLASS: Record<Severity | "ok", { evidence: string; focused: string }> = {
  material: { evidence: "bg-destructive/10", focused: "bg-destructive/20 ring-2 ring-destructive/50" },
  minor: { evidence: "bg-warning/15", focused: "bg-warning/25 ring-2 ring-warning/60" },
  ok: { evidence: "bg-success/10", focused: "bg-success/20 ring-2 ring-success/50" },
};

const NEUTRAL = { evidence: "bg-accent", focused: "bg-accent ring-2 ring-primary/50" };

type Props = {
  turns: Turn[];
  highlightedTurnIds: string[];
  focusedTurnId: string | null;
  tone: HighlightTone;
};

export function TranscriptPanel({ turns, highlightedTurnIds, focusedTurnId, tone }: Props) {
  const toneClass = tone ? TONE_CLASS[tone] : NEUTRAL;
  return (
    <section aria-label="Transcript" className="flex shrink-0 flex-col border-t lg:min-h-0 lg:border-t-0">
      <div className="flex items-center gap-2 border-b bg-background px-4 py-2">
        <h2 className="text-sm font-semibold">Transcript</h2>
        {highlightedTurnIds.length > 0 && (
          <span className="text-xs text-muted-foreground" aria-live="polite">
            Evidence: <span className="font-mono">{highlightedTurnIds.join(", ")}</span>
          </span>
        )}
      </div>
      <ol className="flex flex-col gap-0.5 p-2 lg:min-h-0 lg:overflow-y-auto">
        {turns.map((turn) => {
          const isEvidence = highlightedTurnIds.includes(turn.id);
          const isFocused = isEvidence && turn.id === focusedTurnId;
          const isAgent = turn.speaker === "Agent";
          return (
            <li
              key={turn.id}
              id={`turn-${turn.id}`}
              aria-current={isFocused ? "true" : undefined}
              className={cn(
                "grid scroll-mt-12 grid-cols-[3rem_1fr] gap-2 rounded-md px-2 py-1.5 text-sm transition-colors duration-300",
                isEvidence && toneClass.evidence,
                isFocused && toneClass.focused,
              )}
            >
              <span className="pt-0.5 font-mono text-xs text-muted-foreground">
                {turn.id}
                <span className="block">{turn.time}</span>
              </span>
              <p className={cn("leading-relaxed", turn.isNote && "text-muted-foreground italic")}>
                <span className={cn("font-medium", isAgent ? "text-primary" : "text-foreground")}>{turn.speaker}: </span>
                {turn.text}
              </p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
