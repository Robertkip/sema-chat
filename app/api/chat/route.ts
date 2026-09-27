import type { UIMessage } from "ai";
import { createChatStream } from "@/lib/chat-stream";

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

  return createChatStream({ messages, abortSignal: req.signal });
}
