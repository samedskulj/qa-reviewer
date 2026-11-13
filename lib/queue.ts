import type { Finding, Verdict } from "./schema";

/** Plain props for client components that list calls (queue, export). */
export type QueueItem = {
  id: string;
  summary: string;
  suggestedVerdict: Verdict | null;
  findings: Finding[];
  analysisError: string | null;
};

export function countBySeverity(findings: Finding[]) {
  return {
    material: findings.filter((finding) => finding.severity === "material").length,
    minor: findings.filter((finding) => finding.severity === "minor").length,
  };
}
