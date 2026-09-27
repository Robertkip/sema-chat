/**
 * Model configuration and system prompt for Sema's chat.
 *
 * Everything the model sees lives here. FE-07 extends this module with tools,
 * so keep it the single place any model behaviour is decided.
 *
 * ── Provider ────────────────────────────────────────────────────────────────
 * Requests go through the Vercel AI Gateway, which is the AI SDK's default
 * provider — a bare `"anthropic/..."` string resolves to it with no extra
 * imports. Auth resolves in this order:
 *
 *   1. On Vercel: the deployment's OIDC token. No API key exists anywhere.
 *   2. Locally:   AI_GATEWAY_API_KEY, or a VERCEL_OIDC_TOKEN pulled by
 *                 `vercel env pull` (already in .env.local after `vercel link`).
 *
 * This is why no ANTHROPIC_API_KEY is required. The credential is read only in
 * this module's server-side consumers — it is never sent to the browser.
 *
 * ── Model ───────────────────────────────────────────────────────────────────
 * Change MODEL_ID and nothing else. Verified present on the gateway on
 * 2026-09-27; `anthropic/claude-opus-5.5` and `anthropic/claude-sonnet-5` are
 * also live if you want more capability or lower cost respectively.
 */

/** The one line to edit when changing models (gateway form). */
export const MODEL_ID = "anthropic/claude-opus-5";

/** Same model, named the way the direct Anthropic provider expects it. */
export const DIRECT_MODEL_ID = "claude-opus-5";

/**
 * Hard ceiling on a single reply. Generous because we stream — the usual
 * reason to keep this small is HTTP timeouts, which streaming avoids.
 */
export const MAX_OUTPUT_TOKENS = 4096;

/**
 * How long the route handler may stream before the platform kills it.
 * Mirrored as a literal in app/api/chat/route.ts — Next.js analyses segment
 * config statically and rejects an imported value, so the two must be kept
 * in step by hand.
 */
export const MAX_DURATION_SECONDS = 60;

/**
 * Sema's system prompt.
 *
 * Deliberately short. Long personas mostly add tokens to every single request
 * and constrain the model in ways that show up as stilted answers; the model
 * is already a good conversationalist without being told to be one.
 */
export const SYSTEM_PROMPT = `You are Sema, a helpful assistant.

Be direct and concrete. Prefer a short answer that is actually useful over a
long one that hedges. When you are uncertain, say so plainly rather than
padding the answer with caveats.

Format with Markdown when it genuinely helps — code in fenced blocks with a
language tag, lists for genuinely enumerable things. Do not format for its own
sake; most answers are just prose.`;

import { createAnthropic } from "@ai-sdk/anthropic";
import type { LanguageModel } from "ai";

/**
 * Pick a provider from whichever credential the environment actually has.
 *
 * Preferring a direct key when one is present means the app is not held
 * hostage by AI Gateway billing state: the gateway returns
 * `customer_verification_required` (HTTP 403) until a card is on file, even
 * though OIDC authentication itself succeeds.
 *
 *   ANTHROPIC_API_KEY set  → talk to Anthropic directly.
 *   otherwise              → a bare model string, which the AI SDK resolves
 *                            through the Vercel AI Gateway (OIDC on Vercel).
 *
 * Either way the credential is read in a server module only. Nothing here is
 * bundled into the client — `app/chat/chat.tsx` never imports this file.
 */
export function resolveModel(): LanguageModel {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey) return createAnthropic({ apiKey })(DIRECT_MODEL_ID);
  return MODEL_ID;
}
