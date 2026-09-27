import type { UIMessage } from "ai";
import { createChatStream } from "@/lib/chat-stream";
import { InjectedFailure, parseFailureMode } from "@/lib/sabotage";

/**
 * Next.js reads segment config at build time by static analysis, so this must
 * be a literal — an imported constant fails the build with "Invalid segment
 * configuration export". Keep it in step with MAX_DURATION_SECONDS in
 * lib/chat-config.ts.
 */
export const maxDuration = 60;

export async function POST(req: Request) {
  let messages: UIMessage[];

  try {
    const body: unknown = await req.json();
    if (
      typeof body !== "object" ||
      body === null ||
      !("messages" in body) ||
      !Array.isArray((body as { messages: unknown }).messages)
    ) {
      return Response.json({ error: "Expected { messages: UIMessage[] }" }, { status: 400 });
    }
    messages = (body as { messages: UIMessage[] }).messages;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // ?fail= lets a reviewer reproduce each failure state without editing code.
  // See lib/sabotage.ts; every mode only degrades the caller's own request.
  const failureMode = parseFailureMode(new URL(req.url).searchParams.get("fail"));

  if (failureMode === "rate-limit") {
    return Response.json(
      { error: "Rate limit exceeded. Wait a moment and try again." },
      { status: 429, headers: { "retry-after": "5" } },
    );
  }

  try {
    return await createChatStream({ messages, abortSignal: req.signal, failureMode });
  } catch (error) {
    if (error instanceof InjectedFailure) {
      return Response.json({ error: error.message }, { status: 503 });
    }
    throw error;
  }
}
