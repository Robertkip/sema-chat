import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MockLanguageModelV4, simulateReadableStream } from "ai/test";
import type { LanguageModelV4StreamPart } from "@ai-sdk/provider";
import { createChatStream } from "@/lib/chat-stream";
import { Chat } from "@/app/chat/chat";

/**
 * The chat component, driven through its real transport.
 *
 * Rather than hand-writing SSE frames, each test generates them with the same
 * `createChatStream` the route uses, backed by a mock model. The component
 * therefore consumes exactly the bytes the server produces — if the wire
 * format changes, these tests notice. The real API is never called.
 */

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

function modelEmitting(chunks: string[], delayMs = 0) {
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
    doStream: async () => ({
      stream: simulateReadableStream({ chunkDelayInMs: delayMs, chunks: parts }),
    }),
  });
}

/** Point global fetch at a real server stream, or at a failure. */
function serveChat(opts: {
  chunks?: string[];
  delayMs?: number;
  failureMode?: "start" | "midstream" | null;
  httpStatus?: number;
}) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      if (opts.httpStatus && opts.httpStatus >= 400) {
        return new Response(JSON.stringify({ error: "nope" }), {
          status: opts.httpStatus,
          headers: { "content-type": "application/json" },
        });
      }
      return createChatStream({
        messages: [{ id: "u1", role: "user", parts: [{ type: "text", text: "hi" }] }],
        model: modelEmitting(opts.chunks ?? ["Hello", " there"], opts.delayMs),
        failureMode: opts.failureMode ?? null,
      });
    }),
  );
}

async function send(text: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Message Sema"), text);
  await user.click(screen.getByRole("button", { name: "Send" }));
  return user;
}

beforeEach(() => render(<Chat />));
afterEach(() => vi.unstubAllGlobals());

describe("Chat — empty state", () => {
  it("offers click-to-fill prompts rather than an apology", async () => {
    const user = userEvent.setup();
    expect(screen.getByText("Start a conversation")).toBeInTheDocument();
    const suggestion = screen.getByRole("button", { name: /Inspect https:\/\/example\.com/ });
    await user.click(suggestion);
    expect(screen.getByLabelText("Message Sema")).toHaveValue("Inspect https://example.com");
  });

  it("disables Send until there is something to send", async () => {
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
    await userEvent.setup().type(screen.getByLabelText("Message Sema"), "hi");
    expect(screen.getByRole("button", { name: "Send" })).toBeEnabled();
  });
});

describe("Chat — pending state", () => {
  it("shows a thinking indicator and a Stop control before the first token", async () => {
    serveChat({ chunks: ["a", "b"], delayMs: 200 });
    await send("hello");
    await waitFor(() =>
      expect(screen.getByRole("status", { name: "Sema is thinking" })).toBeInTheDocument(),
    );
    expect(screen.getByRole("button", { name: "Stop" })).toBeInTheDocument();
  });
});

describe("Chat — streaming state", () => {
  it("renders the user message immediately and the reply as it arrives", async () => {
    serveChat({ chunks: ["Hello", " there"] });
    await send("hello");
    expect(await screen.findByText("hello")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(/Hello there/)).toBeInTheDocument());
  });

  it("swaps Stop back to Send once the reply completes", async () => {
    serveChat({ chunks: ["done"] });
    await send("hello");
    await waitFor(() => expect(screen.getByText(/done/)).toBeInTheDocument());
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Send" })).toBeInTheDocument(),
    );
  });

  it("clears the composer on send so the text is not sent twice", async () => {
    serveChat({ chunks: ["ok"] });
    await send("hello");
    expect(screen.getByLabelText("Message Sema")).toHaveValue("");
  });
});

describe("Chat — error state", () => {
  it("shows a designed error with a retry that names the message", async () => {
    serveChat({ httpStatus: 500 });
    await send("what is the time");
    const alert = await screen.findByRole("alert", {}, { timeout: 4000 });
    expect(alert).toHaveTextContent(/did not finish/i);
    expect(alert).toHaveTextContent(/Will retry/);
    expect(alert).toHaveTextContent(/what is the time/);
    expect(
      screen.getByRole("button", { name: /Retry this message/ }),
    ).toBeInTheDocument();
  });

  it("keeps the partial reply on screen when the stream dies mid-flight", async () => {
    serveChat({ chunks: ["one ", "two ", "three ", "four ", "five ", "six ", "seven"], failureMode: "midstream" });
    await send("count");
    await screen.findByRole("alert", {}, { timeout: 4000 });
    // Tokens that arrived before the failure are not thrown away.
    expect(screen.getByText(/one/)).toBeInTheDocument();
  });
});
