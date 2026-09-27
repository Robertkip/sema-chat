export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-4 px-4">
      <h1 className="text-3xl font-semibold tracking-tight">Sema</h1>
      <p className="text-base opacity-70">
        A streaming AI chat product. The chat interface lands in FE-06.
      </p>
      <a className="text-sm underline underline-offset-4" href="/settings">
        Settings
      </a>
    </main>
  );
}
