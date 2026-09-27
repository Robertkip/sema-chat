import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    status: "ok",
    service: "sema-chat",
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
    environment: process.env.VERCEL_ENV ?? "development",
    region: process.env.VERCEL_REGION ?? "local",
    // Presence only — never the value.
    modelKeyConfigured: Boolean(process.env.ANTHROPIC_API_KEY),
    checkedAt: new Date().toISOString(),
  });
}
