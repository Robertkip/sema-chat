import { afterEach, describe, expect, it, vi } from "vitest";
import { inspectUrl, inspectUrlInput } from "@/lib/tools/inspect-url";

afterEach(() => vi.unstubAllGlobals());

function stubPage(html: string, status = 200) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ status, text: async () => html } as Response),
  );
}

const GOOD = `<html><head>
  <title>A perfectly reasonable page title</title>
  <meta name="description" content="A description of the page.">
  <meta name="viewport" content="width=device-width">
</head><body></body></html>`;

describe("inspectUrlInput schema", () => {
  it("rejects a non-URL", () => {
    expect(inspectUrlInput.safeParse({ url: "not a url" }).success).toBe(false);
  });
  it("accepts a real URL", () => {
    expect(inspectUrlInput.safeParse({ url: "https://example.com" }).success).toBe(true);
  });
});

describe("inspectUrl — success path", () => {
  it("extracts title, description and a score", async () => {
    stubPage(GOOD);
    const r = await inspectUrl({ url: "https://example.com" });
    expect(r.title).toBe("A perfectly reasonable page title");
    expect(r.description).toBe("A description of the page.");
    expect(r.status).toBe(200);
    expect(r.score).toBeGreaterThan(80);
    expect(r.findings.length).toBeGreaterThan(0);
  });

  it("always returns a number for score, even on a bare page", async () => {
    stubPage("<html><head></head><body></body></html>");
    const r = await inspectUrl({ url: "http://example.com" });
    expect(typeof r.score).toBe("number");
    expect(r.title).toBeNull();
    expect(r.description).toBeNull();
    // Every finding still renders — optional fields have a plan.
    expect(r.findings.every((f) => typeof f.detail === "string")).toBe(true);
  });

  it("reads og:description when meta description is absent", async () => {
    stubPage('<html><head><meta property="og:description" content="From OG."></head></html>');
    const r = await inspectUrl({ url: "https://example.com" });
    expect(r.description).toBe("From OG.");
  });

  it("decodes HTML entities in the title", async () => {
    stubPage("<html><head><title>Tom &amp; Jerry</title></head></html>");
    const r = await inspectUrl({ url: "https://example.com" });
    expect(r.title).toBe("Tom & Jerry");
  });

  it("marks a 404 as a failed check without throwing", async () => {
    stubPage(GOOD, 404);
    const r = await inspectUrl({ url: "https://example.com" });
    expect(r.status).toBe(404);
    expect(r.findings.find((f) => f.label === "Successful response")?.pass).toBe(false);
  });
});

describe("inspectUrl — designed failure paths", () => {
  it("rejects a malformed URL with a readable message", async () => {
    await expect(inspectUrl({ url: "not-a-url" })).rejects.toThrow(/not a valid URL/);
  });

  it("refuses non-http schemes", async () => {
    await expect(inspectUrl({ url: "ftp://example.com" })).rejects.toThrow(/http and https/);
  });

  it("reports an unreachable host by name", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
    await expect(inspectUrl({ url: "https://nope.invalid" })).rejects.toThrow(
      /Could not reach nope\.invalid/,
    );
  });

  it("reports a timeout distinctly from an unreachable host", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new DOMException("timed out", "TimeoutError")),
    );
    await expect(inspectUrl({ url: "https://slow.example" })).rejects.toThrow(
      /did not respond within/,
    );
  });
});
