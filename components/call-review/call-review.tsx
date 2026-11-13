"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Info } from "lucide-react";
import { AddFindingDialog } from "@/components/call-review/add-finding-dialog";
import { ChecksList } from "@/components/call-review/checks-list";
import { FindingCard } from "@/components/call-review/finding-card";
import { SummaryText } from "@/components/call-review/summary-text";
import { TranscriptPanel } from "@/components/call-review/transcript-panel";
import { VerdictPanel } from "@/components/call-review/verdict-panel";
import { Button } from "@/components/ui/button";
import type { Check, Finding, Turn, Verdict } from "@/lib/schema";
import { useReviews } from "@/lib/review-store";

export type CallView = { id: string; callDate: string; duration: string; summary: string; turns: Turn[] };

type Props = {
  call: CallView;
  findings: Finding[];
  checks: Check[];
  suggestedVerdict: Verdict | null;
  rationale: string | null;
  model: string | null;
  analysisError: string | null;
  prevId: string | null;
  nextId: string | null;
};

export function CallReview({ call, findings, checks, suggestedVerdict, rationale, model, analysisError, prevId, nextId }: Props) {
  const { reviews, updateReview } = useReviews();
  const review = reviews[call.id];
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const allFindings = useMemo(() => [...findings, ...(review?.manualFindings ?? [])], [findings, review?.manualFindings]);
  const selected = allFindings.find((finding) => finding.id === selectedId) ?? null;
  const pendingCount = allFindings.filter((finding) => finding.source !== "reviewer" && !review?.decisions[finding.id]).length;

  function selectFinding(id: string) {
    const finding = allFindings.find((item) => item.id === id);
    setSelectedId((current) => (current === id ? null : id));
    const firstTurn = finding?.turnIds[0];
    if (firstTurn && selectedId !== id) scrollToTurn(firstTurn);
  }

  function scrollToTurn(turnId: string) {
    document.getElementById(`turn-${turnId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:grid lg:grid-cols-2 lg:overflow-hidden">
      <section aria-label="Summary and findings" className="flex shrink-0 flex-col gap-4 p-4 lg:min-h-0 lg:overflow-y-auto lg:border-r">
        <div className="flex items-center gap-2">
          <div className="flex flex-col">
            <h1 className="font-mono text-xl font-semibold tracking-tight">{call.id}</h1>
            <p className="text-xs text-muted-foreground">
              {formatDate(call.callDate)} · about {call.duration}
            </p>
          </div>
          <nav aria-label="Call navigation" className="ml-auto flex gap-1">
            <NavButton href={prevId && `/calls/${prevId}`} label="Previous call">
              <ChevronLeft />
            </NavButton>
            <NavButton href={nextId && `/calls/${nextId}`} label="Next call">
              <ChevronRight />
            </NavButton>
          </nav>
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold">Summary under review</h2>
          <SummaryText
            summary={call.summary}
            findings={allFindings.filter((finding) => review?.decisions[finding.id] !== "dismissed")}
            selectedId={selectedId}
            onSelect={selectFinding}
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">
              Suggested issues <span className="text-muted-foreground">({allFindings.length})</span>
            </h2>
            {pendingCount > 0 && <span className="text-xs text-muted-foreground">{pendingCount} to decide</span>}
            <div className="ml-auto">
              <AddFindingDialog
                callId={call.id}
                summary={call.summary}
                turnIds={call.turns.map((turn) => turn.id)}
                onAdd={(finding) =>
                  updateReview(call.id, (current) => ({ ...current, manualFindings: [...current.manualFindings, finding] }))
                }
              />
            </div>
          </div>

          {analysisError && (
            <p className="flex items-start gap-2 rounded-md border border-dashed p-3 text-xs text-muted-foreground">
              <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              {analysisError} Rule checks still ran; review the transcript manually.
            </p>
          )}

          {allFindings.length === 0 ? (
            <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
              No issues suggested by the AI review or rule checks. Read the transcript before marking the summary acceptable.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {allFindings.map((finding) => (
                <li key={finding.id}>
                  <FindingCard
                    finding={finding}
                    decision={review?.decisions[finding.id] ?? null}
                    selected={finding.id === selectedId}
                    onSelect={() => selectFinding(finding.id)}
                    onTurnClick={scrollToTurn}
                    onDecide={(decision) =>
                      updateReview(call.id, (current) => {
                        const decisions = { ...current.decisions };
                        if (decision) decisions[finding.id] = decision;
                        else delete decisions[finding.id];
                        return { ...current, decisions };
                      })
                    }
                    onRemove={() =>
                      updateReview(call.id, (current) => ({
                        ...current,
                        manualFindings: current.manualFindings.filter((item) => item.id !== finding.id),
                      }))
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </div>

        <ChecksList checks={checks} onTurnClick={scrollToTurn} />

        <VerdictPanel
          verdict={review?.verdict ?? null}
          note={review?.note ?? ""}
          suggestedVerdict={suggestedVerdict}
          rationale={rationale}
          model={model}
          pendingCount={pendingCount}
          nextId={nextId}
          onVerdict={(verdict) => updateReview(call.id, (current) => ({ ...current, verdict }))}
          onNote={(note) => updateReview(call.id, (current) => ({ ...current, note }))}
        />
      </section>

      <TranscriptPanel turns={call.turns} highlightedTurnIds={selected?.turnIds ?? []} />
    </div>
  );
}

function NavButton({ href, label, children }: { href: string | null; label: string; children: React.ReactNode }) {
  if (!href) {
    return (
      <Button variant="ghost" size="icon" disabled aria-label={label}>
        {children}
      </Button>
    );
  }
  return (
    <Button variant="ghost" size="icon" asChild>
      <Link href={href} aria-label={label}>
        {children}
      </Link>
    </Button>
  );
}

function formatDate(isoDate: string) {
  const date = new Date(`${isoDate}T12:00:00Z`);
  return Number.isNaN(date.getTime())
    ? isoDate
    : date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}
