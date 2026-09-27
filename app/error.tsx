"use client";

import { useEffect } from "react";

/**
 * Route-level error boundary. Catches render and data failures that escape a
 * component's own handling, so a thrown error becomes a designed page rather
 * than a blank screen.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Real projects forward this to an error reporter.
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-16">
      <div className="rounded-panel border border-danger/40 bg-surface-raised p-6">
        <h1 className="text-lg font-semibold">This page hit an error</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Something failed while rendering. The rest of the app still works.
        </p>
        {error.digest && (
          <p className="mt-3 font-mono text-xs text-ink-muted">Ref: {error.digest}</p>
        )}
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={reset}
            className="rounded-control bg-brand px-4 py-2 text-sm text-brand-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            Try again
          </button>
          <a
            href="/"
            className="rounded-control border border-line px-4 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            Back to home
          </a>
        </div>
      </div>
    </div>
  );
}
