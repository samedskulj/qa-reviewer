# Summary QA reviewer

A review tool for QA reviewers who check AI-generated collections-call summaries against their transcripts. It helps reviewers separate acceptable summarisation from a **meaningful loss or change of information** that could mislead a colleague.

**Live app:** https://qa-reviewer-two.vercel.app. No login needed. Reviewer decisions are saved in your own browser.

## How it works

1. **Queue** (`/`): all 20 calls, riskiest first (by suggested material, then minor issues), with the AI's suggested verdict and your review status.
2. **Call review** (`/calls/CALL-003`): the summary sits next to the transcript.
   - Each **suggested issue** shows its type (contradiction, unsupported, omission or rule breach), its **severity** (material = could mislead a colleague, minor = rule or wording breach) and its **certainty** (definite or uncertain). It also shows the summary excerpt and the evidence turn IDs.
   - Clicking a finding or an underlined excerpt highlights the evidence turns in the transcript and scrolls to them.
   - **Confirm** or **Dismiss** each suggestion, or use **Add finding** to record one it missed (turn IDs are checked against the transcript).
   - **Checked and OK** lists the required categories the AI verified as correct, with evidence. This shows what acceptable looks like.
   - Set the verdict (**Acceptable / Minor issues / Misleading**) and add an optional note. Everything is saved automatically.
3. **Export review** (queue header) downloads the full review as JSON and the confirmed findings as CSV.

Suggestions come from two sources:
- **AI review** (`scripts/analyse.ts`): Claude Sonnet 5.5, run offline once per call. It returns structured JSON validated with zod and retries once if the output is invalid. Turn IDs that don't exist in the transcript are dropped, and excerpts must appear in the summary; when either check fails, the finding is downgraded to "uncertain" and flagged. Results live in `data/analysis.json`, so the deployed app makes no API calls and holds no secrets.
- **Rule checks** (`lib/rules.ts`): plain code checks for call direction, arrears or immediate-payment amounts, missing "risk of further action" or "customer signposted", American spellings, length and format, and phone numbers. They run even when there's no AI analysis.

## Run locally

```bash
npm install
npm run dev          # http://localhost:3000
```

Checks: `npx tsc --noEmit`, `npm run lint`, `npm run build`.

Re-run the AI analysis (optional, as the results are committed). Add `ANTHROPIC_API_KEY=...` to `.env.local`, then:

```bash
npm run analyse -- --model sonnet --promote      # all calls -> data/analysis.json
npm run analyse -- --model haiku --calls CALL-003,CALL-019
```

## What I prioritised and why

- **Evidence first.** Every finding links to transcript turns, so a reviewer can verify it in seconds instead of rereading the whole call.
- **Severity, not just correctness.** The brief is about summaries that could *mislead*, so "material vs minor" is the main axis, and certainty is shown separately ("uncertain" is never presented as an error).
- **Precomputed AI with a human decision.** The UI loads instantly and the deployed app has no API key. The AI only suggests; the reviewer confirms, dismisses or adds findings and sets the verdict.
- **Measured model choice.** I compared Sonnet 5.5 and Haiku 5.5 on all 20 calls and hand-checked 6 of them ([docs/model-comparison.md](docs/model-comparison.md)). Both caught every material error; Sonnet was better at recognising accurate summaries, so it's used.

## Material assumptions

- The transcript is the only source of truth. Hold-music hallucinations (e.g. CALL-003 T15) are ignored, as the rules instruct.
- "Material" means a colleague acting on the summary could do something different: call direction, third party or authority, consent, vulnerability or hardship, promise amount, date or method, payment made, hold length, next contact date or time, warnings, I&E refusal. A rule breach that changes no facts (such as stating the arrears amount) is "minor".
- A category that wasn't discussed is never an omission. "No DPA stated with agent" is correct when verification is absent (per the readme).
- Invented precision (e.g. "after two" becoming "2 pm") is an *unsupported* claim. Its severity is a judgement call, which is why the reviewer decides.
- Decisions are stored per browser (localStorage); there is no shared database or login. Export is the hand-off.

## What I checked

- Hand-checked 6 calls (CALL-003, 004, 007, 008, 009, 019) against the transcripts and both models ([docs/model-comparison.md](docs/model-comparison.md)).
- Rule checks run against all 20 calls and agree with the AI on 5 of 6 hits. They add one the AI missed (CALL-011 signposting).
- In the browser (locally): the queue; evidence highlighting and scrolling; confirm and dismiss; verdict persistence across a reload; add-finding validation (rejects `T99`, normalises `t8` to `T08`); stacked layout and no horizontal scroll at 375px; dark mode.
- `tsc`, `eslint` and `next build` pass. The live deployment is checked after each push.

## Known limitations

- The AI analysis is a 6-call spot check, not a full evaluation. It still produces some weak minor findings (e.g. CALL-009) and occasionally misses a minor one (CALL-004 "reduced other spending").
- No shared state or audit trail across reviewers. Clearing browser data loses decisions unless they were exported.
- No in-app re-run of the analysis. It's an offline script by design (no secrets on Vercel).
- I only reviewed the export code; I didn't click-test the download in a browser.
- Built from shadcn/ui components directly rather than starting from a Shadcnblocks block, to save time.

## What I'd tackle next

1. A labelled gold set for all 20 calls and a small eval script (precision and recall per severity) to tune the prompt and compare models properly.
2. Shared persistence (a database plus reviewer identity) with an audit trail, and a reviewer-vs-AI agreement view.
3. A "corrected summary" field, so a confirmed finding produces the text a colleague should actually read.
4. Keyboard shortcuts (j/k between findings, c/d to confirm or dismiss) for faster review.

## Project layout

- `app/`: routes (`/` for the queue, `/calls/[id]` for review)
- `components/call-review/`: summary, findings, checks, verdict and transcript panels
- `lib/`: zod schemas, data loading, transcript parsing, rule checks, review store
- `scripts/analyse.ts`: offline AI analysis
- `data/`: calls, rules, precomputed analysis (Sonnet promoted, Haiku kept for comparison)
- `examples/`: the supplied files, unchanged
- `DESIGN.md`: design system
