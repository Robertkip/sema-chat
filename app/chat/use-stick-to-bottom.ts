"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** How close to the bottom still counts as "at the bottom", in pixels. */
const THRESHOLD = 48;

/**
 * Keeps a scroll container pinned to the bottom *only while the reader is
 * already there*.
 *
 * The behaviour that matters is the release: the moment the reader scrolls up
 * mid-stream, the pin drops and incoming tokens stop yanking the viewport.
 * Scrolling back down re-pins automatically.
 *
 * Growth is observed with a ResizeObserver on the content element rather than
 * a React dependency, because tokens stream into the DOM continuously and an
 * effect keyed on message state fires far too coarsely to keep up.
 */
export function useStickToBottom() {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [pinned, setPinned] = useState(true);

  const distanceFromBottom = (el: HTMLElement) =>
    el.scrollHeight - el.scrollTop - el.clientHeight;

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
    setPinned(true);
  }, []);

  // Reader intent. Scrolling to the bottom programmatically leaves the
  // distance at ~0, so this does not fight the pin.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => setPinned(distanceFromBottom(el) <= THRESHOLD);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // Content growth during streaming.
  useEffect(() => {
    const el = containerRef.current;
    const content = contentRef.current;
    if (!el || !content) return;

    const observer = new ResizeObserver(() => {
      // Read `pinned` from the ref-free closure via a fresh DOM read instead
      // of the state value, which would be stale inside the observer.
      if (pinnedRef.current) el.scrollTop = el.scrollHeight;
    });
    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  // Mirror `pinned` into a ref so the observer above always sees the current
  // value without being torn down and rebuilt on every toggle.
  const pinnedRef = useRef(pinned);
  useEffect(() => {
    pinnedRef.current = pinned;
  }, [pinned]);

  return { containerRef, contentRef, pinned, scrollToBottom };
}
