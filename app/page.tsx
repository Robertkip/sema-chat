import Link from "next/link";
import { ShaderHero } from "@/components/shader/shader-hero";

const SCREENS = [
  { href: "/chat", name: "Chat", note: "Streaming conversation with tools", ships: "FE-06 · FE-07" },
  { href: "/scene", name: "3D scene", note: "Interactive wave field", ships: "3D" },
  { href: "/motion", name: "Motion", note: "Buttons with a brain", ships: "Micro-interactions" },
  { href: "/playground", name: "Playground", note: "Accessible components", ships: "FE-03" },
  { href: "/settings", name: "Settings", note: "Model and account preferences", ships: "FE-04" },
  { href: "/health", name: "Health", note: "Runtime and dependency status", ships: "FE-05" },
];

export default function Home() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:py-10">
      <ShaderHero>
        <div className="flex min-h-[420px] flex-col justify-end gap-3 p-6 sm:min-h-[480px] sm:p-10">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/70">
            Sema · Swahili for “speak”
          </p>
          <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            A streaming AI chat product, built in the open.
          </h1>
          <p className="max-w-xl text-white/80">
            Every screen here is an assignment from the FlyRank Front-end AI
            Engineering track. The background is a fragment shader — move your
            cursor across it.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/chat"
              className="rounded-control bg-white px-5 py-2.5 text-sm font-medium text-[#0b1a3d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Open the chat
            </Link>
            <Link
              href="/scene"
              className="rounded-control border border-white/35 px-5 py-2.5 text-sm font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              See the 3D scene
            </Link>
          </div>
        </div>
      </ShaderHero>

      <ul className="mt-8 grid gap-3 sm:grid-cols-2">
        {SCREENS.map((s) => (
          <li key={s.href}>
            <Link
              href={s.href}
              className="block h-full rounded-panel border border-line bg-surface-raised p-5 transition-colors hover:border-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              <span className="font-medium">{s.name}</span>
              <span className="mt-1 block text-sm text-ink-muted">{s.note}</span>
              <span className="mt-3 block font-mono text-xs text-ink-muted">{s.ships}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
