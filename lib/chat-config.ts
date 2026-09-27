/**
 * Model configuration and system prompt for Sema's chat.
 *
 * Everything the model sees lives here. FE-07 extends this module with tools,
 * so keep it the single place any model behaviour is decided.
 *
 * ── Provider ────────────────────────────────────────────────────────────────
 * Mistral, via the AI SDK's Mistral provider. Two ways to authenticate:
 *
 *   1. MISTRAL_API_KEY  → talk to Mistral directly. Used when the variable is
 *                         set, which is the normal case locally and on Vercel.
 *   2. no key           → fall back to a bare "mistral/..." model string, which
 *                         the AI SDK resolves through the Vercel AI Gateway
 *                         (OIDC on a Vercel deployment, no key needed).
 *
 * The gateway route is a genuine fallback rather than the default because the
 * gateway answers `customer_verification_required` (HTTP 403) until a card is
 * on file, even when OIDC authentication itself succeeds.
 *
 * The key is read here and only here, in a module that runs on the server.
 * `app/chat/chat.tsx` never imports this file, so nothing reaches the browser.
 *
 * ── Model ───────────────────────────────────────────────────────────────────
 * Change MODEL_ID and nothing else. Verified against this account on
 * 2026-09-27 by calling each candidate: `ministral-3b-latest` and
 * `ministral-8b-latest` answer, while `mistral-small-latest` and
 * `mistral-medium-latest` return HTTP 429 "Rate limit exceeded" (code 1300)
 * on the current plan. Move up to `mistral-medium-latest` once the account
 * is upgraded — it is a one-word change here.
 */

import { createMistral } from "@ai-sdk/mistral";
import type { LanguageModel } from "ai";

/** The one line to edit when changing models. */
export const MODEL_ID = "ministral-8b-latest";

/** Nearest equivalent addressed through the Vercel AI Gateway. */
export const GATEWAY_MODEL_ID = "mistral/ministral-8b";

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

/** Pick a provider from whichever credential the environment actually has. */
export function resolveModel(): LanguageModel {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (apiKey) return createMistral({ apiKey })(MODEL_ID);
  return GATEWAY_MODEL_ID;
}
