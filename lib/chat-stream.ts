import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  type LanguageModel,
  type UIMessage,
} from "ai";
import { MAX_OUTPUT_TOKENS, SYSTEM_PROMPT, resolveModel } from "./chat-config";
import { InspectError, inspectUrl, inspectUrlInput } from "./tools/inspect-url";

/**
 * Server-side tools. Defined here rather than inline in the route so the
 * same set is exercised by tests. The contract is documented in README.md.
 */
export const chatTools = {
  inspectUrl: {
    description:
      "Fetch a public web page and report what a crawler sees: HTTP status, " +
      "title, meta description, and a list of pass/fail findings with a score. " +
      "Use this whenever the user gives a URL and asks about the page itself.",
    inputSchema: inspectUrlInput,
    execute: inspectUrl,
  },
} as const;

/**
 * The chat stream, separated from the route handler so tests can drive it
 * with a mock model. The route stays a thin HTTP shell.
 */
export async function createChatStream({
  messages,
  model,
  abortSignal,
}: {
  messages: UIMessage[];
  model?: LanguageModel;
  abortSignal?: AbortSignal;
}): Promise<Response> {
  const result = streamText({
    model: model ?? resolveModel(),
    instructions: SYSTEM_PROMPT,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    messages: await convertToModelMessages(messages),
    tools: chatTools,
    // When the client calls stop(), the fetch aborts and this fires, so
    // generation stops server-side instead of billing for unseen tokens.
    abortSignal,
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      /**
       * The SDK masks every error as "An error occurred." by default so server
       * internals never reach the browser. That default is right, but it also
       * hides the tool's own curated messages, which are the whole point of a
       * designed error state. Surface InspectError text only; anything else is
       * an unexpected fault and stays masked.
       */
      onError: (error) =>
        error instanceof InspectError ? error.message : "Something went wrong.",
    }),
  });
}
