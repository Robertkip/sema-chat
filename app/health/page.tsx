import { PageShell } from "@/components/page-shell";

export const metadata = { title: "Health" };
export const revalidate = 300;

type RepoStatus =
  | { ok: true; fullName: string; defaultBranch: string; pushedAt: string; openIssues: number }
  | { ok: false; reason: string };

async function fetchRepoStatus(): Promise<RepoStatus> {
  try {
    const res = await fetch("https://api.github.com/repos/Robertkip/sema-chat", {
      headers: { Accept: "application/vnd.github+json" },
      next: { revalidate: 300 },
    });
    if (!res.ok) return { ok: false, reason: `GitHub API responded ${res.status}` };
    const data = (await res.json()) as {
      full_name: string;
      default_branch: string;
      pushed_at: string;
      open_issues_count: number;
    };
    return {
      ok: true,
      fullName: data.full_name,
      defaultBranch: data.default_branch,
      pushedAt: data.pushed_at,
      openIssues: data.open_issues_count,
    };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : "Request failed" };
  }
}

export default async function HealthPage() {
  const repo = await fetchRepoStatus();
  const runtime = {
    environment: process.env.VERCEL_ENV ?? "development",
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
    region: process.env.VERCEL_REGION ?? "local",
    modelKeyConfigured: Boolean(process.env.ANTHROPIC_API_KEY),
  };

  return (
    <PageShell
      title="Health"
      lede="Runtime facts and a live fetch against the source repository."
    >
      <div className="grid gap-6 sm:grid-cols-2">
        <section aria-labelledby="runtime-heading">
          <h2 id="runtime-heading" className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-muted">
            Runtime
          </h2>
          <Rows
            rows={[
              ["Environment", runtime.environment],
              ["Commit", runtime.commit],
              ["Region", runtime.region],
              ["Model key", runtime.modelKeyConfigured ? "configured" : "not set"],
            ]}
          />
        </section>

        <section aria-labelledby="repo-heading">
          <h2 id="repo-heading" className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-muted">
            Repository
          </h2>
          {repo.ok ? (
            <Rows
              rows={[
                ["Repo", repo.fullName],
                ["Default branch", repo.defaultBranch],
                ["Last push", new Date(repo.pushedAt).toISOString().slice(0, 16).replace("T", " ")],
                ["Open issues", String(repo.openIssues)],
              ]}
            />
          ) : (
            <p role="status" className="rounded-panel border border-line bg-surface-raised p-4 text-sm text-danger">
              Could not reach the GitHub API. {repo.reason}
            </p>
          )}
        </section>
      </div>

      <p className="mt-8 text-sm text-ink-muted">
        Machine-readable status:{" "}
        <a
          href="/api/health"
          className="underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          /api/health
        </a>
      </p>
    </PageShell>
  );
}

function Rows({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="overflow-hidden rounded-panel border border-line">
      {rows.map(([label, value], i) => (
        <div
          key={label}
          className={[
            "flex items-baseline justify-between gap-4 px-4 py-3 text-sm",
            i % 2 === 0 ? "bg-surface-raised" : "bg-surface",
          ].join(" ")}
        >
          <dt className="text-ink-muted">{label}</dt>
          <dd className="truncate font-mono text-xs">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
