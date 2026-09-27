import { PageShell, Placeholder } from "@/components/page-shell";

export const metadata = { title: "Chat" };

export default function ChatPage() {
  return (
    <PageShell title="Chat" lede="Start a new conversation.">
      <Placeholder ships="FE-06 — Streaming AI chat interface" />
    </PageShell>
  );
}
