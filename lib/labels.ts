import type { Certainty, FindingSource, FindingType, Severity, Verdict } from "./schema";

export const FINDING_TYPE_LABEL: Record<FindingType, string> = {
  contradiction: "Contradiction",
  unsupported: "Unsupported",
  omission: "Omission",
  rule_breach: "Rule breach",
};

export const SEVERITY_LABEL: Record<Severity, string> = { material: "Material", minor: "Minor" };
export const CERTAINTY_LABEL: Record<Certainty, string> = { definite: "Definite", uncertain: "Uncertain" };
export const SOURCE_LABEL: Record<FindingSource, string> = {
  ai: "Suggested by AI",
  rule: "Rule check",
  reviewer: "Added by reviewer",
};

export const VERDICT_LABEL: Record<Verdict, string> = {
  acceptable: "Acceptable",
  minor_issues: "Minor issues",
  misleading: "Misleading",
};

export const VERDICT_DESCRIPTION: Record<Verdict, string> = {
  acceptable: "A colleague could rely on this summary.",
  minor_issues: "Rule or wording breaches that don't change what a colleague would do.",
  misleading: "Information is lost or changed in a way that could mislead a colleague.",
};

/** Model rule labels look like "Consent: only state consent where..." – keep the short name. */
export function shortRule(rule: string): string {
  return rule.split(":")[0].trim();
}
