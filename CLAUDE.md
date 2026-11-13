# CLAUDE.md

## Stack
- Next.js (App Router) + TypeScript (strict) + Tailwind + shadcn/ui
- zod for validation at every boundary (request bodies, LLM output, sample data)
- Deployed on Vercel, auto-deploys on push to `main`
- Sample data lives in `/data` as JSON. No database.

## Commands
- `npm run dev`: local dev server
- `npm run lint`: lint
- `npx tsc --noEmit`: typecheck
- `npm run build`: production build (same as Vercel runs)

**Before saying a task is done:** run typecheck + lint + build and fix every error. Never leave the build broken.

## Design system
The design system lives in `DESIGN.md` (decisions and rules) and `app/globals.css` (the shadcn theme tokens that implement them). Read `DESIGN.md` before any UI work.

**If `DESIGN.md` doesn't exist yet, create it before building any UI:**
1. Base it on the provided design, mockup or style guide if there is one. Otherwise propose one that fits what I have told you about the app (who uses it, where, what it should feel like); if that is unclear, ask me first.
2. Start from a **Shadcnblocks style and theme**, not from scratch:
   - **Style** (`"style"` in `components.json`, e.g. `"radix-mira"`): the UI library (Radix unless there's a reason) plus one of Vega (clean, neutral), Nova (reduced padding), Maia (rounded, generous spacing), Lyra (boxy and sharp, for mono fonts), Mira (compact), Luma (fluid, soft), Sera (editorial, typographic) or Rhea (compact Luma). Pick it at `npx shadcn@latest init`, before adding any components or blocks: blocks are fetched in this style, and changing it later means re-adding them.
   - **Theme** (https://www.shadcnblocks.com/themes): propose 2-3 that fit, with a line on why each. Install the chosen one with `npx shadcn@latest add @shadcnblocks/theme/<name>` (e.g. `modern-minimal`). It sets all light and dark tokens in `app/globals.css`, including radius, shadows, charts, sidebar and the `--font-display` / `--font-text` fonts. If I customized a theme on the site, use the install command it gave me.
   - Every theme page has a ready-made DESIGN.md ("Copy DESIGN.md"). If I paste it in, keep it as the base and put the project-specific part below at the top.
3. Keep the project-specific part to about one page:
   - **Personality:** 3 adjectives, and 1-2 existing products it should feel like.
   - **Style and theme:** which ones, and any token overrides (e.g. a brand primary, `--radius`), with light and dark values. Add semantic colors the theme lacks (success, warning).
   - **Typography:** the theme's fonts loaded with `next/font` and mapped to `--font-display` / `--font-text`, and which Tailwind sizes/weights to use for page title, section heading, body, label and caption.
   - **Density:** comfortable vs. compact and the spacing rhythm, consistent with the style.
   - **Patterns:** button hierarchy (one primary action per view), which shadcn component is used for what (e.g. Sheet for details, Dialog for confirmations, Sonner for feedback), and how loading, empty and error states look.
   - **Motion and voice:** how much motion, microcopy tone, sentence case.
4. Show me the proposal (style, theme options, overrides, short summary) and wait for my approval.
5. Then set the style (at `init`, or in `components.json` if no components are added yet), install the theme, apply the overrides in `app/globals.css` (`:root` and `.dark`), and write `DESIGN.md`.

**Once it exists:**
- Follow it. Use only its tokens and patterns: no one-off colors, font sizes or radii.
- If a screen needs something it doesn't cover, propose an addition to `DESIGN.md` instead of improvising.
- When the design changes, update `DESIGN.md` and the tokens in the same commit.

## Building UI
Build with **Tailwind + shadcn/ui + Shadcnblocks**, styled by the design system:
- Start pages and sections from a **Shadcnblocks** block (https://www.shadcnblocks.com/blocks): application shell, sidebar, dashboard, data table, settings, login/signup, hero, pricing, etc. Pick the closest one, then adapt it to `DESIGN.md` (its tokens, type scale and patterns). Don't design layouts from scratch when a block fits.
- The `@shadcnblocks` registry is configured in `components.json`. Pro blocks need the API key header:
  ```json
  {
    "registries": {
      "@shadcnblocks": {
        "url": "https://www.shadcnblocks.com/r/{style}/{name}",
        "headers": { "Authorization": "Bearer ${SHADCNBLOCKS_API_KEY}" }
      }
    }
  }
  ```
  Without a Pro account, use `"@shadcnblocks": "https://www.shadcnblocks.com/r/{style}/{name}"` (free blocks only). `SHADCNBLOCKS_API_KEY` is set by me in `.env.local`; it is only used by the CLI, so it never goes to Vercel or into app code.
- Find blocks with `npx shadcn@latest search @shadcnblocks -q "<keyword>"` and check one with `npx shadcn@latest view @shadcnblocks/<block>` before adding it.
- Add blocks with `npx shadcn@latest add @shadcnblocks/<block>` (e.g. `@shadcnblocks/hero1`) and components with `npx shadcn@latest add <component>`. Adding blocks and components this way is allowed without asking, even if it installs their dependencies.
- Installed blocks are our code: adapt them freely in `components/blocks/`, or move what you keep into feature components.
- Use shadcn components (Button, Card, Badge, Tabs, Dialog, Sheet, Table, Tooltip, ScrollArea, Resizable, Sonner, etc.) instead of hand-writing equivalents.
- Compose and wrap components in `components/`; avoid heavily editing files in `components/ui/`.
- Style with Tailwind utilities and the shadcn theme tokens (`bg-background`, `text-muted-foreground`, `border`, `bg-primary`, etc.). No hard-coded hex colors, no inline styles, no separate CSS files unless necessary.
- Use `cn()` from `lib/utils` to merge class names.
- Icons: `lucide-react` (shadcn default).
- Support light and dark mode through the theme tokens.
- Responsive by default: usable at mobile width, no horizontal page scroll.
- Keep it clean and consistent: one spacing scale, one radius, restrained use of color. Use color to carry meaning (status, errors), not decoration.

## Next.js conventions
- Server Components by default. Add `"use client"` only for interactivity (state, effects, event handlers), and keep client components small and close to the leaves.
- Data loading from `/data` happens on the server; pass plain props down.
- Server logic goes in Route Handlers (`app/api/**/route.ts`) or Server Actions.
- Modules that touch secrets or the LLM start with `import "server-only";`.
- Use `next/font` for fonts and `next/image` for images. No layout shift.
- Every async UI has loading, empty and error states.
- Folder layout:
  - `DESIGN.md`: design system (see above)
  - `app/`: routes and layouts
  - `components/`: UI components (`components/ui/` = shadcn)
  - `lib/`: shared logic, schemas (`lib/schema.ts`), LLM calls (`lib/llm.ts`), `lib/utils.ts` (`cn`)
  - `data/`: sample data and precomputed analysis
  - `scripts/`: one-off scripts (e.g. precompute AI analysis)

## Vercel best practices
- **Secrets:** env vars without a prefix are server-only. Never prefix a secret with `NEXT_PUBLIC_`; that inlines it into the client bundle.
- Never log, print or echo secret values. Never open or `cat` `.env*` files.
- Set env vars in the Vercel dashboard / `vercel env`. Keep `.env.local` out of git.
- LLM routes: set `export const maxDuration = 60;` (or as plan allows) and handle timeouts.
- Prefer static rendering where possible; mark routes dynamic only when they need to be.
- Use Vercel function logs to debug production failures. Always verify on the live URL after deploying, not just locally.

## LLM rules
- LLM calls only happen server-side.
- Ask for structured JSON and validate it with zod. On invalid output: retry once, then return a clear error.
- Always set a timeout. On failure, the UI degrades gracefully: the user can still do the task manually.
- Never trust model-cited references (IDs, quotes, sources). Validate them against the source data and drop or flag invalid ones.
- AI assists; it never takes irreversible or final decisions on the user's behalf.
- Precompute analysis for sample data into `/data` so the UI loads instantly. Live re-run is a secondary path.

## Code style
- TypeScript strict. No `any`; use `unknown` + zod parsing.
- Derive types from zod schemas (`z.infer`) instead of duplicating them.
- Small, focused components and functions. Descriptive names over comments.
- Accessible by default: semantic HTML, labelled controls, visible focus, keyboard support for the main actions.

## Working rules
- Plan before coding non-trivial changes. Wait for my approval of the plan.
- Make small, focused changes. Don't refactor unrelated code.
- Do not add dependencies without asking first (shadcn components/blocks via the CLI are the exception).
- If something in my request or the data is ambiguous, state your assumption explicitly instead of guessing silently.
- If you're unsure an approach will work, say so.

## Git and commits
Use **Conventional Commits**: `<type>(optional scope): <description>`

| Type | Use for |
|---|---|
| `feat` | a new user-facing feature |
| `fix` | a bug fix |
| `refactor` | code change that neither fixes a bug nor adds a feature |
| `style` | formatting, CSS/visual-only changes |
| `docs` | README, CLAUDE.md, comments |
| `test` | adding or fixing tests |
| `perf` | performance improvement |
| `chore` | tooling, config, dependencies, build |

Rules:
- Imperative mood, lowercase, no trailing period, subject ≤ 72 chars.
  - ✅ `feat(review): link summary claims to transcript evidence`
  - ✅ `fix(api): drop hallucinated ids from llm output`
  - ❌ `updated stuff`, `Fixed bug.`, `WIP`
- One logical change per commit. Commit after each working slice.
- Add a body when the *why* isn't obvious from the subject.
- The build must pass before every commit.
- Never commit `.env*`, secrets, or generated build output.
- Don't commit or push unless I ask. When a slice is done, propose a commit message.
- Never force-push, rewrite pushed history, or amend pushed commits.