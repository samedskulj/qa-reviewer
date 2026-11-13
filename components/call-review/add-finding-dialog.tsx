"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CERTAINTY_LABEL, FINDING_TYPE_LABEL, SEVERITY_LABEL } from "@/lib/labels";
import {
  certaintySchema,
  findingTypeSchema,
  severitySchema,
  type Certainty,
  type Finding,
  type FindingType,
  type Severity,
} from "@/lib/schema";
import { locateExcerpt } from "@/lib/transcript";

type Props = { callId: string; summary: string; turnIds: string[]; onAdd: (finding: Finding) => void };

export function AddFindingDialog({ callId, summary, turnIds, onAdd }: Props) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FindingType>("contradiction");
  const [severity, setSeverity] = useState<Severity>("material");
  const [certainty, setCertainty] = useState<Certainty>("definite");
  const [excerpt, setExcerpt] = useState("");
  const [evidence, setEvidence] = useState("");
  const [explanation, setExplanation] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  function reset() {
    setType("contradiction");
    setSeverity("material");
    setCertainty("definite");
    setExcerpt("");
    setEvidence("");
    setExplanation("");
    setErrors([]);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const cited = evidence
      .split(/[\s,]+/)
      .filter(Boolean)
      .map((id) => id.toUpperCase().replace(/^T(\d)$/, "T0$1"));
    const problems: string[] = [];
    const unknown = cited.filter((id) => !turnIds.includes(id));
    if (unknown.length > 0) problems.push(`Not in this transcript: ${unknown.join(", ")}.`);
    if (excerpt.trim() && !locateExcerpt(summary, excerpt.trim())) problems.push("The excerpt must be copied from the summary.");
    if (!explanation.trim()) problems.push("Explain the problem.");
    if (problems.length > 0) {
      setErrors(problems);
      return;
    }
    onAdd({
      id: `${callId}-reviewer-${Date.now()}`,
      source: "reviewer",
      type,
      severity,
      certainty,
      summaryExcerpt: excerpt.trim() || null,
      turnIds: cited,
      rule: "Reviewer finding",
      explanation: explanation.trim(),
      suggestedCorrection: null,
      validationNotes: [],
    });
    reset();
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus data-icon="inline-start" />
          Add finding
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Add a finding</DialogTitle>
            <DialogDescription>Record a problem the suggestions missed. Cite the turns that show it.</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <EnumSelect label="Type" value={type} options={findingTypeSchema.options} labels={FINDING_TYPE_LABEL} onChange={setType} />
            <EnumSelect label="Severity" value={severity} options={severitySchema.options} labels={SEVERITY_LABEL} onChange={setSeverity} />
            <EnumSelect label="Certainty" value={certainty} options={certaintySchema.options} labels={CERTAINTY_LABEL} onChange={setCertainty} />
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="finding-excerpt">Summary excerpt (optional for omissions)</Label>
            <Textarea id="finding-excerpt" value={excerpt} onChange={(event) => setExcerpt(event.target.value)} rows={2} />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="finding-evidence">Evidence turns</Label>
            <Input id="finding-evidence" value={evidence} onChange={(event) => setEvidence(event.target.value)} placeholder="e.g. T08, T10" />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="finding-explanation">What is wrong</Label>
            <Textarea id="finding-explanation" value={explanation} onChange={(event) => setExplanation(event.target.value)} rows={3} />
          </div>

          {errors.length > 0 && (
            <ul role="alert" className="text-xs text-destructive">
              {errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          )}

          <DialogFooter>
            <Button type="submit">Add finding</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EnumSelect<T extends string>({
  label,
  value,
  options,
  labels,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  labels: Record<T, string>;
  onChange: (value: T) => void;
}) {
  const id = `finding-${label.toLowerCase()}`;
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={(next) => onChange(options.find((option) => option === next) ?? value)}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {labels[option]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
