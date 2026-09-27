import Link from "next/link";
import { PageShell } from "@/components/page-shell";

export default function NotFound() {
  return (
    <PageShell title="Page not found" lede="That screen does not exist.">
      <Link
        href="/"
        className="inline-block rounded-control bg-brand px-4 py-2 text-brand-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        Back to home
      </Link>
    </PageShell>
  );
}
