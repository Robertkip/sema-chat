import { SettingsForm } from "./settings-form";

export const metadata = { title: "Settings · Sema" };

export default function SettingsPage() {
  return (
    <main className="mx-auto max-w-lg p-8">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Settings</h1>
      <SettingsForm />
    </main>
  );
}
