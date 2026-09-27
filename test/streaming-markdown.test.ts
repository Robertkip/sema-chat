import { describe, expect, it } from "vitest";
import { parseBlocks } from "@/app/chat/streaming-markdown";

describe("parseBlocks — mid-stream safety", () => {
  it("treats an unclosed fence as a code block, not literal backticks", () => {
    const blocks = parseBlocks('Here you go:\n```ts\nconst a = 1;');
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toEqual({ kind: "prose", text: "Here you go:" });
    expect(blocks[1]).toEqual({
      kind: "code",
      lang: "ts",
      code: "const a = 1;",
      complete: false,
    });
  });

  it("does not reflow the block when the closing fence finally arrives", () => {
    const partial = parseBlocks('```ts\nconst a = 1;');
    const done = parseBlocks('```ts\nconst a = 1;\n```');
    expect(partial[0].kind).toBe("code");
    expect(done[0].kind).toBe("code");
    // Same kind and same code either side of completion: no visual jump.
    expect((partial[0] as { code: string }).code).toBe(
      (done[0] as { code: string }).code,
    );
  });

  it("never emits a fence marker as prose at any prefix of the stream", () => {
    const full = 'Try this:\n```js\nconsole.log(1);\n```\nDone.';
    for (let i = 1; i <= full.length; i++) {
      const prose = parseBlocks(full.slice(0, i))
        .filter((b) => b.kind === "prose")
        .map((b) => (b as { text: string }).text)
        .join("\n");
      expect(prose).not.toContain("```");
    }
  });

  it("handles a fence with no language", () => {
    const [block] = parseBlocks("```\nplain\n```");
    expect(block).toEqual({ kind: "code", lang: null, code: "plain", complete: true });
  });

  it("keeps prose after a closed fence separate", () => {
    const blocks = parseBlocks("a\n```\nx\n```\nb");
    expect(blocks.map((b) => b.kind)).toEqual(["prose", "code", "prose"]);
  });

  it("drops whitespace-only prose", () => {
    expect(parseBlocks("\n\n   \n")).toEqual([]);
  });
});
