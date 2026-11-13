/**
 * Precomputes AI review suggestions for every call into data/analysis.json.
 *
 * Usage:
 *   npm run analyse -- --model sonnet            # all calls -> data/analysis.sonnet.json
 *   npm run analyse -- --model haiku --calls CALL-003,CALL-019
 *   npm run analyse -- --model sonnet --promote  # also writes data/analysis.json
 *
 * Needs ANTHROPIC_API_KEY in .env.local (local only; the deployed app never calls the API).
 */
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { readFile, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import {
  analysisFileSchema,
  llmOutputSchema,
  rawCallsSchema,
  type CallAnalysis,
  type Finding,
  type LlmOutput,
  type RawCall,
  type Turn,
} from "../lib/schema.ts";
import { locateExcerpt, parseTranscript } from "../lib/transcript.ts";

const MODELS = { sonnet: "claude-sonnet-5-5", haiku: "claude-haiku-5-5" } as const;
type ModelKey = keyof typeof MODELS;

const { values } = parseArgs({
  options: {
    model: { type: "string", default: "sonnet" },
    calls: { type: "string" },
    promote: { type: "boolean", default: false },
    concurrency: { type: "string", default: "4" },
  },
});

if (!(values.model in MODELS)) throw new Error(`--model must be one of: ${Object.keys(MODELS).join(", ")}`);
const modelKey = values.model as ModelKey;
const model = MODELS[modelKey];

const client = new Anthropic({ timeout: 180_000, maxRetries: 2 });

const SEVERITY_GUIDE = `
Classify each problem you find:

type
- contradiction: the summary states something the transcript contradicts.
- unsupported: the summary states something the transcript does not support (invented detail, invented precision such as "2 pm" for "after two", wrong attribution, overstated certainty).
- omission: information the summary rules REQUIRE, that WAS discussed, is missing. A category that was not discussed is never an omission. For DPA, "no DPA stated with agent" is the correct output when full verification or confirmed pre-call security is absent; that is not an omission.
- rule_breach: the summary breaks a summary rule even if the fact is right (e.g. states an arrears amount, states an amount for a payment taken during the call, includes names or entity names that must be redacted, American spelling, "further action" used for the plan, missing mandated wording such as "customer signposted", "Consent gained to record vulnerability", "risk of further action").

severity
- material: a colleague relying on the summary could act differently or be misled. Examples: wrong call direction or wrong person/third party/authority status; consent recorded when refused (or vice versa); vulnerability or severe hardship lost or changed; promise-to-pay amount, date or method wrong or missing; payment made vs not made wrong; hold/forbearance length wrong; next contact date/time wrong; an explicit risk-of-further-action warning or I&E refusal missing.
- minor: a rule or wording breach that does not change what a colleague would understand or do (e.g. banned arrears amount stated, spelling, terminology, redaction of a non-identifying detail, generalisation that keeps the meaning).

certainty
- definite: the transcript evidence is unambiguous.
- uncertain: the evidence is ambiguous, depends on interpretation of a rule, or a transcription error could explain it.

Acceptable summarisation is NOT a finding: paraphrase, reordering, merging sentences, or leaving out detail the rules do not require.
`;

async function main() {
  const calls = rawCallsSchema.parse(JSON.parse(await readFile("data/calls.json", "utf8")));
  const rules = await readFile("data/summary-rules.txt", "utf8");
  const guidance = await readFile("data/review-guidance.md", "utf8");
  const wanted = values.calls?.split(",").map((id) => id.trim());
  const selected = wanted ? calls.filter((call) => wanted.includes(call.id)) : calls;

  const system = buildSystemPrompt(rules, guidance);
  const results: CallAnalysis[] = [];
  const queue = [...selected];
  const workers = Array.from({ length: Number(values.concurrency) }, async () => {
    for (let call = queue.shift(); call; call = queue.shift()) {
      const started = Date.now();
      const analysis = await analyseCall(call, system);
      results.push(analysis);
      const material = analysis.findings.filter((finding) => finding.severity === "material").length;
      console.log(
        `${call.id}  ${analysis.findings.length} findings (${material} material)  ${analysis.suggestedVerdict}  ${((Date.now() - started) / 1000).toFixed(1)}s`,
      );
    }
  });
  await Promise.all(workers);
  results.sort((a, b) => a.callId.localeCompare(b.callId));

  const output = analysisFileSchema.parse(results);
  const file = `data/analysis.${modelKey}.json`;
  await writeFile(file, JSON.stringify(output, null, 2) + "\n");
  console.log(`Wrote ${file}`);
  if (values.promote) {
    await writeFile("data/analysis.json", JSON.stringify(output, null, 2) + "\n");
    console.log("Promoted to data/analysis.json");
  }
}

function buildSystemPrompt(rules: string, guidance: string): string {
  return [
    "You are a quality-assurance reviewer for a UK car finance collections team.",
    "Collections staff rely on AI-generated call summaries to prepare for the next contact and follow up on agreed actions.",
    "Your job: compare ONE summary against its transcript and the summary rules, and report where the summary could mislead a colleague or breaks the rules.",
    "The transcript is the only source of truth. Ignore transcription hallucinations during hold or silence (generic, out-of-context lines), as the rules instruct.",
    "Cite evidence with the transcript turn IDs exactly as written (e.g. T07). Quote summaryExcerpt verbatim from the summary (copy the exact characters); use null for omissions or whole-summary issues.",
    "Report each distinct problem once. Do not invent problems: some summaries are fully accurate, and an empty findings list is a valid answer.",
    "In checks, list the required categories you verified as correctly handled (category name, one-line note, supporting turn IDs). Keep each note short.",
    "Write in British English, plain and specific. Keep explanations to one or two sentences.",
    "suggestedVerdict: acceptable (no findings, or only trivial issues), minor_issues (only minor findings), misleading (at least one material finding you are confident about).",
    SEVERITY_GUIDE,
    "<summary_rules>",
    rules,
    "</summary_rules>",
    "<review_guidance>",
    guidance,
    "</review_guidance>",
  ].join("\n");
}

function formatTranscript(turns: Turn[]): string {
  return turns.map((turn) => `${turn.id} [${turn.time}] ${turn.speaker}: ${turn.text}`).join("\n");
}

async function requestAnalysis(call: RawCall, turns: Turn[], system: string): Promise<LlmOutput> {
  const user = [
    `Call ID: ${call.id}`,
    `Call date: ${call.call_date} (use this to resolve relative dates such as "tomorrow" or "Friday")`,
    `Estimated duration: ${call.estimated_duration}`,
    "",
    "<transcript>",
    formatTranscript(turns),
    "</transcript>",
    "",
    "<summary_to_review>",
    call.summary,
    "</summary_to_review>",
  ].join("\n");

  let lastError: unknown;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await client.messages.parse({
        model,
        max_tokens: 16000,
        cache_control: { type: "ephemeral" },
        output_config: { effort: "high", format: zodOutputFormat(llmOutputSchema) },
        system,
        messages: [{ role: "user", content: user }],
      });
      if (response.stop_reason === "refusal") throw new Error("Model refused the request");
      if (response.stop_reason === "max_tokens") throw new Error("Output truncated at max_tokens");
      if (!response.parsed_output) throw new Error("Model output did not match the schema");
      return llmOutputSchema.parse(response.parsed_output);
    } catch (error) {
      lastError = error;
      if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) throw error;
      console.warn(`${call.id}: attempt ${attempt} failed (${error instanceof Error ? error.message : String(error)})`);
    }
  }
  throw lastError;
}

async function analyseCall(call: RawCall, system: string): Promise<CallAnalysis> {
  const turns = parseTranscript(call.transcript);
  const output = await requestAnalysis(call, turns, system);
  const validTurnIds = new Set(turns.map((turn) => turn.id));

  const findings: Finding[] = output.findings.map((finding, index) => {
    const validationNotes: string[] = [];
    const turnIds = finding.turnIds.filter((id) => validTurnIds.has(id));
    const dropped = finding.turnIds.filter((id) => !validTurnIds.has(id));
    if (dropped.length > 0) validationNotes.push(`Dropped turn IDs not in the transcript: ${dropped.join(", ")}.`);
    if (turnIds.length === 0 && finding.type !== "rule_breach") validationNotes.push("No valid transcript evidence cited.");

    let summaryExcerpt = finding.summaryExcerpt;
    if (summaryExcerpt) {
      const span = locateExcerpt(call.summary, summaryExcerpt);
      if (span) summaryExcerpt = call.summary.slice(span.start, span.end);
      else {
        validationNotes.push(`Quoted excerpt not found in the summary: "${summaryExcerpt}".`);
        summaryExcerpt = null;
      }
    }
    return {
      ...finding,
      id: `${call.id}-ai-${index + 1}`,
      source: "ai" as const,
      summaryExcerpt,
      turnIds,
      // Unverifiable evidence can't support a definite finding.
      certainty: validationNotes.length > 0 ? "uncertain" : finding.certainty,
      validationNotes,
    };
  });

  const checks = output.checks.map((check) => ({
    ...check,
    turnIds: check.turnIds.filter((id) => validTurnIds.has(id)),
  }));

  return {
    callId: call.id,
    suggestedVerdict: output.suggestedVerdict,
    rationale: output.rationale,
    findings,
    checks,
    model,
    generatedAt: new Date().toISOString(),
  };
}

main().catch((error: unknown) => {
  if (error instanceof Anthropic.AuthenticationError) {
    console.error("Authentication failed: set a valid ANTHROPIC_API_KEY in .env.local.");
  } else {
    console.error(error instanceof Error ? error.message : error);
  }
  process.exit(1);
});
