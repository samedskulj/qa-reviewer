import type { Finding, RawCall, Turn } from "./schema";

type RuleFinding = Omit<Finding, "id" | "source" | "validationNotes">;
type RuleCheck = (call: RawCall, turns: Turn[]) => RuleFinding[];

/**
 * Deterministic checks for summary-rule breaches that don't need judgement.
 * They complement the AI analysis and still run when no analysis exists.
 */
export function applyRuleChecks(call: RawCall, turns: Turn[]): Finding[] {
  return RULE_CHECKS.flatMap((check) => check(call, turns)).map((finding, index) => ({
    ...finding,
    id: `${call.id}-rule-${index + 1}`,
    source: "rule" as const,
    validationNotes: [],
  }));
}

const sentencesOf = (summary: string) => summary.split(/(?<=[.!?])\s+(?=[A-Z])/).filter(Boolean);
const agentTurns = (turns: Turn[]) => turns.filter((turn) => turn.speaker === "Agent");

/** Outbound if the agent opens by asking for a named person; inbound if the agent opens with a service greeting. */
export function inferDirection(turns: Turn[]): { direction: "inbound" | "outbound"; turnId: string } | null {
  const first = turns.find((turn) => !turn.isNote);
  if (!first) return null;
  if (first.speaker === "Agent" && /\b(could|can|may) I speak to\b|\bI'm calling from\b/i.test(first.text)) {
    return { direction: "outbound", turnId: first.id };
  }
  if (first.speaker === "Agent" && /how can I help/i.test(first.text)) return { direction: "inbound", turnId: first.id };
  if (first.speaker !== "Agent") return { direction: "inbound", turnId: first.id };
  return null;
}

const checkDirection: RuleCheck = (call, turns) => {
  const inferred = inferDirection(turns);
  if (!inferred) return [];
  const saysInbound = /\bcustomer (?:called|rang|contacted) the company\b/i.exec(call.summary);
  const saysOutbound = /\bcompany (?:called|rang|contacted)\b/i.exec(call.summary);
  const wrong = inferred.direction === "outbound" ? saysInbound : saysOutbound;
  if (!wrong) return [];
  return [
    {
      type: "contradiction",
      severity: "material",
      certainty: "definite",
      summaryExcerpt: wrong[0],
      turnIds: [inferred.turnId],
      rule: "Call direction",
      explanation:
        inferred.direction === "outbound"
          ? "The agent opens by asking for the customer by name, so the company called the customer."
          : "The agent opens with a service greeting, so the customer called the company.",
      suggestedCorrection:
        inferred.direction === "outbound" ? "The company called the customer." : "The customer called the company.",
    },
  ];
};

const checkArrearsAmounts: RuleCheck = (call, turns) =>
  sentencesOf(call.summary).flatMap((sentence) => {
    const clause = /[^,;.]*\b(arrears|balance|owed|outstanding)\b[^,;.]*£\s?[\d,]+[^,;.]*|[^,;.]*£\s?[\d,]+[^,;.]*\b(arrears|balance|owed|outstanding)\b[^,;.]*/i.exec(
      sentence,
    );
    if (!clause) return [];
    const evidence = turns.filter((turn) => /arrears|balance/i.test(turn.text) && /pounds|£/i.test(turn.text));
    return [
      {
        type: "rule_breach",
        severity: "minor",
        certainty: "definite",
        summaryExcerpt: clause[0].trim(),
        turnIds: evidence.map((turn) => turn.id),
        rule: "Arrears/Balances",
        explanation: "The rules forbid stating arrears or balance amounts; say only that arrears were discussed.",
        suggestedCorrection: "Arrears were discussed.",
      },
    ];
  });

const checkImmediatePaymentAmount: RuleCheck = (call) => {
  const match = /payment of £\s?[\d,.]+ (?:was )?(?:made|taken)|£\s?[\d,.]+ (?:payment )?(?:was )?(?:paid|taken) (?:today|during the call)/i.exec(
    call.summary,
  );
  if (!match) return [];
  return [
    {
      type: "rule_breach",
      severity: "minor",
      certainty: "definite",
      summaryExcerpt: match[0],
      turnIds: [],
      rule: "Immediate Payments",
      explanation: "Amounts for payments taken during the call must not be included; use “Payment made.”",
      suggestedCorrection: "Payment made.",
    },
  ];
};

const checkRiskOfFurtherAction: RuleCheck = (call, turns) => {
  const warning = agentTurns(turns).filter((turn) => /further action/i.test(turn.text));
  if (warning.length === 0 || /risk of further action/i.test(call.summary)) return [];
  return [
    {
      type: "omission",
      severity: "material",
      certainty: warning.some((turn) => /at risk of further action/i.test(turn.text)) ? "definite" : "uncertain",
      summaryExcerpt: null,
      turnIds: warning.map((turn) => turn.id),
      rule: "Risk of Further Action",
      explanation:
        "The agent mentions further action, but the summary does not say the customer was warned of the risk of further action. Check whether it was an explicit warning.",
      suggestedCorrection: "Add: the customer was warned that the account is at risk of further action.",
    },
  ];
};

const checkFurtherActionInPlan: RuleCheck = (call) => {
  const match = /(?<!risk of )further action/i.exec(call.summary);
  if (!match || /risk of further action/i.test(call.summary)) return [];
  return [
    {
      type: "rule_breach",
      severity: "minor",
      certainty: "uncertain",
      summaryExcerpt: match[0],
      turnIds: [],
      rule: "Terminology",
      explanation: "“Further action” must not describe the plan; use “next steps”, or “risk of further action” for a warning.",
      suggestedCorrection: null,
    },
  ];
};

const checkSignposting: RuleCheck = (call, turns) => {
  const mentions = agentTurns(turns).filter((turn) => /website|signpost/i.test(turn.text));
  if (mentions.length === 0 || /customer signposted/i.test(call.summary)) return [];
  return [
    {
      type: "omission",
      severity: "minor",
      certainty: mentions.some((turn) => /website[^.]*\b(help|support)\b|signpost/i.test(turn.text)) ? "definite" : "uncertain",
      summaryExcerpt: null,
      turnIds: mentions.map((turn) => turn.id),
      rule: "Signposting",
      explanation:
        "The agent mentions the company website or signposting, but the summary lacks the required phrase “customer signposted”. Check whether the website was offered for help or support.",
      suggestedCorrection: "Add: customer signposted to the company website.",
    },
  ];
};

const AMERICAN_SPELLINGS: Record<string, string> = {
  authorized: "authorised",
  authorize: "authorise",
  authorization: "authorisation",
  center: "centre",
  program: "programme",
  organization: "organisation",
  apologized: "apologised",
  recognized: "recognised",
  realized: "realised",
  prioritized: "prioritised",
  finalized: "finalised",
  behavior: "behaviour",
  favor: "favour",
  color: "colour",
  analyze: "analyse",
  canceled: "cancelled",
  canceling: "cancelling",
  enrollment: "enrolment",
  installment: "instalment",
  defense: "defence",
};

const checkBritishEnglish: RuleCheck = (call) =>
  Object.entries(AMERICAN_SPELLINGS).flatMap(([american, british]) => {
    const match = new RegExp(`\\b${american}\\b`, "i").exec(call.summary);
    if (!match) return [];
    return [
      {
        type: "rule_breach" as const,
        severity: "minor" as const,
        certainty: "definite" as const,
        summaryExcerpt: match[0],
        turnIds: [],
        rule: "Language",
        explanation: `The summary must use British English: “${british}”, not “${american}”.`,
        suggestedCorrection: british,
      },
    ];
  });

const checkFormat: RuleCheck = (call) => {
  const findings: RuleFinding[] = [];
  const sentenceCount = sentencesOf(call.summary).length;
  const isStandardCall = !/^(incomplete call|voicemail)/i.test(call.summary.trim());
  if (isStandardCall && (sentenceCount < 2 || sentenceCount > 5)) {
    findings.push({
      type: "rule_breach",
      severity: "minor",
      certainty: "definite",
      summaryExcerpt: null,
      turnIds: [],
      rule: "Tone & Format",
      explanation: `The summary has ${sentenceCount} sentences; the rules ask for 2–5.`,
      suggestedCorrection: null,
    });
  }
  const bullet = /^\s*[-*•]\s/m.exec(call.summary);
  if (bullet) {
    findings.push({
      type: "rule_breach",
      severity: "minor",
      certainty: "definite",
      summaryExcerpt: null,
      turnIds: [],
      rule: "Tone & Format",
      explanation: "The summary uses bullet points; the rules require complete sentences.",
      suggestedCorrection: null,
    });
  }
  const placeholder = /\b(not discussed|n\/a|not completed)\b/i.exec(call.summary);
  if (placeholder) {
    findings.push({
      type: "rule_breach",
      severity: "minor",
      certainty: "definite",
      summaryExcerpt: placeholder[0],
      turnIds: [],
      rule: "Critical Omission Rule",
      explanation: "Categories that weren't discussed must be left out, not marked as “not discussed” or “N/A”.",
      suggestedCorrection: null,
    });
  }
  const phone = /\b(?:\+44\s?|0)\d{3,4}\s?\d{3}\s?\d{3,4}\b/.exec(call.summary);
  if (phone) {
    findings.push({
      type: "rule_breach",
      severity: "material",
      certainty: "definite",
      summaryExcerpt: phone[0],
      turnIds: [],
      rule: "Anonymity",
      explanation: "Telephone numbers must never appear in the summary.",
      suggestedCorrection: null,
    });
  }
  return findings;
};

const RULE_CHECKS: RuleCheck[] = [
  checkDirection,
  checkArrearsAmounts,
  checkImmediatePaymentAmount,
  checkRiskOfFurtherAction,
  checkFurtherActionInPlan,
  checkSignposting,
  checkBritishEnglish,
  checkFormat,
];
