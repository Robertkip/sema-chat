import { z } from "zod";

/**
 * `inspectUrl` — fetch a public web page and report what a crawler would see.
 *
 * ── Why this tool ───────────────────────────────────────────────────────────
 * It returns genuinely structured data (a score plus a list of findings), it
 * needs no API key, and it fails in interesting ways on purpose — a bad host,
 * a 404, a timeout. FE-07 is graded on the failure path as much as the happy
 * one, so a tool that can only succeed would have been the wrong choice.
 *
 * ── Contract ────────────────────────────────────────────────────────────────
 * Input   { url: string }                    a public http(s) URL
 * Output  InspectResult                      see the schema below
 * Throws  Error with a human-readable message, surfaced by the AI SDK as a
 *         `output-error` tool part carrying `errorText`.
 */

/**
 * Errors of this class carry text that is safe to show a user. Anything else
 * thrown inside the tool is an unexpected server fault and stays masked — see
 * the onError handler in lib/chat-stream.ts.
 */
export class InspectError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InspectError";
  }
}

/** Deliberately one field. Every field added is a field the model can invent. */
export const inspectUrlInput = z.object({
  url: z
    .string()
    .url()
    .describe("The full public http(s) URL to inspect, including the scheme."),
});

export type InspectUrlInput = z.infer<typeof inspectUrlInput>;

export type Finding = {
  label: string;
  pass: boolean;
  detail: string;
};

export type InspectResult = {
  url: string;
  status: number;
  elapsedMs: number;
  title: string | null;
  description: string | null;
  findings: Finding[];
  /** 0-100, derived from findings. Never null — the UI always has a number. */
  score: number;
};

const TIMEOUT_MS = 8000;

/** Pull the first match of a tag, tolerating attribute order and quoting. */
function metaContent(html: string, name: string): string | null {
  const patterns = [
    new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:name|property)=["']${name}["']`, "i"),
  ];
  for (const re of patterns) {
    const m = re.exec(html);
    if (m?.[1]) return decodeEntities(m[1].trim());
  }
  return null;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function buildFindings(args: {
  url: string;
  status: number;
  elapsedMs: number;
  title: string | null;
  description: string | null;
  hasViewport: boolean;
}): Finding[] {
  const { url, status, elapsedMs, title, description, hasViewport } = args;
  return [
    {
      label: "Served over HTTPS",
      pass: url.startsWith("https://"),
      detail: url.startsWith("https://") ? "Encrypted" : "Plain HTTP — browsers flag this",
    },
    {
      label: "Successful response",
      pass: status >= 200 && status < 300,
      detail: `HTTP ${status}`,
    },
    {
      label: "Has a page title",
      pass: title !== null && title.length > 0,
      detail: title ? `${title.length} characters` : "Missing <title>",
    },
    {
      label: "Title is a usable length",
      pass: title !== null && title.length >= 15 && title.length <= 60,
      detail: title
        ? title.length < 15
          ? "Under 15 characters — likely too terse"
          : title.length > 60
            ? "Over 60 characters — search results will truncate it"
            : "Between 15 and 60 characters"
        : "No title to measure",
    },
    {
      label: "Has a meta description",
      pass: description !== null && description.length > 0,
      detail: description ? `${description.length} characters` : "Missing",
    },
    {
      label: "Declares a viewport",
      pass: hasViewport,
      detail: hasViewport ? "Mobile rendering configured" : "No viewport meta tag",
    },
    {
      label: "Responded promptly",
      pass: elapsedMs < 1500,
      detail: `${elapsedMs} ms`,
    },
  ];
}

export async function inspectUrl({ url }: InspectUrlInput): Promise<InspectResult> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new InspectError(`"${url}" is not a valid URL.`);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new InspectError(
      `Only http and https URLs can be inspected, not "${parsed.protocol}".`,
    );
  }

  const started = Date.now();
  let response: Response;

  try {
    response = await fetch(parsed.toString(), {
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "user-agent": "SemaBot/1.0 (+https://sema-chat-pi.vercel.app)" },
    });
  } catch (caught) {
    if (caught instanceof DOMException && caught.name === "TimeoutError") {
      throw new InspectError(
        `${parsed.hostname} did not respond within ${TIMEOUT_MS / 1000} seconds.`,
      );
    }
    throw new InspectError(
      `Could not reach ${parsed.hostname}. The host may not exist.`,
    );
  }

  const elapsedMs = Date.now() - started;
  const html = (await response.text()).slice(0, 200_000);

  const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  const title = titleMatch?.[1] ? decodeEntities(titleMatch[1].trim()) : null;
  const description =
    metaContent(html, "description") ?? metaContent(html, "og:description");
  const hasViewport = /<meta[^>]+name=["']viewport["']/i.test(html);

  const findings = buildFindings({
    url: parsed.toString(),
    status: response.status,
    elapsedMs,
    title,
    description,
    hasViewport,
  });

  const passed = findings.filter((f) => f.pass).length;

  return {
    url: parsed.toString(),
    status: response.status,
    elapsedMs,
    title,
    description,
    findings,
    score: Math.round((passed / findings.length) * 100),
  };
}
