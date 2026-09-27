"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * A button that communicates its own lifecycle.
 *
 * ── The state machine ───────────────────────────────────────────────────────
 *
 *   idle ──click──▶ loading ──resolve──▶ success ──1.2s──▶ idle
 *                      │
 *                      └────reject────▶ error ──click──▶ loading
 *
 * hover, focus-visible and disabled sit on top of that as presentation states,
 * giving seven distinct treatments in total.
 *
 * ── Why the width never animates ────────────────────────────────────────────
 * The obvious reading of "the button resizes to fit the new label" costs a
 * layout pass on every frame, which is the one thing the brief rules out. So
 * the button is sized once by an invisible sizer holding the longest label,
 * and every visible label is absolutely positioned inside it. Labels then move
 * with `transform` and `opacity` only — both compositor properties — and the
 * button's box never changes. Nothing around it reflows either.
 *
 * ── Durations ───────────────────────────────────────────────────────────────
 *   90ms   press feedback — below ~100ms reads as instant, which is the point
 *   180ms  label swap — long enough to see direction, short enough not to wait
 *   400ms  error shake — one pass; a repeated shake reads as broken, not wrong
 *   1200ms success hold — long enough to register, then it gets out of the way
 *
 * Entering motion uses ease-out so it decelerates into place; leaving uses
 * ease-in so it accelerates away. Under `prefers-reduced-motion` the movement
 * is removed but colour and label changes remain — feedback is never removed,
 * only the motion carrying it.
 */

export type ButtonState = "idle" | "loading" | "success" | "error";

export type StatefulButtonProps = {
  labels?: Partial<Record<ButtonState, string>>;
  onAction: () => Promise<void>;
  disabled?: boolean;
  variant?: "primary" | "secondary";
  /** How long the success state holds before returning to idle. */
  successHoldMs?: number;
};

const DEFAULT_LABELS: Record<ButtonState, string> = {
  idle: "Send message",
  loading: "Sending…",
  success: "Sent",
  error: "Retry",
};

export function StatefulButton({
  labels,
  onAction,
  disabled = false,
  variant = "primary",
  successHoldMs = 1200,
}: StatefulButtonProps) {
  const text = { ...DEFAULT_LABELS, ...labels };
  const [state, setState] = useState<ButtonState>("idle");

  // Guards interruption: every run takes a token, and a run whose token is
  // stale when it resolves does not touch state. Spam-clicking therefore
  // cannot land an old result on top of a newer one.
  const runId = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const run = useCallback(async () => {
    if (state === "loading" || disabled) return;
    if (timer.current) clearTimeout(timer.current);

    const id = ++runId.current;
    setState("loading");

    try {
      await onAction();
      if (runId.current !== id) return;
      setState("success");
      timer.current = setTimeout(() => {
        if (runId.current === id) setState("idle");
      }, successHoldMs);
    } catch {
      if (runId.current !== id) return;
      // Error persists until the user acts — it is not a transient toast.
      setState("error");
    }
  }, [state, disabled, onAction, successHoldMs]);

  const widest = Object.values(text).reduce((a, b) => (a.length >= b.length ? a : b));

  const base =
    variant === "primary"
      ? "bg-brand text-brand-ink"
      : "border border-line bg-surface-raised text-ink";

  const tone = {
    idle: base,
    loading: base,
    success: "bg-success text-white",
    error: "bg-danger text-white",
  }[state];

  return (
    <button
      type="button"
      onClick={() => void run()}
      disabled={disabled || state === "loading"}
      aria-busy={state === "loading"}
      data-state={state}
      className={[
        "group relative isolate inline-flex items-center justify-center overflow-hidden",
        "rounded-control px-5 py-2.5 text-sm font-medium",
        "transition-[background-color,color,box-shadow] duration-200 ease-out",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
        "disabled:cursor-not-allowed disabled:opacity-50",
        // hover and press are transform-only, so they cost nothing in layout
        "motion-safe:hover:-translate-y-px motion-safe:active:translate-y-0 motion-safe:active:scale-[0.97]",
        "motion-safe:transition-transform motion-safe:duration-[90ms]",
        state === "error" ? "motion-safe:animate-shake-once" : "",
        tone,
      ].join(" ")}
    >
      {/* Sizer: fixes the box to the longest label so nothing ever reflows. */}
      <span aria-hidden="true" className="invisible whitespace-nowrap">
        {widest}
      </span>

      {(Object.keys(text) as ButtonState[]).map((s) => (
        <span
          key={s}
          aria-hidden={s !== state}
          className={[
            "absolute inset-0 flex items-center justify-center gap-2 whitespace-nowrap",
            "transition-[opacity,transform] duration-[180ms]",
            s === state
              ? "translate-y-0 opacity-100 ease-out"
              : "pointer-events-none -translate-y-2 opacity-0 ease-in",
          ].join(" ")}
        >
          {s === "loading" && <Spinner />}
          {s === "success" && <Check />}
          {text[s]}
        </span>
      ))}

      {/* The accessible name always matches what is shown. */}
      <span className="sr-only" aria-live="polite">
        {text[state]}
      </span>
    </button>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="size-3.5 rounded-full border-2 border-current/30 border-t-current motion-safe:animate-spin"
    />
  );
}

function Check() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3.5">
      <path
        d="M3 8.5l3.5 3.5L13 5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="motion-safe:animate-draw-check"
        pathLength={1}
      />
    </svg>
  );
}
