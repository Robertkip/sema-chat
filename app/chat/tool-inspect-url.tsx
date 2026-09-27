"use client";

import type { InspectResult } from "@/lib/tools/inspect-url";

/**
 * The `inspectUrl` tool lifecycle, as four visually distinct states.
 *
 * The states are a state machine, and each one answers a different question:
 *
 *   input-streaming   what is it doing?      → skeleton, URL filling in
 *   input-available   with what input?       → the URL, committed, working
 *   output-available  what came back?        → score + findings component
 *   output-error      what went wrong?       → the reason, and what was tried
 *
 * They share one shell with a stable border, padding and left rail so the
 * transition morphs instead of jumping; only the contents crossfade. The
 * animation is suppressed under prefers-reduced-motion (see globals.css).
 */

const SHELL =
  "my-3 overflow-hidden rounded-panel border text-sm transition-colors duration-200";

function Shell({
  tone,
  children,
}: {
  tone: "pending" | "active" | "done" | "error";
  children: React.ReactNode;
}) {
  const border = {
    pending: "border-line",
    active: "border-accent/50",
    done: "border-line",
    error: "border-danger/50",
  }[tone];
  return <div className={`${SHELL} ${border} animate-tool-in`}>{children}</div>;
}

function Header({
  label,
  detail,
  tone,
}: {
  label: string;
  detail?: string;
  tone: "pending" | "active" | "done" | "error";
}) {
  const dot = {
    pending: "bg-ink-muted/40",
    active: "bg-accent animate-pulse",
    done: "bg-success",
    error: "bg-danger",
  }[tone];
  return (
    <div className="flex items-center gap-2 border-b border-line bg-surface-sunken px-3 py-2">
      <span className={`size-2 shrink-0 rounded-full ${dot}`} aria-hidden="true" />
      <span className="font-mono text-xs text-ink-muted">inspectUrl</span>
      <span className="text-xs text-ink-muted">·</span>
      <span className="text-xs">{label}</span>
      {detail && (
        <span className="ml-auto truncate pl-2 font-mono text-[11px] text-ink-muted">
          {detail}
        </span>
      )}
    </div>
  );
}

/** 1 — input-streaming: arguments are still arriving. */
export function ToolInputStreaming({ url }: { url?: string }) {
  return (
    <Shell tone="pending">
      <Header label="Preparing request" tone="pending" />
      <div className="px-3 py-3">
        <p className="text-xs text-ink-muted">Deciding what to fetch…</p>
        <p className="mt-2 truncate font-mono text-xs">
          {url ? url : <span className="inline-block h-3 w-40 rounded bg-surface-sunken" />}
        </p>
      </div>
    </Shell>
  );
}

/** 2 — input-available: arguments committed, execution in flight. */
export function ToolInputAvailable({ url }: { url: string }) {
  return (
    <Shell tone="active">
      <Header label="Fetching page" detail={hostOf(url)} tone="active" />
      <div className="px-3 py-3">
        <p className="truncate font-mono text-xs">{url}</p>
        <div className="mt-3 h-1 overflow-hidden rounded bg-surface-sunken">
          <div className="h-full w-1/3 animate-indeterminate rounded bg-accent" />
        </div>
      </div>
    </Shell>
  );
}

/** 4 — output-error: designed first, because reviewers trigger it on purpose. */
export function ToolOutputError({ url, message }: { url?: string; message: string }) {
  return (
    <Shell tone="error">
      <Header label="Could not inspect" detail={url ? hostOf(url) : undefined} tone="error" />
      <div className="px-3 py-3">
        <p className="text-danger">{message}</p>
        {url && (
          <p className="mt-2 truncate font-mono text-xs text-ink-muted">Tried: {url}</p>
        )}
        <p className="mt-2 text-xs text-ink-muted">
          Check the address, or try the site’s homepage instead.
        </p>
      </div>
    </Shell>
  );
}

/** 3 — output-available: the result as a component, not a JSON dump. */
export function ToolOutputAvailable({ result }: { result: InspectResult }) {
  const passed = result.findings.filter((f) => f.pass).length;

  return (
    <Shell tone="done">
      <Header label="Inspection complete" detail={hostOf(result.url)} tone="done" />

      <div className="flex items-center gap-4 border-b border-line px-3 py-3">
        <ScoreRing score={result.score} />
        <div className="min-w-0">
          <p className="truncate font-medium">{result.title ?? "Untitled page"}</p>
          <p className="truncate text-xs text-ink-muted">
            {result.description ?? "No meta description"}
          </p>
          <p className="mt-1 font-mono text-[11px] text-ink-muted">
            HTTP {result.status} · {result.elapsedMs} ms · {passed}/
            {result.findings.length} checks passed
          </p>
        </div>
      </div>

      <table className="w-full">
        <caption className="sr-only">
          Findings for {result.url}: {passed} of {result.findings.length} checks passed
        </caption>
        <thead className="sr-only">
          <tr>
            <th scope="col">Result</th>
            <th scope="col">Check</th>
            <th scope="col">Detail</th>
          </tr>
        </thead>
        <tbody>
          {result.findings.map((f) => (
            <tr key={f.label} className="border-t border-line/60">
              <td className="w-8 py-2 pl-3 align-top">
                <span
                  className={f.pass ? "text-success" : "text-danger"}
                  aria-label={f.pass ? "Pass" : "Fail"}
                >
                  {f.pass ? "✓" : "✕"}
                </span>
              </td>
              <td className="py-2 pr-2 align-top text-xs">{f.label}</td>
              <td className="py-2 pr-3 text-right align-top text-xs text-ink-muted">
                {f.detail}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Shell>
  );
}

/** Small hand-rolled SVG donut — the stretch goal, without pulling in a chart lib. */
function ScoreRing({ score }: { score: number }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const tone = score >= 80 ? "text-success" : score >= 50 ? "text-accent" : "text-danger";
  return (
    <svg
      viewBox="0 0 56 56"
      className="size-14 shrink-0 -rotate-90"
      role="img"
      aria-label={`Score ${score} out of 100`}
    >
      <circle cx="28" cy="28" r={r} fill="none" strokeWidth="5" className="stroke-surface-sunken" />
      <circle
        cx="28"
        cy="28"
        r={r}
        fill="none"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={`${(score / 100) * c} ${c}`}
        className={`${tone} stroke-current transition-[stroke-dasharray] duration-500`}
      />
      <text
        x="28"
        y="28"
        transform="rotate(90 28 28)"
        textAnchor="middle"
        dominantBaseline="central"
        className="rotate-90 fill-current text-[15px] font-semibold"
      >
        {score}
      </text>
    </svg>
  );
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
