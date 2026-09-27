# CLAUDE.md

Working conventions for this repository. Read this before making changes.

## Project

**Sema** — a streaming AI chat product. This is the capstone repo for the FlyRank
Front-end AI Engineering track. The front end is the deliverable; treat UI quality,
accessibility, and state handling as the primary concerns, not afterthoughts.

## Stack

- **Next.js (App Router)** with **TypeScript** in strict mode
- **React** function components with hooks — no class components
- **Tailwind CSS** for styling — no CSS modules, no styled-components
- **AI SDK** for model calls and streaming
- **Vercel** for deployment

## Conventions

### Commits

[Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/).
The git history on this repo is evaluated, so keep it clean and readable.

```
feat:     a new user-facing capability
fix:      a bug fix
docs:     documentation only
style:    formatting, no code change
refactor: neither fixes a bug nor adds a feature
test:     adding or correcting tests
chore:    tooling, deps, config
perf:     a performance improvement
a11y:     an accessibility improvement
```

Write the subject in the imperative mood, lowercase, no trailing period.
Keep it under 72 characters.

### Code

- TypeScript strict. Do not use `any`; reach for `unknown` and narrow it.
- Components are named exports in `PascalCase`; files are `kebab-case.tsx`.
- Server Components by default. Add `"use client"` only where interactivity
  genuinely requires it.
- Colocate a component's types with the component unless shared.
- Prefer composition over configuration — small components over prop explosions.

### Accessibility

Non-negotiable; it is separately graded in FE-03 and FE-10.

- Semantic HTML first. Reach for ARIA only when no element fits.
- Every interactive element is keyboard reachable with a visible focus ring.
- Streaming responses announce via an `aria-live="polite"` region.
- Colour contrast meets WCAG AA (4.5:1 for body text).
- Respect `prefers-reduced-motion` for every animation.

### State and errors

Every async surface handles four states explicitly: **loading, empty, error, success**.
An unhandled rejection reaching the console is a bug. This is graded in FE-08.

### Secrets

API keys live in `.env.local`, which is gitignored. Never commit a real key.
`.env.example` holds the variable names with empty values.

## Form rules

Learned the hard way in the FE-04 drill; see [WORKFLOW.md](WORKFLOW.md). Each of these
failed a real review, so each one can fail a review again.

1. **Forms use `react-hook-form` + `zod` through `zodResolver`.** No hand-rolled
   `useState` validation, no validation logic inside the submit handler. The schema is
   the single source of truth and lives in `lib/`.

2. **Every `<button>` inside a `<form>` declares an explicit `type`.** A button with no
   `type` defaults to `submit`. A Cancel button that submits the form is the exact bug
   this rule exists to prevent.

3. **Numeric inputs parse through `z.coerce.number()` before any comparison.** A number
   input hands you a string, and `"10" > "2"` is `false`. Never apply a relational
   operator to `e.target.value`.

4. **Every control has an `id` from `useId()` and a matching `<label htmlFor>`.** Tests
   query controls with `getByLabelText`, so a missing association fails the suite rather
   than silently shipping an unnamed field. `placeholder` is never a label.

5. **Inputs holding secrets render as `type="password"`** with an explicit
   `aria-pressed` reveal toggle.

6. **Every async form reports status through a `role="status"` `aria-live="polite"`
   region.** Never `alert()`.

## Definition of done

- [ ] `npm run build` passes clean
- [ ] `npm run lint` passes clean
- [ ] Keyboard-navigable, visible focus states
- [ ] Loading, empty, and error states handled
- [ ] Works at 375px width
- [ ] Commit message follows Conventional Commits
