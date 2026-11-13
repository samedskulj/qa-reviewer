"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { VerdictBadge } from "@/components/finding-badges";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { VERDICT_DESCRIPTION, VERDICT_LABEL } from "@/lib/labels";
import { verdictSchema, type Verdict } from "@/lib/schema";

type Props = {
  verdict: Verdict | null;
  note: string;
  suggestedVerdict: Verdict | null;
  rationale: string | null;
  model: string | null;
  pendingCount: number;
  nextId: string | null;
  onVerdict: (verdict: Verdict) => void;
  onNote: (note: string) => void;
};

export function VerdictPanel({ verdict, note, suggestedVerdict, rationale, model, pendingCount, nextId, onVerdict, onNote }: Props) {
  return (
    <section aria-labelledby="verdict-heading" className="flex flex-col gap-3 rounded-lg border bg-card p-3">
      <h2 id="verdict-heading" className="text-sm font-semibold">
        Your verdict
      </h2>

      {suggestedVerdict && (
        <div className="flex flex-col gap-1 rounded-md bg-muted p-2 text-xs">
          <span className="flex items-center gap-1 text-muted-foreground">
            AI suggestion <VerdictBadge verdict={suggestedVerdict} />
            {model && <span className="ml-auto font-mono">{model}</span>}
          </span>
          {rationale && <p className="leading-relaxed">{rationale}</p>}
        </div>
      )}

      <RadioGroup
        value={verdict ?? ""}
        onValueChange={(value) => {
          const parsed = verdictSchema.safeParse(value);
          if (!parsed.success) return;
          onVerdict(parsed.data);
          toast.success(`Marked ${VERDICT_LABEL[parsed.data].toLowerCase()}`);
        }}
        aria-label="Verdict"
        className="flex flex-col gap-2"
      >
        {verdictSchema.options.map((option) => (
          <Label
            key={option}
            htmlFor={`verdict-${option}`}
            className="flex cursor-pointer items-start gap-2 rounded-md border p-2 has-data-[state=checked]:border-primary has-data-[state=checked]:bg-accent"
          >
            <RadioGroupItem id={`verdict-${option}`} value={option} aria-label={VERDICT_LABEL[option]} className="mt-0.5" />
            <span className="flex flex-col gap-0.5">
              <span className="text-sm font-medium">{VERDICT_LABEL[option]}</span>
              <span className="text-xs font-normal text-muted-foreground">{VERDICT_DESCRIPTION[option]}</span>
            </span>
          </Label>
        ))}
      </RadioGroup>

      <div className="flex flex-col gap-1">
        <Label htmlFor="review-note" className="text-xs font-medium text-muted-foreground">
          Note for the record (optional)
        </Label>
        <Textarea
          id="review-note"
          value={note}
          onChange={(event) => onNote(event.target.value)}
          placeholder="Anything a colleague should know about this summary"
          rows={2}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs text-muted-foreground">
          {pendingCount > 0 ? `${pendingCount} suggestion${pendingCount === 1 ? "" : "s"} not yet confirmed or dismissed.` : "Saved in this browser."}
        </p>
        <Button asChild className="ml-auto">
          <Link href={nextId ? `/calls/${nextId}` : "/"}>
            {nextId ? "Next call" : "Back to queue"}
            <ArrowRight data-icon="inline-end" />
          </Link>
        </Button>
      </div>
    </section>
  );
}
