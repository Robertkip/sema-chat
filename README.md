# Sema

An AI chat product with a streaming interface, built for the FlyRank AI Internship
Front-end AI Engineering track.

*Sema* is Swahili for "speak".

## What this is

A production-quality chat interface for a large language model. The focus of this
project is the **front end**: streaming token rendering, structured tool output,
accessible components, and the error and empty states that separate a demo from a
product.

## Status

Early setup. The application skeleton lands in FE-05; the streaming chat interface
lands in FE-06.

## Stack

| Concern | Choice |
|---|---|
| Framework | Next.js (App Router) |
| Language | TypeScript |
| UI | React + Tailwind CSS |
| Model access | Anthropic Claude via the AI SDK |
| Hosting | Vercel |

## Getting started

**Prerequisites:** Node.js 20 LTS or newer, npm 10+, and an Anthropic API key.

```bash
git clone https://github.com/Robertkip/sema-chat.git
cd sema-chat
npm install
cp .env.example .env.local   # then add your ANTHROPIC_API_KEY
npm run dev
```

Then open <http://localhost:3000>.

> The app skeleton lands in FE-05. Until then `npm run dev` has nothing to serve —
> the steps above are the contract the skeleton will satisfy.

## Roadmap

This repo is built incrementally across the Front-end AI Engineering track:

- [x] **FE-01** — Environment and AI toolchain
- [ ] **FE-04** — The AI-assisted workflow drill
- [ ] **FE-05** — Capstone skeleton, deployed
- [ ] **FE-03** — Accessible component fundamentals
- [ ] **FE-06** — Streaming AI chat interface
- [ ] **FE-07** — Tool results and structured output in the UI
- [ ] **FE-08** — Error states, empty states, edge cases
- [ ] **FE-09** — Testing pass
- [ ] **FE-10** — Accessibility and performance audit
- [ ] **FE-11** — Production deployment and README

## License

MIT — see [LICENSE](LICENSE).


## Failure states

The gap between a demo and a product is what happens when things go wrong, so
every failure below is reproducible from a URL rather than described. `?fail=`
is forwarded from the chat page to the route; see [`lib/sabotage.ts`](lib/sabotage.ts).
Each mode only degrades the caller's own request.

| Sabotage | How to trigger | What you should see |
|---|---|---|
| Happy path | `/chat` | 17 token frames, reply streams in |
| Fails before any token | `/chat?fail=start` | HTTP 503, designed error, retry names the message |
| Dies mid-stream | `/chat?fail=midstream` | partial reply **stays on screen**, error below it, retry |
| Rate limited | `/chat?fail=rate-limit` | HTTP 429 with `retry-after`, designed error |
| Slow first token | `/chat?fail=slow` | thinking indicator holds for 3s, then hands off |
| Tool failure | ask it to inspect a host that does not exist | tool's own `output-error` card, not a crash |
| Malformed request | `POST /api/chat` with `not json` | HTTP 400, `{"error":"Invalid JSON body"}` |
| Missing field | `POST /api/chat` with `{"foo":1}` | HTTP 400, names the expected shape |

Verified in that order against a running server. Console is clean on the happy
path.

### Design decisions

**The retry names what it will retry.** "Retry" alone is ambiguous when a
conversation has ten turns, so the error card shows the exact message that will
be resent, truncated to 80 characters. The button guards against a double click
with a `retrying` flag rather than relying on the disabled attribute alone.

**A mid-stream failure keeps the partial reply.** The injected failure enqueues
an `error` *part* rather than calling `controller.error()`. Erroring the stream
aborts the pipe, so the failure escapes as a rejection on the response body and
`onError` never runs — the client gets a broken socket instead of a designed
error. An error part stays inside the protocol and becomes a frame the UI can
render, with everything already streamed still on screen.

**Empty states are onboarding.** The first-run state offers three click-to-fill
prompts that put text in the composer and focus it, rather than saying "no
messages yet" and stopping.

**Skeletons match the real layout.** The Suspense fallback reuses the chat's
container, bubble geometry and composer height, so the handoff to real content
does not shift anything.

### Mobile Safari

- `interactiveWidget: "resizes-content"` in the viewport export, so the
  on-screen keyboard shrinks the viewport instead of overlaying the composer.
- `100dvh` rather than `100vh`, so the toolbar collapsing does not clip the page.
- `overscroll-contain` on the scroll container, so rubber-band scrolling does
  not fight the auto-scroll pin.
- `pb-[env(safe-area-inset-bottom)]` on the composer for the home indicator.
- 16px input font, below which iOS zooms the page on focus.

## Tool contract

The chat route exposes one server-side tool. Definition:
[`lib/tools/inspect-url.ts`](lib/tools/inspect-url.ts); registered in
[`lib/chat-stream.ts`](lib/chat-stream.ts); rendered by
[`app/chat/tool-inspect-url.tsx`](app/chat/tool-inspect-url.tsx).

### `inspectUrl`

Fetches a public web page and reports what a crawler sees.

**Input** — one field on purpose. Every field added is a field the model can
hallucinate.

```ts
z.object({
  url: z.string().url()
    .describe("The full public http(s) URL to inspect, including the scheme."),
})
```

**Returns**

```ts
type InspectResult = {
  url: string;               // resolved, after redirects
  status: number;            // HTTP status
  elapsedMs: number;         // time to first byte of the body
  title: string | null;      // null when the page has no <title>
  description: string | null;// meta description, falling back to og:description
  findings: {
    label: string;           // e.g. "Has a meta description"
    pass: boolean;
    detail: string;          // always populated, including on a miss
  }[];
  score: number;             // 0-100, share of findings passed. never null
}
```

Both nullable fields have a rendering plan: the card shows "Untitled page" and
"No meta description" rather than collapsing.

**Throws** `InspectError` with user-facing text for a malformed URL, a
non-http scheme, an unreachable host, or an 8-second timeout. A non-2xx
response is *not* an error — it comes back as a failed finding, because a 404
page is still a page worth reporting on.

**Error visibility.** `toUIMessageStream` masks every error as
"An error occurred." by default so server internals never reach the browser.
That default is correct but hides the curated messages, so the `onError`
handler surfaces `InspectError` text only; anything else stays masked.

### Lifecycle states

All four render distinctly, and each answers a different question:

| State | Question | Treatment |
|---|---|---|
| `input-streaming` | what is it doing? | grey rail, skeleton URL filling in |
| `input-available` | with what input? | accent rail, committed URL, indeterminate bar |
| `output-available` | what came back? | score ring + findings table |
| `output-error` | what went wrong? | red rail, the reason, the URL tried, a next step |

They share one shell — same border, padding and header row — so the transition
morphs rather than jumping. Entrance is a 200ms rise-and-fade, suppressed under
`prefers-reduced-motion`.

