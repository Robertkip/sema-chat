import type { ReactNode } from "react";

/**
 * A deliberately small Markdown renderer built for *incomplete* input.
 *
 * A general renderer assumes it is handed a finished document. Streamed text
 * is finished only at the very end, so a naive render flickers: an opening
 * fence shows three literal backticks until the closing fence arrives, and a
 * lone `**` renders as asterisks that later vanish.
 *
 * The fix is to buffer per block and to treat an unterminated construct as the
 * thing it is *becoming*, not as literal text:
 *
 *   - an unclosed ``` fence renders as a code block immediately, so the block
 *     never visually reflows when the closing fence lands;
 *   - inline markers render only as complete pairs, so a dangling `*` or `` ` ``
 *     stays literal and never flashes formatting on and off.
 */

export type Block =
  | { kind: "code"; lang: string | null; code: string; complete: boolean }
  | { kind: "prose"; text: string };

const FENCE = /^```([A-Za-z0-9_+-]*)[ \t]*$/;

export function parseBlocks(source: string): Block[] {
  const blocks: Block[] = [];
  const lines = source.split("\n");

  let prose: string[] = [];
  let code: string[] | null = null;
  let lang: string | null = null;

  const flushProse = () => {
    if (prose.length === 0) return;
    const text = prose.join("\n");
    if (text.trim() !== "") blocks.push({ kind: "prose", text });
    prose = [];
  };

  for (const line of lines) {
    const fence = FENCE.exec(line.trim());

    if (code === null && fence) {
      flushProse();
      code = [];
      lang = fence[1] || null;
      continue;
    }

    if (code !== null && line.trim() === "```") {
      blocks.push({ kind: "code", lang, code: code.join("\n"), complete: true });
      code = null;
      lang = null;
      continue;
    }

    if (code !== null) code.push(line);
    else prose.push(line);
  }

  // Still inside a fence when the stream paused: render it as code anyway.
  if (code !== null) {
    blocks.push({ kind: "code", lang, code: code.join("\n"), complete: false });
  }
  flushProse();

  return blocks;
}

/** Matches only *closed* pairs, so a dangling marker stays literal. */
const INLINE = /(`[^`\n]+`|\*\*[^*\n]+\*\*)/g;

export function renderInline(text: string): ReactNode[] {
  return text.split(INLINE).map((piece, i) => {
    if (piece.startsWith("`") && piece.endsWith("`") && piece.length > 1) {
      return (
        <code key={i} className="rounded bg-surface-sunken px-1 py-0.5 font-mono text-[0.9em]">
          {piece.slice(1, -1)}
        </code>
      );
    }
    if (piece.startsWith("**") && piece.endsWith("**") && piece.length > 4) {
      return (
        <strong key={i} className="font-semibold">
          {piece.slice(2, -2)}
        </strong>
      );
    }
    return piece;
  });
}

export function StreamingMarkdown({ text }: { text: string }) {
  const blocks = parseBlocks(text);

  return (
    <>
      {blocks.map((block, i) =>
        block.kind === "code" ? (
          <pre
            key={i}
            className="my-2 overflow-x-auto rounded-control bg-surface-sunken p-3 text-xs"
          >
            <code>{block.code}</code>
          </pre>
        ) : (
          <p key={i} className="whitespace-pre-wrap">
            {renderInline(block.text)}
          </p>
        ),
      )}
    </>
  );
}
