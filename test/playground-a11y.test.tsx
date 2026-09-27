import { describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Dialog } from "@/playground/dialog";
import { Tabs } from "@/playground/tabs";
import { Disclosure } from "@/playground/disclosure";

describe("Dialog — APG modal pattern", () => {
  function Harness() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button type="button" onClick={() => setOpen(true)}>
          Open
        </button>
        <Dialog open={open} onClose={() => setOpen(false)} title="Settings">
          <button type="button">Inner</button>
        </Dialog>
      </>
    );
  }

  it("exposes the right roles and is labelled by its heading", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAccessibleName("Settings");
  });

  it("moves focus into the dialog on open", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    await waitFor(() =>
      expect(screen.getByRole("dialog").contains(document.activeElement)).toBe(true),
    );
  });

  it("traps Tab inside the dialog", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    const dialog = screen.getByRole("dialog");
    for (let i = 0; i < 6; i++) {
      await user.tab();
      expect(dialog.contains(document.activeElement)).toBe(true);
    }
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("returns focus to the trigger on close", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const trigger = screen.getByRole("button", { name: "Open" });
    await user.click(trigger);
    await user.keyboard("{Escape}");
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });
});

describe("Tabs — APG pattern", () => {
  const items = [
    { id: "a", label: "First", content: <p>Panel one</p> },
    { id: "b", label: "Second", content: <p>Panel two</p> },
    { id: "c", label: "Third", content: <p>Panel three</p> },
  ];

  it("wires tablist, tabs and panels together", () => {
    render(<Tabs items={items} label="Demo" />);
    expect(screen.getByRole("tablist")).toHaveAccessibleName("Demo");
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(3);
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveAccessibleName("First");
  });

  it("keeps only one tab in the tab order (roving tabindex)", () => {
    render(<Tabs items={items} label="Demo" />);
    const tabs = screen.getAllByRole("tab");
    expect(tabs.filter((t) => t.getAttribute("tabindex") === "0")).toHaveLength(1);
  });

  it("moves focus with arrows and wraps at both ends", async () => {
    const user = userEvent.setup();
    render(<Tabs items={items} label="Demo" />);
    const tabs = screen.getAllByRole("tab");
    tabs[0].focus();
    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(tabs[1]);
    await user.keyboard("{ArrowLeft}{ArrowLeft}");
    expect(document.activeElement).toBe(tabs[2]); // wrapped backwards
    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(tabs[0]); // wrapped forwards
  });

  it("supports Home and End", async () => {
    const user = userEvent.setup();
    render(<Tabs items={items} label="Demo" />);
    const tabs = screen.getAllByRole("tab");
    tabs[0].focus();
    await user.keyboard("{End}");
    expect(document.activeElement).toBe(tabs[2]);
    await user.keyboard("{Home}");
    expect(document.activeElement).toBe(tabs[0]);
  });

  it("activates with Enter, and only then swaps the panel", async () => {
    const user = userEvent.setup();
    render(<Tabs items={items} label="Demo" />);
    const tabs = screen.getAllByRole("tab");
    tabs[0].focus();
    await user.keyboard("{ArrowRight}");
    // Manual activation: focus moved, selection did not.
    expect(screen.getByRole("tabpanel")).toHaveAccessibleName("First");
    await user.keyboard("{Enter}");
    expect(screen.getByRole("tabpanel")).toHaveAccessibleName("Second");
  });
});

describe("Disclosure — APG pattern", () => {
  it("reports and toggles its expanded state", async () => {
    const user = userEvent.setup();
    render(<Disclosure summary="Details">hidden body</Disclosure>);
    const button = screen.getByRole("button", { name: "Details" });
    expect(button).toHaveAttribute("aria-expanded", "false");
    await user.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
  });

  it("keeps collapsed content out of the accessibility tree", async () => {
    const user = userEvent.setup();
    render(<Disclosure summary="Details">secret body</Disclosure>);
    expect(screen.queryByText("secret body")).not.toBeVisible();
    await user.click(screen.getByRole("button", { name: "Details" }));
    expect(screen.getByText("secret body")).toBeVisible();
  });

  it("opens from the keyboard alone", async () => {
    const user = userEvent.setup();
    render(<Disclosure summary="Details">body</Disclosure>);
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Details" }));
    await user.keyboard("{Enter}");
    expect(screen.getByRole("button", { name: "Details" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });
});
