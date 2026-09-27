import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  type LanguageModel,
  type UIMessage,
} from "ai";
import { MAX_OUTPUT_TOKENS, SYSTEM_PROMPT, resolveModel } from "./chat-config";

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
    // When the client calls stop(), the fetch aborts and this fires, so
    // generation stops server-side instead of billing for unseen tokens.
    abortSignal,
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  });
}
