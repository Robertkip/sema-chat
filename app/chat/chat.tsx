"use client";

import { useState, type FormEvent } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { StreamingMarkdown } from "./streaming-markdown";
import { useStickToBottom } from "./use-stick-to-bottom";

function textOf(message: UIMessage): string {
  return message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("");
}

export function Chat() {
  const { messages, sendMessage, status, stop, error, regenerate } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });
  const [input, setInput] = useState("");
  const { containerRef, contentRef, pinned, scrollToBottom } = useStickToBottom();

  const busy = status === "submitted" || status === "streaming";
  const last = messages.at(-1);

  // The indicator is a handoff, not a swap: it shows only while we are waiting
  // for the *first* token. Once the assistant message exists and has any text,
  // the text itself takes over in the same slot, so nothing blanks between them.
  const awaitingFirstToken =
    busy && (last?.role !== "assistant" || textOf(last).length === 0);

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
      <div ref={containerRef} className="relative flex-1 overflow-y-auto">
        <div ref={contentRef} className="mx-auto w-full max-w-3xl px-4 py-6">
          {messages.length === 0 && !busy && (
            <div className="rounded-panel border border-dashed border-line p-8 text-center">
              <p className="font-medium">Start a conversation</p>
              <p className="mt-1 text-sm text-ink-muted">
                Ask Sema anything. Responses stream as they are generated.
              </p>
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
                    ) : body.length > 0 ? (
                      <StreamingMarkdown text={body} />
                    ) : (
                      <ThinkingDots />
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
            <div role="alert" className="mt-5 rounded-panel border border-danger/40 p-4">
              <p className="text-sm text-danger">
                Something went wrong generating that reply.
              </p>
              <button
                type="button"
                onClick={() => void regenerate()}
                className="mt-3 rounded-control border border-line px-3 py-1.5 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                Retry
              </button>
            </div>
          )}

          {/* Screen readers get the finished reply, not every token. */}
          <p aria-live="polite" className="sr-only">
            {status === "ready" && last?.role === "assistant" ? textOf(last) : ""}
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

      <div className="border-t border-line bg-surface">
        <form onSubmit={onSubmit} className="mx-auto flex w-full max-w-3xl gap-2 p-3">
          <label htmlFor="chat-input" className="sr-only">
            Message Sema
          </label>
          <input
            id="chat-input"
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
