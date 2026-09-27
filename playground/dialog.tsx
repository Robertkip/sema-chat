"use client";

import { useCallback, useEffect, useId, useRef } from "react";
import { useFocusTrap } from "./use-focus-trap";

export type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
};

/**
 * Modal dialog — W3C APG "Dialog (Modal)" pattern.
 *  - role="dialog" + aria-modal="true" + aria-labelledby
 *  - focus moves in on open, is trapped while open, returns to the trigger on close
 *  - Escape closes
 *
 * Known gap (see NOTES.md): the page behind is dimmed but NOT inert, so a
 * screen reader's virtual cursor can still reach it. Only the backdrop carries
 * aria-hidden. Fixing this properly needs a portal plus inerting the siblings.
 */
export function Dialog({ open, onClose, title, children }: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useFocusTrap(panelRef, open);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", handleKeyDown);
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = overflow;
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Decorative backdrop: not a button, so it is not a keyboard stop. */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative w-full max-w-md rounded-panel border border-line bg-surface p-6 shadow-xl"
      >
        <h2 id={titleId} className="text-lg font-semibold">
          {title}
        </h2>
        <div className="mt-3 text-sm text-ink-muted">{children}</div>
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-control bg-accent px-4 py-2 text-sm text-accent-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
