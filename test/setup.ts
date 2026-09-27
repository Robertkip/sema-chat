import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

/**
 * jsdom implements neither of these, and both are used by the chat's
 * scroll-pinning hook. Stubbing them here rather than in each test keeps the
 * component under test unmodified — no test-only branches in production code.
 */
if (!("ResizeObserver" in globalThis)) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

if (!Element.prototype.scrollTo) {
  Element.prototype.scrollTo = vi.fn() as unknown as typeof Element.prototype.scrollTo;
}
