# Model comparison: Sonnet 5.5 vs Haiku 5.5

Both models ran the same prompt (`scripts/analyse.ts`, effort `high`, structured output) on all 20 calls. Outputs: `data/analysis.sonnet.json` and `data/analysis.haiku.json`. I hand-checked 6 calls against the transcripts.

| Call | My reading | Sonnet 5.5 | Haiku 5.5 |
|---|---|---|---|
| CALL-003 | Misleading: consent recorded although refused (T10); "no money for food" hardship omitted (T08); arrears figure stated | All three ✓, plus a weak "understanding" note (uncertain) | All three ✓, plus a false positive: a "no payment agreed" omission, which the omission rule says to leave out |
| CALL-019 | Misleading: inbound stated but the call was outbound (T01); consent wording missing (T09–T10); "2 pm" invented from "after two" (T15) | All three ✓ ("2 pm" rated minor) | All three ✓ ("2 pm" rated material) |
| CALL-007 | Accurate | Acceptable ✓ | Minor issues ✗ (a nitpick on the cause) |
| CALL-004 | Accurate apart from a minor generalisation ("reduced other spending", T10) | Acceptable (missed the minor point) | Caught the minor point, plus two weak findings |
| CALL-008 | Misleading: invented default notice | ✓ | ✓ |
| CALL-009 | Misleading: says the I&E was refused, but it was deferred (T12–T15) | ✓, plus two weak minor findings | ✓ |

**Result:** both caught all 6 material problems. Sonnet judged both accurate calls correctly (Haiku: 0 of 2), rated 5 of 20 calls acceptable (Haiku: 2), and ran about twice as fast (about 6s vs 13s per call). Both cost very little for 20 calls. **Sonnet 5.5 is used for `data/analysis.json`.**

The deterministic rule checks (`lib/rules.ts`) agree with Sonnet on 5 of 6 rule hits and add one it missed (CALL-011: "customer signposted" missing although the agent pointed to the website's support page, T15).

Limitations: this is a 6-call spot check, not a full evaluation. Severity calls on borderline items (e.g. "2 pm" vs "after two") differ between models and need reviewer judgement. That's why every AI finding is shown as "Suggested" and needs the reviewer to confirm it.
