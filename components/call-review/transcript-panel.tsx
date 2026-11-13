import type { Turn } from "@/lib/schema";
import { cn } from "@/lib/utils";

export function TranscriptPanel({ turns, highlightedTurnIds }: { turns: Turn[]; highlightedTurnIds: string[] }) {
  return (
    <section aria-label="Transcript" className="flex shrink-0 flex-col border-t lg:min-h-0 lg:border-t-0">
      <h2 className="border-b bg-background px-4 py-2 text-sm font-semibold">Transcript</h2>
      <ol className="flex flex-col gap-0.5 p-2 lg:min-h-0 lg:overflow-y-auto">
        {turns.map((turn) => {
          const highlighted = highlightedTurnIds.includes(turn.id);
          const isAgent = turn.speaker === "Agent";
          return (
            <li
              key={turn.id}
              id={`turn-${turn.id}`}
              className={cn(
                "grid scroll-mt-12 grid-cols-[3rem_1fr] gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                highlighted && "bg-accent text-accent-foreground ring-1 ring-primary/40",
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
