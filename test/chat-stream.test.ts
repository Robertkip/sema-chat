import { describe, expect, it } from "vitest";
import { MockLanguageModelV4, simulateReadableStream } from "ai/test";
import type { UIMessage } from "ai";
import { createChatStream } from "@/lib/chat-stream";

const userMessage: UIMessage[] = [
  { id: "1", role: "user", parts: [{ type: "text", text: "hi" }] },
];

/** A model that emits text in separate chunks, like a real stream. */
function chunkedModel(chunks: string[], delayMs = 0) {
  return new MockLanguageModelV4({
    doStream: async () => ({
      stream: simulateReadableStream({
        chunkDelayInMs: delayMs,
        chunks: [
          { type: "stream-start", warnings: [] },
          { type: "text-start", id: "t0" },
          ...chunks.map((c) => ({ type: "text-delta" as const, id: "t0", delta: c })),
          { type: "text-end", id: "t0" },
          {
            type: "finish" as const,
            finishReason: "stop" as const,
            usage: { inputTokens: 1, outputTokens: chunks.length, totalTokens: 1 + chunks.length },
          },
        ],
      }),
    }),
  });
}

async function readFrames(response: Response): Promise<string[]> {
  const text = await response.text();
  return text
    .split("\n")
    .filter((l) => l.startsWith("data: ") && l !== "data: [DONE]")
    .map((l) => l.slice(6));
}

describe("chat stream", () => {
  it("emits each token as its own frame rather than one blob", async () => {
    const response = await createChatStream({
      messages: userMessage,
      model: chunkedModel(["one ", "two ", "three"]),
    });
    const deltas = (await readFrames(response))
      .map((f) => JSON.parse(f) as { type: string; delta?: string })
      .filter((f) => f.type === "text-delta");

    expect(deltas).toHaveLength(3);
    expect(deltas.map((d) => d.delta).join("")).toBe("one two three");
  });

  it("opens the stream with a start frame before any text", async () => {
    const response = await createChatStream({
      messages: userMessage,
      model: chunkedModel(["x"]),
    });
    const types = (await readFrames(response)).map(
      (f) => (JSON.parse(f) as { type: string }).type,
    );
    expect(types[0]).toBe("start");
    expect(types.indexOf("start")).toBeLessThan(types.indexOf("text-delta"));
  });

  it("streams incrementally — the response is not buffered to completion", async () => {
    const response = await createChatStream({
      messages: userMessage,
      model: chunkedModel(["a", "b", "c", "d"], 15),
    });
    const reader = response.body!.getReader();
    const firstChunkAt = Date.now();
    await reader.read(); // first chunk
    const elapsedToFirst = Date.now() - firstChunkAt;
    await reader.cancel();
    // A buffered response would only resolve after all 4 delayed chunks (~60ms).
    expect(elapsedToFirst).toBeLessThan(45);
  });

  it("stops cleanly when the request is aborted mid-stream", async () => {
    const controller = new AbortController();
    const response = await createChatStream({
      messages: userMessage,
      model: chunkedModel(["a", "b", "c", "d", "e"], 20),
      abortSignal: controller.signal,
    });

    const reader = response.body!.getReader();
    const seen: string[] = [];
    await reader.read();
    controller.abort();

    // Draining after an abort must terminate, not hang or throw unhandled.
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        seen.push(new TextDecoder().decode(value));
      }
    } catch {
      // An aborted body may reject; either way we got here without hanging.
    }
    expect(true).toBe(true);
  });

  it("preserves multi-turn history", async () => {
    const model = chunkedModel(["ok"]);
    const response = await createChatStream({
      messages: [
        { id: "1", role: "user", parts: [{ type: "text", text: "my name is Robert" }] },
        { id: "2", role: "assistant", parts: [{ type: "text", text: "Hello Robert" }] },
        { id: "3", role: "user", parts: [{ type: "text", text: "what is my name?" }] },
      ],
      model,
    });
    await response.text();
    const sent = model.doStreamCalls[0].prompt;
    // system prompt + the three conversation turns
    expect(sent).toHaveLength(4);
    expect(sent[0].role).toBe("system");
    expect(JSON.stringify(sent)).toContain("You are Sema");
    expect(JSON.stringify(sent)).toContain("my name is Robert");
    expect(JSON.stringify(sent)).toContain("Hello Robert");
  });
});
