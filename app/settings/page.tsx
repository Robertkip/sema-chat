import { PageShell } from "@/components/page-shell";
import { SettingsFormLoader } from "./settings-form-loader";

export const metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <PageShell title="Settings" lede="Model and account preferences for Sema.">
      <SettingsFormLoader />
    </PageShell>
  );
}
