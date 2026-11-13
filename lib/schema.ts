import { z } from "zod";

/** A record exactly as supplied in data/calls.json. */
export const rawCallSchema = z.object({
  id: z.string().regex(/^CALL-\d+$/),
  call_date: z.string(),
  estimated_duration: z.string(),
  transcript: z.string().min(1),
  summary: z.string(),
});
export const rawCallsSchema = z.array(rawCallSchema);
export type RawCall = z.infer<typeof rawCallSchema>;

export const turnIdSchema = z.string().regex(/^T\d{2,}$/);

export const turnSchema = z.object({
  id: turnIdSchema,
  time: z.string(),
  speaker: z.string(),
  text: z.string(),
  /** Transcript notes ("Hold music begins") and other non-speech lines. */
  isNote: z.boolean(),
});
export type Turn = z.infer<typeof turnSchema>;

export const findingTypeSchema = z.enum(["contradiction", "unsupported", "omission", "rule_breach"]);
export type FindingType = z.infer<typeof findingTypeSchema>;

/** material = could mislead a colleague acting on the summary; minor = rule/style breach with no change of meaning. */
export const severitySchema = z.enum(["material", "minor"]);
export type Severity = z.infer<typeof severitySchema>;

export const certaintySchema = z.enum(["definite", "uncertain"]);
export type Certainty = z.infer<typeof certaintySchema>;

export const verdictSchema = z.enum(["acceptable", "minor_issues", "misleading"]);
export type Verdict = z.infer<typeof verdictSchema>;

export const findingSourceSchema = z.enum(["ai", "rule", "reviewer"]);
export type FindingSource = z.infer<typeof findingSourceSchema>;

export const findingSchema = z.object({
  id: z.string(),
  source: findingSourceSchema,
  type: findingTypeSchema,
  severity: severitySchema,
  certainty: certaintySchema,
  /** Exact text from the summary the finding is about; null for omissions. */
  summaryExcerpt: z.string().nullable(),
  turnIds: z.array(turnIdSchema),
  /** Short name of the summary rule involved, e.g. "Consent" or "Arrears/Balances". */
  rule: z.string(),
  explanation: z.string(),
  suggestedCorrection: z.string().nullable(),
  /** Problems found when validating model output (invalid turn IDs, excerpt not found). */
  validationNotes: z.array(z.string()).default([]),
});
export type Finding = z.infer<typeof findingSchema>;

/** A required category the analysis checked and judged acceptable. */
export const checkSchema = z.object({
  category: z.string(),
  note: z.string(),
  turnIds: z.array(turnIdSchema),
});
export type Check = z.infer<typeof checkSchema>;

export const callAnalysisSchema = z.object({
  callId: z.string(),
  suggestedVerdict: verdictSchema,
  rationale: z.string(),
  findings: z.array(findingSchema),
  checks: z.array(checkSchema),
  model: z.string(),
  generatedAt: z.string(),
});
export type CallAnalysis = z.infer<typeof callAnalysisSchema>;
export const analysisFileSchema = z.array(callAnalysisSchema);

/** What the model is asked to return, before IDs and validation are added. */
export const llmFindingSchema = findingSchema.omit({ id: true, source: true, validationNotes: true });
export const llmOutputSchema = z.object({
  suggestedVerdict: verdictSchema,
  rationale: z.string(),
  findings: z.array(llmFindingSchema),
  checks: z.array(checkSchema),
});
export type LlmOutput = z.infer<typeof llmOutputSchema>;

/** Reviewer decisions, stored per browser in localStorage. */
export const findingDecisionSchema = z.enum(["confirmed", "dismissed"]);
export type FindingDecision = z.infer<typeof findingDecisionSchema>;

export const callReviewSchema = z.object({
  decisions: z.record(z.string(), findingDecisionSchema),
  manualFindings: z.array(findingSchema),
  verdict: verdictSchema.nullable(),
  note: z.string(),
  updatedAt: z.string(),
});
export type CallReview = z.infer<typeof callReviewSchema>;
export const reviewStoreSchema = z.record(z.string(), callReviewSchema);
export type ReviewStore = z.infer<typeof reviewStoreSchema>;
