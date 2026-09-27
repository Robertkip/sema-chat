"use client";

import { useState } from "react";
import { PageShell } from "@/components/page-shell";
import { StatefulButton } from "@/components/stateful-button";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const jitter = () => 700 + Math.random() * 900;

export function MotionDemo() {
  const [log, setLog] = useState<string[]>([]);
  const note = (s: string) =>
    setLog((l) => [`${new Date().toLocaleTimeString()} · ${s}`, ...l].slice(0, 6));

  return (
    <PageShell
      title="Buttons with a Brain"
      lede="One button, seven states, no abrupt swaps. Every trigger below is deterministic except the last, so you can see success and failure on demand."
    >
      <section className="grid gap-8 sm:grid-cols-2">
        <Panel
          title="Always succeeds"
          hint="idle → loading → success → idle. The success state holds 1.2s, then gets out of the way."
        >
          <StatefulButton
            onAction={async () => {
              await wait(jitter());
              note("send: success");
            }}
          />
        </Panel>

        <Panel
          title="Always fails"
          hint="idle → loading → error. One shake pass, then the label becomes Retry and stays — an error is not a toast."
        >
          <StatefulButton
            onAction={async () => {
              await wait(jitter());
              note("send: failed");
              throw new Error("nope");
            }}
          />
        </Panel>

        <Panel
          title="Disabled"
          hint="The seventh state. Still focusable to screen readers via aria, never actionable."
        >
          <StatefulButton disabled onAction={async () => {}} />
        </Panel>

        <Panel
          title="Same language, different button"
          hint="A secondary variant sharing the timings and the state machine — the proof it is a system, not one decorated button."
        >
          <StatefulButton
            variant="secondary"
            labels={{ idle: "Save draft", loading: "Saving…", success: "Saved", error: "Retry save" }}
            onAction={async () => {
              await wait(jitter());
              if (Math.random() < 0.2) {
                note("save: failed");
                throw new Error("nope");
              }
              note("save: success");
            }}
          />
        </Panel>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-medium">Try to break it</h2>
        <ul className="mt-2 list-disc pl-5 text-sm text-ink-muted">
          <li>Spam-click during loading — clicks are ignored, no queue builds up.</li>
          <li>Click the failing button, then immediately click Retry mid-shake.</li>
          <li>Tab to a button and press Enter or Space; the focus ring stays visible.</li>
          <li>
            Turn on “Reduce motion” in your OS: movement stops, colour and label
            feedback remain.
          </li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-medium">Timing choices</h2>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          {[
            ["90ms press", "Below ~100ms reads as instant. Any slower and the button feels spongy."],
            ["180ms label swap", "Long enough to see which direction the label moved, short enough that nobody waits for it."],
            ["400ms error shake", "One pass. A repeating shake reads as broken; a single pass reads as “that was wrong”."],
            ["1200ms success hold", "Long enough to register, then it returns to idle rather than lingering as clutter."],
          ].map(([term, def]) => (
            <div key={term} className="rounded-panel border border-line p-3">
              <dt className="font-mono text-xs text-ink-muted">{term}</dt>
              <dd className="mt-1">{def}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 max-w-prose text-sm text-ink-muted">
          Entering motion uses <code>ease-out</code> so it decelerates into place;
          leaving uses <code>ease-in</code> so it accelerates away. Only{" "}
          <code>transform</code> and <code>opacity</code> are animated. The button is
          sized once by an invisible sizer holding the longest label, so swapping
          labels never changes its box and nothing around it reflows.
        </p>
      </section>

      {log.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-medium">Activity</h2>
          <ul className="mt-2 font-mono text-xs text-ink-muted">
            {log.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        </section>
      )}
    </PageShell>
  );
}

function Panel({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-panel border border-line p-5">
      <h2 className="text-sm font-medium">{title}</h2>
      <p className="mt-1 mb-4 text-xs text-ink-muted">{hint}</p>
      {children}
    </div>
  );
}
