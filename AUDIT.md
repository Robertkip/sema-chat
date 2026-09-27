# FE-10 — Accessibility and performance audit

Lighthouse **mobile preset** against the deployed production URL
`https://sema-chat-pi.vercel.app`, six pages, before and after. Raw reports are
committed under `docs/audit/before/` and `docs/audit/after/` — every number
below can be recomputed from them.

## Scores

| Page | Performance | Accessibility | Best practices | SEO |
|---|---|---|---|---|
| `/` | 92 → **97** (+5) | 95 → **100** (+5) | 96 → **96** | 100 → **100** |
| `/chat` | 85 → **88** (+3) | 96 → **100** (+4) | 96 → **96** | 100 → **100** |
| `/scene` | 91 → **97** (+6) | 96 → **100** (+4) | 96 → **96** | 100 → **100** |
| `/playground` | 93 → **96** (+3) | 96 → **100** (+4) | 96 → **96** | 100 → **100** |
| `/motion` | 95 → **92** (-3) | 96 → **100** (+4) | 96 → **96** | 100 → **100** |
| `/settings` | 90 → **95** (+5) | 96 → **100** (+4) | 96 → **96** | 100 → **100** |

Rubric: 90+ is the bar, 80 the absolute minimum. **Accessibility is 100 on all
six pages.** Performance is 92–97 on five; `/chat` is the exception, discussed
below.

## What was wrong, and what changed

### 1 · Every page shipped 1.09:1 contrast in light mode

The biggest finding, and a regression I introduced myself. Running
`shadcn init` during FE-03 rewrote `app/globals.css` and inserted its own
`--accent: oklch(0.97 0 0)` — a near-white surface tint — into `:root`. That
**replaced** the brand colour. Every `bg-brand`/`text-brand-ink` pair became
white text on `#f5f5f5`.

Lighthouse flagged `color-contrast` on all six pages. It shipped unnoticed
because the dark-mode block still carried the original value, so the bug was
invisible to anyone developing in dark mode — which I was.

Fixed by renaming the brand token to `--brand`, which cannot collide with a
design system's own scale.

| | Before | After |
|---|---|---|
| Light mode | 1.09:1 ✗ | **5.17:1** ✓ |
| Dark mode | 7.78:1 ✓ | 7.78:1 ✓ |

### 2 · The 3D fallback poster used the wrong muted colour

`/scene`'s static poster hardcodes a dark background but styled its caption
with the theme's `--ink-muted`, which resolves to the *light* value: `#5c5c66`
on `#0a0a0b`, **2.99:1**. Pinned to a fixed light muted colour — **7.54:1**.

That single fix took `/scene` accessibility from 96 to 100.

### 3 · Form dependencies loaded on every route

`react-hook-form` and `zod` were hoisted into a chunk that all six pages
downloaded, including the home page, which has no form. The settings form now
loads on demand.

### 4 · Barrel imports

`optimizePackageImports` enabled for `ai`, `@ai-sdk/react` and
`@react-three/drei`, so importing one symbol no longer pulls the whole module
graph.

## `/chat` performance: 85 → 88 (median of three)

`/chat` is borderline and noisy, so it is reported as the median of three
consecutive runs — 86, 88, 95 — rather than a single flattering number. The
committed report is the median run. It clears the rubric's 80 minimum and
sits just under the 90 target. The honest reason:

| Metric | Value |
|---|---|
| First Contentful Paint | 1.1 s |
| Largest Contentful Paint | 2.5–2.6 s |
| **Total Blocking Time** | **350–420 ms** |
| Cumulative Layout Shift | **0** |

TBT dominates, and it is hydration of the AI SDK — a streaming chat client
genuinely needs `ai` + `@ai-sdk/react` + `swr` on the client, about 96 KB gz
more than any other route. Splitting out the form helped other pages but not
this one, because the remaining weight is load-bearing.

I could have bought the last few points by deferring hydration until the
composer is focused, but that would mean a chat box you cannot type into for a
second after it appears. That trades a real user cost for a synthetic score, so
I did not do it. Worth noting CLS is a clean 0, which is the metric that
actually reflects how the page feels.

**What I would do next:** move `StreamingMarkdown` and the tool renderer behind
a dynamic import so they load with the first message rather than at boot, and
measure whether a server-rendered empty state pulls LCP under 2 s.

## Accessibility work beyond contrast

- **Landmarks:** one `<nav aria-label="Primary">`, one `<main id="main">`, a
  skip link as the first tab stop. A nested `<main>` on the settings page was
  removed during FE-05.
- **Streamed output announced politely.** The finished reply goes to an
  `aria-live="polite"` region, not every token — announcing each delta would
  make a screen reader unusable. The region is cleared after announcing, so the
  text is not duplicated in the reading order; that duplication was a real
  defect found during FE-08.
- **The stop button is keyboard reachable** and swaps to Send on completion,
  covered by an e2e test.
- **Every interactive control has an accessible name** — asserted for the whole
  chat page by an e2e test that enumerates every button, link and input.

## Keyboard-only pass

Automated rather than described, in `e2e/chat.spec.ts`:

1. Tab from the top — the skip link is the first stop.
2. Keep tabbing until focus reaches the composer. No mouse.
3. Type, press Enter to send.
4. Assert the message appears, the reply arrives, the composer re-enables.

The whole primary flow completes without a click. 4 e2e tests, all passing.

## On WAVE

WAVE is a browser extension and cannot run in this environment, so I used
**axe-core** — the engine behind Lighthouse's accessibility category — across
all six pages instead. Substituting the tool is worth stating plainly rather
than implying a WAVE run happened. Accessibility scores of 100 mean zero axe
violations on every audited page.

## Reproducing

```bash
CHROME_PATH=$(which chrome) npx lighthouse https://sema-chat-pi.vercel.app/chat \
  --only-categories=performance,accessibility,best-practices,seo --quiet
```
