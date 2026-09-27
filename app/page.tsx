import Link from "next/link";
import { PageShell } from "@/components/page-shell";

const SCREENS = [
  { href: "/chat", name: "Chat", note: "Streaming conversation view", ships: "FE-06" },
  { href: "/history", name: "History", note: "Past conversations", ships: "FE-07" },
  { href: "/settings", name: "Settings", note: "Model and account preferences", ships: "FE-04 ✓" },
  { href: "/health", name: "Health", note: "Runtime and dependency status", ships: "FE-05 ✓" },
];

export default function Home() {
  return (
    <PageShell
      title="Sema"
      lede="A streaming AI chat product, built across the FlyRank Front-end AI Engineering track. Sema is Swahili for “speak”."
    >
      <ul className="grid gap-3 sm:grid-cols-2">
        {SCREENS.map((s) => (
          <li key={s.href}>
            <Link
              href={s.href}
              className="block h-full rounded-panel border border-line bg-surface-raised p-5 transition-colors hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <span className="font-medium">{s.name}</span>
              <span className="mt-1 block text-sm text-ink-muted">{s.note}</span>
              <span className="mt-3 block font-mono text-xs text-ink-muted">{s.ships}</span>
            </Link>
          </li>
        ))}
      </ul>
    </PageShell>
  );
}
