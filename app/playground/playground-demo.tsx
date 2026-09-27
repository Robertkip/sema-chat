"use client";

import { useState } from "react";
import { Dialog } from "@/playground/dialog";
import { Tabs } from "@/playground/tabs";
import { Disclosure } from "@/playground/disclosure";
import { PageShell } from "@/components/page-shell";

export function PlaygroundDemo() {
  const [open, setOpen] = useState(false);

  return (
    <PageShell
      title="Component playground"
      lede="Three components built from scratch against the W3C APG patterns. Try them with the keyboard alone — Tab, Escape, and the arrow keys."
    >
      <section className="mb-10">
        <h2 className="mb-3 text-lg font-medium">Dialog</h2>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-control bg-brand px-4 py-2 text-sm text-brand-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          Open dialog
        </button>
        <Dialog open={open} onClose={() => setOpen(false)} title="A modal dialog">
          Focus moved in here, Tab is trapped, Escape closes, and focus returns to
          the button that opened it.
        </Dialog>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-medium">Tabs</h2>
        <Tabs
          label="Playground tabs"
          items={[
            { id: "a", label: "Keyboard", content: <p>Arrow keys move, Enter selects.</p> },
            { id: "b", label: "Roving", content: <p>Only one tab is in the tab order.</p> },
            { id: "c", label: "Manual", content: <p>Focus does not auto-select.</p> },
          ]}
        />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium">Disclosure</h2>
        <Disclosure summary="What does aria-expanded do?">
          It tells assistive tech whether the controlled region is open. The panel
          uses <code>hidden</code>, so collapsed content leaves the accessibility
          tree entirely.
        </Disclosure>
        <Disclosure summary="Why is this the simplest of the three?">
          A native button already provides Enter, Space, focus and the button role.
        </Disclosure>
      </section>
    </PageShell>
  );
}
