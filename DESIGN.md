# DESIGN.md: Summary QA reviewer

## Personality
**Calm, precise, trustworthy.** It should feel like Linear crossed with a GitHub pull-request review: dense, quiet chrome, and evidence one click away. Colour is reserved for meaning (severity and status), never decoration.

## Style and theme
- **Style:** `radix-mira` (compact), Radix primitives, lucide icons.
- **Theme:** Shadcnblocks `modern-minimal`: neutral greys with one blue primary, radius `0.375rem`.
- **Added semantic tokens** (`app/globals.css`, light / dark):
  - `--success`: `oklch(0.527 0.137 150)` / `oklch(0.696 0.149 162)`, for an acceptable verdict or a confirmed-OK check.
  - `--warning`: `oklch(0.769 0.165 70)` / `oklch(0.828 0.189 84)`, for minor issues and uncertain findings.
  - `--destructive` (from the theme), for material findings and a "Misleading" verdict.
- **Severity mapping (the only use of colour):** material = destructive, minor = warning, OK = success, uncertain = a dashed outline badge in the same hue.

## Typography
- Fonts come from `next/font`: Inter via `--font-inter`, which feeds `--font-sans`, `--font-display` and `--font-text`. JetBrains Mono via `--font-jetbrains` feeds `--font-mono`.
- Page title: `text-xl font-semibold tracking-tight`.
- Section heading: `text-sm font-semibold`.
- Body (transcript, summary): `text-sm leading-relaxed`.
- Label: `text-xs font-medium text-muted-foreground`.
- Caption, timestamps and turn IDs: `text-xs font-mono text-muted-foreground`.

## Density
Compact, to match Mira. The spacing rhythm is 4/8/12/16 (`gap-1/2/3/4`, `p-3`/`p-4` on panels). Panels are separated by `border`, not shadows. The max content width is the full viewport on desktop. Panels stack at `< lg`.

## Patterns
- **One primary action per view.** On the call page, that's "Save verdict / Next call". Confirm and dismiss on a finding are `outline` / `ghost` buttons.
- **Components:**
  - `Table` for the queue.
  - `Badge` for type, severity and certainty.
  - `ScrollArea` for the transcript and findings panels.
  - `Collapsible` for "Checked & OK".
  - `Dialog` for the add-finding form.
  - `Select` / `RadioGroup` for the verdict.
  - `Sonner` for save/export feedback.
  - `Tooltip` for rule references.
- **Evidence linking:** clicking a finding highlights its turns in the transcript (`bg-accent`) and scrolls to them. Turn IDs render as mono chips.
- **States:**
  - Empty (no findings): a muted line, "No issues found by automated checks. Review the transcript before marking acceptable."
  - Error (analysis missing or invalid for a call): an inline muted banner, so manual review is still possible.
  - Loading: data is static, so there's no spinner. Skeletons are used only where a client component hydrates stored state.

## Motion and voice
- Minimal motion: only the default shadcn transitions, plus smooth scrolling to evidence.
- Microcopy is plain, British English, in sentence case. Name the problem rather than the tool: write "Contradicts T10", not "AI detected an inconsistency". AI output is always labelled "Suggested", and the reviewer makes the final call.

## Theme mode
Light and dark follow the system preference by default, handled by `next-themes` (`attribute="class"`, which toggles `.dark` on `<html>`). There's a theme toggle in the header.
