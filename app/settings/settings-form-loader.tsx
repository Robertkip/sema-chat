"use client";

import dynamic from "next/dynamic";

/**
 * react-hook-form and zod are only needed by this one form, but Turbopack was
 * hoisting them into a shared chunk that every route downloaded — including
 * the home page and the chat. Loading the form on demand keeps roughly 95 KB
 * gzipped off every other page.
 */
export const SettingsFormLoader = dynamic(
  () => import("./settings-form").then((m) => m.SettingsForm),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col gap-5" aria-hidden="true">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <div className="h-4 w-24 animate-pulse rounded bg-surface-sunken" />
            <div className="h-10 animate-pulse rounded-control bg-surface-raised" />
          </div>
        ))}
      </div>
    ),
  },
);
