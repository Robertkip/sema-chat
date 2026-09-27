import { PageShell } from "@/components/page-shell";
import { SettingsForm } from "./settings-form";

export const metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <PageShell title="Settings" lede="Model and account preferences for Sema.">
      <SettingsForm />
    </PageShell>
  );
}
