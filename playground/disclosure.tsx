"use client";

import { useId, useState } from "react";

/**
 * Disclosure — W3C APG "Disclosure (Show/Hide)".
 *
 * Intentionally the smallest of the three: a native <button> already gives
 * Enter, Space, focus and the button role for free. The only work is the
 * `aria-expanded` / `aria-controls` pairing, and keeping the panel out of the
 * accessibility tree with `hidden` rather than CSS, so a screen reader does
 * not read collapsed content.
 */
export function Disclosure({
  summary,
  children,
  defaultOpen = false,
}: {
  summary: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const id = useId();
  const [open, setOpen] = useState(defaultOpen);
  const panelId = `${id}-panel`;

  return (
    <div className="border-b border-line">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 py-3 text-left text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {summary}
        <span aria-hidden="true" className="text-ink-muted">
          {open ? "−" : "+"}
        </span>
      </button>
      <div id={panelId} hidden={!open} className="pb-4 text-sm text-ink-muted">
        {children}
      </div>
    </div>
  );
}
