import { Suspense } from "react";
import { Chat } from "./chat";

export const metadata = { title: "Chat" };

export default function ChatPage() {
  return (
    <Suspense fallback={<ChatSkeleton />}>
      <Chat />
    </Suspense>
  );
}

/**
 * Matches the chat layout — same container, same bubble geometry — so the
 * handoff to real content does not shift anything. A skeleton that causes
 * layout shift is worse than a spinner.
 */
function ChatSkeleton() {
  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col">
      <div className="flex-1 overflow-hidden">
        <div className="mx-auto w-full max-w-3xl px-4 py-6">
          <div className="h-32 animate-pulse rounded-panel border border-dashed border-line" />
        </div>
      </div>
      <div className="border-t border-line bg-surface">
        <div className="mx-auto flex w-full max-w-3xl gap-2 p-3">
          <div className="h-11 flex-1 animate-pulse rounded-control bg-surface-raised" />
          <div className="h-11 w-16 animate-pulse rounded-control bg-surface-raised" />
        </div>
      </div>
    </div>
  );
}
