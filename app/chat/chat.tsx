"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { StreamingMarkdown } from "./streaming-markdown";
import {
  ToolInputAvailable,
  ToolInputStreaming,
  ToolOutputAvailable,
  ToolOutputError,
} from "./tool-inspect-url";
import type { InspectResult } from "@/lib/tools/inspect-url";
import { useStickToBottom } from "./use-stick-to-bottom";

/**
 * Render one `inspectUrl` tool part. The AI SDK types the part by tool name
 * (`tool-inspectUrl`) and carries the lifecycle in `state`, so this is an
 * exhaustive switch over the four states rather than a truthiness ladder.
 */
function ToolPart({ part }: { part: Extract<UIMessage["parts"][number], { type: string }> }) {
  if (part.type !== "tool-inspectUrl") return null;
  const p = part as {
    state: "input-streaming" | "input-available" | "output-available" | "output-error";
    input?: { url?: string };
    output?: InspectResult;
    errorText?: string;
  };

  switch (p.state) {
    case "input-streaming":
      return <ToolInputStreaming url={p.input?.url} />;
    case "input-available":
      return <ToolInputAvailable url={p.input?.url ?? ""} />;
    case "output-available":
      return p.output ? <ToolOutputAvailable result={p.output} /> : null;
    case "output-error":
      return (
        <ToolOutputError
          url={p.input?.url}
          message={p.errorText ?? "The tool failed without a message."}
        />
      );
  }
}

function textOf(message: UIMessage): string {
  return message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("");
}

const SUGGESTIONS = [
  "Inspect https://example.com",
  "Explain a ResizeObserver in two sentences",
  "What makes a good error message?",
];

export function Chat() {
  // ?fail= is forwarded to the route so each failure state is reproducible
  // from a URL. See lib/sabotage.ts.
  const failMode = useSearchParams().get("fail");
  const api = failMode ? `/api/chat?fail=${encodeURIComponent(failMode)}` : "/api/chat";

  const { messages, sendMessage, status, stop, error, regenerate } = useChat({
    transport: new DefaultChatTransport({ api }),
  });
  const [input, setInput] = useState("");
  const [retrying, setRetrying] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { containerRef, contentRef, pinned, scrollToBottom } = useStickToBottom();

  const busy = status === "submitted" || status === "streaming";
  const last = messages.at(-1);
  // Name the exact message the retry will resend, not "the conversation".
  const lastUserText = textOf(
    [...messages].reverse().find((m) => m.role === "user") ?? ({ parts: [] } as never),
  ).slice(0, 80);

  // The indicator is a handoff, not a swap: it shows only while we are waiting
  // for the *first* token. Once the assistant message exists and has any text,
  // the text itself takes over in the same slot, so nothing blanks between them.
  const awaitingFirstToken =
    busy && (last?.role !== "assistant" || textOf(last).length === 0);

  // Announce a finished reply, then clear so the bubble is its only copy.
  useEffect(() => {
    if (status !== "ready" || last?.role !== "assistant") return;
    const text = textOf(last);
    if (!text) return;
    setAnnouncement(text);
    const timer = setTimeout(() => setAnnouncement(""), 1000);
    return () => clearTimeout(timer);
  }, [status, last]);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    void sendMessage({ text });
    scrollToBottom();
  }

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col">
      <div ref={containerRef} className="relative flex-1 overflow-y-auto overscroll-contain">
        <div ref={contentRef} className="mx-auto w-full max-w-3xl px-4 py-6">
          {messages.length === 0 && !busy && (
            <div className="rounded-panel border border-dashed border-line p-6 sm:p-8">
              <p className="font-medium">Start a conversation</p>
              <p className="mt-1 text-sm text-ink-muted">
                Replies stream as they are generated. Try one of these:
              </p>
              <ul className="mt-4 flex flex-col gap-2">
                {SUGGESTIONS.map((s) => (
                  <li key={s}>
                    <button
                      type="button"
                      onClick={() => {
                        setInput(s);
                        inputRef.current?.focus();
                      }}
                      className="w-full rounded-control border border-line bg-surface-raised px-3 py-2 text-left text-sm transition-colors hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                      {s}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <ol className="flex flex-col gap-5">
            {messages.map((message) => {
              const isUser = message.role === "user";
              const body = textOf(message);
              return (
                <li
                  key={message.id}
                  className={isUser ? "flex justify-end" : "flex justify-start"}
                >
                  <div
                    className={[
                      "max-w-[85%] rounded-panel px-4 py-3 text-sm leading-relaxed sm:max-w-[75%]",
                      isUser
                        ? "bg-accent text-accent-ink"
                        : "border border-line bg-surface-raised",
                    ].join(" ")}
                  >
                    <span className="sr-only">
                      {isUser ? "You said: " : "Sema said: "}
                    </span>
                    {isUser ? (
                      <p className="whitespace-pre-wrap">{body}</p>
                    ) : (
                      <>
                        {message.parts.map((part, i) =>
                          part.type.startsWith("tool-") ? (
                            <ToolPart key={i} part={part} />
                          ) : null,
                        )}
                        {body.length > 0 ? (
                          <StreamingMarkdown text={body} />
                        ) : !message.parts.some((p) => p.type.startsWith("tool-")) ? (
                          <ThinkingDots />
                        ) : null}
                      </>
                    )}
                  </div>
                </li>
              );
            })}

            {/* Waiting for the stream to open: the bubble appears now, so the
                first token lands inside an element that already exists. */}
            {awaitingFirstToken && last?.role !== "assistant" && (
              <li className="flex justify-start">
                <div className="rounded-panel border border-line bg-surface-raised px-4 py-3">
                  <ThinkingDots />
                </div>
              </li>
            )}
          </ol>

          {error && (
            <div
              role="alert"
              className="animate-tool-in mt-5 rounded-panel border border-danger/40 bg-surface-raised p-4"
            >
              <p className="text-sm font-medium text-danger">That reply did not finish.</p>
              <p className="mt-1 text-sm text-ink-muted">
                {error.message && error.message !== "An error occurred."
                  ? error.message
                  : "The connection to the model failed."}
              </p>
              {lastUserText && (
                <p className="mt-3 truncate rounded-control bg-surface-sunken px-3 py-2 text-xs text-ink-muted">
                  Will retry: “{lastUserText}”
                </p>
              )}
              <button
                type="button"
                disabled={retrying || busy}
                onClick={async () => {
                  // Guarded so a second click cannot fire a second request.
                  if (retrying) return;
                  setRetrying(true);
                  try {
                    await regenerate();
                  } finally {
                    setRetrying(false);
                  }
                }}
                className="mt-3 rounded-control border border-line px-3 py-1.5 text-sm disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                {retrying ? "Retrying…" : "Retry this message"}
              </button>
            </div>
          )}

          {/* Screen readers get the finished reply once, not every token.
              The region is cleared afterwards so the text is not duplicated in
              the reading order — it already exists in the message bubble. */}
          <p aria-live="polite" aria-atomic="true" className="sr-only">
            {announcement}
          </p>
        </div>
      </div>

      {!pinned && messages.length > 0 && (
        <div className="pointer-events-none relative">
          <button
            type="button"
            onClick={() => scrollToBottom()}
            className="pointer-events-auto absolute -top-12 left-1/2 -translate-x-1/2 rounded-full border border-line bg-surface-raised px-4 py-2 text-xs shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Jump to latest ↓
          </button>
        </div>
      )}

      <div className="border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]">
        <form onSubmit={onSubmit} className="mx-auto flex w-full max-w-3xl gap-2 p-3">
          <label htmlFor="chat-input" className="sr-only">
            Message Sema
          </label>
          <input
            id="chat-input"
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Message Sema…"
            autoComplete="off"
            enterKeyHint="send"
            className="min-w-0 flex-1 rounded-control border border-line bg-surface-raised px-3 py-2.5 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          />
          {busy ? (
            <button
              type="button"
              onClick={() => stop()}
              className="shrink-0 rounded-control border border-line px-4 py-2.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Stop
            </button>
          ) : (
            <button
              type="submit"
              disabled={input.trim().length === 0}
              className="shrink-0 rounded-control bg-accent px-4 py-2.5 text-sm font-medium text-accent-ink disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Send
            </button>
          )}
        </form>
      </div>
    </div>
  );
}

function ThinkingDots() {
  return (
    <span className="flex items-center gap-1" role="status" aria-label="Sema is thinking">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-1.5 animate-pulse rounded-full bg-ink-muted"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </span>
  );
}
