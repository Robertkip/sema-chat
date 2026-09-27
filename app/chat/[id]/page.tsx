import { PageShell, Placeholder } from "@/components/page-shell";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <PageShell title="Conversation" lede={`Thread ${id}`}>
      <Placeholder ships="FE-06 — Streaming AI chat interface" />
    </PageShell>
  );
}
