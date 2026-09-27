import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import {
  ToolInputAvailable,
  ToolInputStreaming,
  ToolOutputAvailable,
  ToolOutputError,
} from "@/app/chat/tool-inspect-url";
import type { InspectResult } from "@/lib/tools/inspect-url";

const result: InspectResult = {
  url: "https://example.com/",
  status: 200,
  elapsedMs: 412,
  title: "Example Domain",
  description: "An illustrative domain.",
  score: 71,
  findings: [
    { label: "Served over HTTPS", pass: true, detail: "Encrypted" },
    { label: "Has a meta description", pass: false, detail: "Missing" },
  ],
};

describe("tool result — renders as a component, not a JSON dump", () => {
  it("presents findings as a table with an accessible caption", () => {
    render(<ToolOutputAvailable result={result} />);
    const table = screen.getByRole("table", { name: /2 checks|findings/i });
    // Two rowgroups: the sr-only <thead> and the <tbody> of findings.
    const [, body] = within(table).getAllByRole("rowgroup");
    expect(within(body).getAllByRole("row")).toHaveLength(2);
    expect(within(table).getByText("Served over HTTPS")).toBeInTheDocument();
  });

  it("exposes the score as an image with an accessible name, not bare text", () => {
    render(<ToolOutputAvailable result={result} />);
    expect(screen.getByRole("img", { name: "Score 71 out of 100" })).toBeInTheDocument();
  });

  it("labels each finding pass or fail for assistive tech", () => {
    render(<ToolOutputAvailable result={result} />);
    expect(screen.getByLabelText("Pass")).toBeInTheDocument();
    expect(screen.getByLabelText("Fail")).toBeInTheDocument();
  });

  it("has a rendering plan for missing optional fields", () => {
    render(<ToolOutputAvailable result={{ ...result, title: null, description: null }} />);
    expect(screen.getByText("Untitled page")).toBeInTheDocument();
    expect(screen.getByText("No meta description")).toBeInTheDocument();
  });

  it("shows a 404 as a result, not a failure", () => {
    render(
      <ToolOutputAvailable
        result={{
          ...result,
          status: 404,
          findings: [{ label: "Successful response", pass: false, detail: "HTTP 404" }],
        }}
      />,
    );
    // Appears twice by design: once in the summary line, once as the finding.
    expect(screen.getAllByText(/HTTP 404/).length).toBeGreaterThan(0);
    expect(screen.getByLabelText("Fail")).toBeInTheDocument();
    // A 404 is a result, not a tool failure — the error shell must not appear.
    expect(screen.queryByText("Could not inspect")).not.toBeInTheDocument();
  });
});

describe("tool lifecycle — the four states are visually distinct", () => {
  it("input-streaming says what it is doing, without an input yet", () => {
    render(<ToolInputStreaming />);
    expect(screen.getByText("Preparing request")).toBeInTheDocument();
    expect(screen.getByText(/Deciding what to fetch/)).toBeInTheDocument();
  });

  it("input-available commits to a specific URL", () => {
    render(<ToolInputAvailable url="https://example.com/a" />);
    expect(screen.getByText("Fetching page")).toBeInTheDocument();
    expect(screen.getByText("https://example.com/a")).toBeInTheDocument();
  });

  it("output-error names the reason, the URL tried, and a next step", () => {
    render(
      <ToolOutputError url="https://nope.invalid" message="Could not reach nope.invalid." />,
    );
    expect(screen.getByText("Could not inspect")).toBeInTheDocument();
    expect(screen.getByText("Could not reach nope.invalid.")).toBeInTheDocument();
    expect(screen.getByText(/Tried: https:\/\/nope\.invalid/)).toBeInTheDocument();
    expect(screen.getByText(/try the site/i)).toBeInTheDocument();
  });

  it("each state announces a different headline", () => {
    const headlines = new Set<string>();
    for (const [el] of [
      [<ToolInputStreaming key="a" />],
      [<ToolInputAvailable key="b" url="https://x.test" />],
      [<ToolOutputAvailable key="c" result={result} />],
      [<ToolOutputError key="d" message="boom" />],
    ]) {
      const { unmount } = render(el);
      headlines.add(screen.getByText(/Preparing request|Fetching page|Inspection complete|Could not inspect/).textContent ?? "");
      unmount();
    }
    expect(headlines.size).toBe(4);
  });
});
