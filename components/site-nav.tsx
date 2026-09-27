"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/chat", label: "Chat" },
  { href: "/history", label: "History" },
  { href: "/settings", label: "Settings" },
  { href: "/health", label: "Health" },
] as const;

export function SiteNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary" className="border-b border-line bg-surface-raised">
      <div className="mx-auto flex max-w-4xl items-center gap-0.5 overflow-x-auto px-2 py-2 sm:gap-1 sm:px-4">
        <Link
          href="/"
          className="mr-1 shrink-0 rounded-control px-1.5 py-1 text-sm font-semibold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:mr-2 sm:px-2 sm:text-base"
        >
          Sema
        </Link>
        <ul className="flex items-center gap-1">
          {LINKS.map((link) => {
            const active =
              link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={[
                    "block shrink-0 rounded-control px-2 py-1.5 text-xs transition-colors sm:px-3 sm:text-sm",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                    active
                      ? "bg-accent text-accent-ink"
                      : "text-ink-muted hover:bg-surface-sunken hover:text-ink",
                  ].join(" ")}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
