import { Badge } from "@/components/ui/badge";
import { CERTAINTY_LABEL, FINDING_TYPE_LABEL, SEVERITY_LABEL, VERDICT_LABEL } from "@/lib/labels";
import type { Certainty, FindingType, Severity, Verdict } from "@/lib/schema";
import { cn } from "@/lib/utils";

const SEVERITY_CLASS: Record<Severity, string> = {
  material: "bg-destructive/10 text-destructive dark:bg-destructive/20",
  minor: "bg-warning/20 text-warning-foreground dark:text-warning",
};

export function SeverityBadge({ severity, label, className }: { severity: Severity; label?: string; className?: string }) {
  return <Badge className={cn(SEVERITY_CLASS[severity], className)}>{label ?? SEVERITY_LABEL[severity]}</Badge>;
}

export function TypeBadge({ type }: { type: FindingType }) {
  return <Badge variant="outline">{FINDING_TYPE_LABEL[type]}</Badge>;
}

export function CertaintyBadge({ certainty }: { certainty: Certainty }) {
  return (
    <Badge variant="outline" className={cn(certainty === "uncertain" && "border-dashed text-muted-foreground")}>
      {CERTAINTY_LABEL[certainty]}
    </Badge>
  );
}

const VERDICT_CLASS: Record<Verdict, string> = {
  acceptable: "bg-success/10 text-success dark:bg-success/20",
  minor_issues: "bg-warning/20 text-warning-foreground dark:text-warning",
  misleading: "bg-destructive/10 text-destructive dark:bg-destructive/20",
};

export function VerdictBadge({ verdict, className }: { verdict: Verdict; className?: string }) {
  return <Badge className={cn(VERDICT_CLASS[verdict], className)}>{VERDICT_LABEL[verdict]}</Badge>;
}
