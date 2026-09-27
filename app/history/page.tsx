import { PageShell, Placeholder } from "@/components/page-shell";

export const metadata = { title: "History" };

export default function HistoryPage() {
  return (
    <PageShell title="History" lede="Every conversation you have had with Sema.">
      <Placeholder ships="FE-07 — Tool results and structured output" />
    </PageShell>
  );
}
