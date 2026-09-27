/**
 * Deliberate failure injection, so the failure states can be demonstrated and
 * tested rather than described.
 *
 * FE-08 asks for sabotage in a fixed order, and a reviewer needs a way to
 * reproduce each failure without editing code or throttling a network. The
 * chat page forwards `?fail=` to the API route, so every state below is one
 * URL away:
 *
 *   /chat?fail=start      → the request fails before any token arrives
 *   /chat?fail=midstream  → the stream dies partway through a reply
 *   /chat?fail=rate-limit → HTTP 429, the shape a real overload takes
 *   /chat?fail=slow       → a deliberately slow first token, for skeletons
 *
 * This is safe to leave enabled in production: every mode only degrades the
 * caller's own request. It reads nothing and writes nothing.
 */

export const FAILURE_MODES = ["start", "midstream", "rate-limit", "slow"] as const;
export type FailureMode = (typeof FAILURE_MODES)[number];

export function parseFailureMode(value: string | null): FailureMode | null {
  return FAILURE_MODES.includes(value as FailureMode) ? (value as FailureMode) : null;
}

export class InjectedFailure extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InjectedFailure";
  }
}

/**
 * Kills a stream partway through, after enough chunks have flowed that the
 * user has visibly started reading. Failing on chunk 0 would be the `start`
 * case wearing a different name.
 *
 * It enqueues an `error` stream part rather than calling `controller.error()`.
 * Erroring the stream aborts the pipe outright, so the failure escapes as a
 * rejection on the response body and `toUIMessageStream`'s onError never runs
 * — the client then gets a broken socket instead of a designed error frame.
 * An error *part* stays inside the protocol and becomes one.
 */
type ErrorPart = { type: "error"; error: unknown };

export function failAfter<T>(chunks: number): TransformStream<T, T | ErrorPart> {
  let seen = 0;
  let fired = false;
  return new TransformStream<T, T | ErrorPart>({
    transform(chunk, controller) {
      if (fired) return;
      controller.enqueue(chunk);
      if (++seen >= chunks) {
        fired = true;
        controller.enqueue({
          type: "error",
          error: new InjectedFailure(
            "The connection dropped while the reply was streaming.",
          ),
        });
        controller.terminate();
      }
    },
  });
}

export function delayStream<T>(ms: number): TransformStream<T, T> {
  let first = true;
  return new TransformStream<T, T>({
    async transform(chunk, controller) {
      if (first) {
        first = false;
        await new Promise((r) => setTimeout(r, ms));
      }
      controller.enqueue(chunk);
    },
  });
}
