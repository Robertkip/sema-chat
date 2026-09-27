import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StatefulButton } from "@/components/stateful-button";

const deferred = () => {
  let resolve!: () => void;
  let reject!: (e?: unknown) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const btn = () => screen.getByRole("button");

describe("StatefulButton — lifecycle", () => {
  it("walks idle → loading → success → idle", async () => {
    const user = userEvent.setup();
    const d = deferred();
    render(<StatefulButton onAction={() => d.promise} successHoldMs={60} />);

    expect(btn()).toHaveAttribute("data-state", "idle");
    await user.click(btn());
    expect(btn()).toHaveAttribute("data-state", "loading");
    expect(btn()).toHaveAttribute("aria-busy", "true");

    d.resolve();
    await waitFor(() => expect(btn()).toHaveAttribute("data-state", "success"));
    // The success state is a hold, not a terminus — it returns on its own.
    await waitFor(() => expect(btn()).toHaveAttribute("data-state", "idle"));
  });

  it("holds the error state instead of auto-clearing", async () => {
    const user = userEvent.setup();
    render(
      <StatefulButton onAction={() => Promise.reject(new Error("no"))} successHoldMs={20} />,
    );
    await user.click(btn());
    await waitFor(() => expect(btn()).toHaveAttribute("data-state", "error"));
    // Well past any success hold: an error is not a toast, it waits for the user.
    await new Promise((r) => setTimeout(r, 200));
    expect(btn()).toHaveAttribute("data-state", "error");
  });

  it("recovers from error on the next click", async () => {
    const user = userEvent.setup();
    let fail = true;
    render(
      <StatefulButton
        onAction={async () => {
          if (fail) {
            fail = false;
            throw new Error("no");
          }
        }}
      />,
    );
    await user.click(btn());
    await waitFor(() => expect(btn()).toHaveAttribute("data-state", "error"));
    await user.click(btn());
    await waitFor(() => expect(btn()).toHaveAttribute("data-state", "success"));
  });
});

describe("StatefulButton — interruption", () => {
  it("ignores clicks while loading rather than queueing them", async () => {
    const user = userEvent.setup();
    const action = vi.fn().mockImplementation(() => new Promise<void>(() => {}));
    render(<StatefulButton onAction={action} />);
    await user.click(btn());
    await user.click(btn());
    await user.click(btn());
    expect(action).toHaveBeenCalledTimes(1);
  });

  it("does not let a stale result overwrite a newer run", async () => {
    const user = userEvent.setup();
    const first = deferred();
    const second = deferred();
    let call = 0;
    render(
      <StatefulButton
        onAction={() => (++call === 1 ? first.promise : second.promise)}
        successHoldMs={50}
      />,
    );

    // Run 1 fails, leaving the button in error.
    await user.click(btn());
    first.reject(new Error("no"));
    await waitFor(() => expect(btn()).toHaveAttribute("data-state", "error"));

    // Run 2 starts. If run 1 resolved late it must not touch state.
    await user.click(btn());
    expect(btn()).toHaveAttribute("data-state", "loading");
    second.resolve();
    await waitFor(() => expect(btn()).toHaveAttribute("data-state", "success"));
    expect(call).toBe(2);
  });
});

describe("StatefulButton — accessibility", () => {
  it("is operable from the keyboard", async () => {
    const user = userEvent.setup();
    const action = vi.fn().mockResolvedValue(undefined);
    render(<StatefulButton onAction={action} />);
    await user.tab();
    expect(document.activeElement).toBe(btn());
    await user.keyboard("{Enter}");
    expect(action).toHaveBeenCalledTimes(1);
  });

  it("keeps the accessible name in step with the visible state", async () => {
    const user = userEvent.setup();
    render(<StatefulButton onAction={() => new Promise<void>(() => {})} />);
    expect(btn()).toHaveAccessibleName(/Send message/);
    await user.click(btn());
    await waitFor(() => expect(btn()).toHaveAccessibleName(/Sending/));
  });

  it("cannot be actioned when disabled", async () => {
    const user = userEvent.setup();
    const action = vi.fn();
    render(<StatefulButton disabled onAction={action} />);
    await user.click(btn());
    expect(action).not.toHaveBeenCalled();
    expect(btn()).toBeDisabled();
  });
});
