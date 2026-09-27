"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";

export type TabItem = { id: string; label: string; content: React.ReactNode };

/**
 * Tabs — W3C APG "Tabs with Manual Activation".
 *
 *  - roving tabindex: exactly one tab is in the tab order, so Tab moves past
 *    the whole tablist rather than through every tab
 *  - ArrowLeft / ArrowRight move between tabs and wrap; Home / End jump to the
 *    ends; Enter or Space activates the focused tab
 *  - manual activation (focus does not auto-select) because each panel here
 *    could be expensive to render
 */
export function Tabs({ items, label }: { items: TabItem[]; label: string }) {
  const baseId = useId();
  const [selected, setSelected] = useState(0);
  const [focused, setFocused] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const tabId = (i: number) => `${baseId}-tab-${i}`;
  const panelId = (i: number) => `${baseId}-panel-${i}`;

  function move(to: number) {
    const next = (to + items.length) % items.length;
    setFocused(next);
    tabRefs.current[next]?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    switch (event.key) {
      case "ArrowRight":
        event.preventDefault();
        move(index + 1);
        break;
      case "ArrowLeft":
        event.preventDefault();
        move(index - 1);
        break;
      case "Home":
        event.preventDefault();
        move(0);
        break;
      case "End":
        event.preventDefault();
        move(items.length - 1);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        setSelected(index);
        break;
    }
  }

  return (
    <div>
      <div role="tablist" aria-label={label} className="flex gap-1 border-b border-line">
        {items.map((item, i) => (
          <button
            key={item.id}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            role="tab"
            id={tabId(i)}
            type="button"
            aria-selected={selected === i}
            aria-controls={panelId(i)}
            // Roving tabindex — only the focused tab is reachable with Tab.
            tabIndex={focused === i ? 0 : -1}
            onClick={() => {
              setSelected(i);
              setFocused(i);
            }}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={[
              "-mb-px border-b-2 px-4 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
              selected === i
                ? "border-brand font-medium text-ink"
                : "border-transparent text-ink-muted hover:text-ink",
            ].join(" ")}
          >
            {item.label}
          </button>
        ))}
      </div>

      {items.map((item, i) => (
        <div
          key={item.id}
          role="tabpanel"
          id={panelId(i)}
          aria-labelledby={tabId(i)}
          hidden={selected !== i}
          // Panels are focusable so keyboard users land somewhere after the tab.
          tabIndex={0}
          className="p-4 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          {item.content}
        </div>
      ))}
    </div>
  );
}
