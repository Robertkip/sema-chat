import { describe, expect, it } from "vitest";
import { MockLanguageModelV4, simulateReadableStream } from "ai/test";
import type { LanguageModelV4StreamPart } from "@ai-sdk/provider";
import type { UIMessage } from "ai";
import { createChatStream } from "@/lib/chat-stream";
import { InjectedFailure, failAfter, parseFailureMode } from "@/lib/sabotage";

const userMessage: UIMessage[] = [
  { id: "1", role: "user", parts: [{ type: "text", text: "hi" }] },
];

function model(chunks: string[]) {
  const parts: LanguageModelV4StreamPart[] = [
    { type: "stream-start", warnings: [] },
    { type: "text-start", id: "t0" },
    ...chunks.map((delta) => ({ type: "text-delta" as const, id: "t0", delta })),
    { type: "text-end", id: "t0" },
    {
      type: "finish",
      finishReason: { unified: "stop" as const, raw: "stop" },
      usage: {
        inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
        outputTokens: { total: chunks.length, text: chunks.length, reasoning: 0 },
      },
    },
  ];
  return new MockLanguageModelV4({
    doStream: async () => ({ stream: simulateReadableStream({ chunks: parts }) }),
  });
}

describe("parseFailureMode", () => {
  it("accepts known modes and rejects anything else", () => {
    expect(parseFailureMode("midstream")).toBe("midstream");
    expect(parseFailureMode("rate-limit")).toBe("rate-limit");
    expect(parseFailureMode("drop-tables")).toBeNull();
    expect(parseFailureMode(null)).toBeNull();
  });
});

describe("failAfter", () => {
  it("passes chunks through, then emits an error part and stops", async () => {
    const src = new ReadableStream<number>({
      start(c) {
        for (let i = 0; i < 10; i++) c.enqueue(i);
        c.close();
      },
    });
    const reader = src.pipeThrough(failAfter(3)).getReader();
    const got: unknown[] = [];
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      got.push(value);
    }
    expect(got.slice(0, 3)).toEqual([0, 1, 2]);
    const tail = got[3] as { type: string; error: unknown };
    expect(tail.type).toBe("error");
    expect(tail.error).toBeInstanceOf(InjectedFailure);
    // Nothing after the failure.
    expect(got).toHaveLength(4);
  });
});

describe("mid-stream failure — the graded path", () => {
  it("streams real tokens first, then emits a designed error frame", async () => {
    const response = await createChatStream({
      messages: userMessage,
      model: model(["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"]),
      failureMode: "midstream",
    });
    const text = await response.text();
    const frames = text
      .split("\n")
      .filter((l) => l.startsWith("data: ") && l !== "data: [DONE]")
      .map((l) => JSON.parse(l.slice(6)) as { type: string; errorText?: string });

    // The user saw content before it broke — otherwise this is just `start`.
    expect(frames.filter((f) => f.type === "text-delta").length).toBeGreaterThan(0);

    const error = frames.find((f) => f.type === "error");
    expect(error).toBeDefined();
    // Not the SDK's generic mask: the injected message survives to the client.
    expect(error?.errorText).toMatch(/connection dropped/i);
  });

  it("fails before any token in start mode", async () => {
    await expect(
      createChatStream({
        messages: userMessage,
        model: model(["a", "b"]),
        failureMode: "start",
      }),
    ).rejects.toBeInstanceOf(InjectedFailure);
  });

  it("leaves the happy path untouched", async () => {
    const response = await createChatStream({
      messages: userMessage,
      model: model(["one", " two"]),
      failureMode: null,
    });
    const text = await response.text();
    expect(text).not.toContain('"type":"error"');
    expect(text).toContain("one");
  });
});
