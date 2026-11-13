import { readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
import { applyRuleChecks } from "./rules";
import {
  analysisFileSchema,
  rawCallsSchema,
  type CallAnalysis,
  type Finding,
  type RawCall,
  type Turn,
} from "./schema";
import { parseTranscript } from "./transcript";

export type Call = RawCall & {
  turns: Turn[];
  analysis: CallAnalysis | null;
  /** AI findings plus deterministic rule findings, de-duplicated. */
  findings: Finding[];
  analysisError: string | null;
};

const DATA_DIR = path.join(process.cwd(), "data");

async function readJson(file: string): Promise<unknown> {
  return JSON.parse(await readFile(path.join(DATA_DIR, file), "utf8"));
}

async function loadAnalyses(): Promise<{ byId: Map<string, CallAnalysis>; error: string | null }> {
  try {
    const parsed = analysisFileSchema.safeParse(await readJson("analysis.json"));
    if (!parsed.success) return { byId: new Map(), error: "The precomputed analysis file is invalid." };
    return { byId: new Map(parsed.data.map((analysis) => [analysis.callId, analysis])), error: null };
  } catch {
    return { byId: new Map(), error: "No precomputed analysis is available yet." };
  }
}

export const getCalls = cache(async (): Promise<Call[]> => {
  const raw = rawCallsSchema.parse(await readJson("calls.json"));
  const { byId, error } = await loadAnalyses();
  return raw
    .map((call) => {
      const turns = parseTranscript(call.transcript);
      const analysis = byId.get(call.id) ?? null;
      const ruleFindings = applyRuleChecks(call, turns);
      return {
        ...call,
        turns,
        analysis,
        findings: mergeFindings(analysis?.findings ?? [], ruleFindings),
        analysisError: analysis ? null : (error ?? "This call has no precomputed analysis."),
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id));
});

export async function getCall(id: string): Promise<Call | undefined> {
  return (await getCalls()).find((call) => call.id === id);
}

export async function getRulesText(): Promise<string> {
  return readFile(path.join(DATA_DIR, "summary-rules.txt"), "utf8");
}

/** Drops rule findings that the AI already reported on the same excerpt and rule. */
function mergeFindings(aiFindings: Finding[], ruleFindings: Finding[]): Finding[] {
  const extra = ruleFindings.filter(
    (ruleFinding) =>
      !aiFindings.some(
        (ai) =>
          ai.summaryExcerpt !== null &&
          ruleFinding.summaryExcerpt !== null &&
          ai.rule.toLowerCase() === ruleFinding.rule.toLowerCase() &&
          (ai.summaryExcerpt.includes(ruleFinding.summaryExcerpt) ||
            ruleFinding.summaryExcerpt.includes(ai.summaryExcerpt)),
      ),
  );
  return [...aiFindings, ...extra].sort(compareFindings);
}

const SEVERITY_ORDER = { material: 0, minor: 1 } as const;
const CERTAINTY_ORDER = { definite: 0, uncertain: 1 } as const;

export function compareFindings(a: Finding, b: Finding): number {
  return (
    SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
    CERTAINTY_ORDER[a.certainty] - CERTAINTY_ORDER[b.certainty]
  );
}
