import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SettingsForm } from "@/app/settings/settings-form";

function setup(onSave = vi.fn().mockResolvedValue(undefined)) {
  return { user: userEvent.setup(), onSave, ...render(<SettingsForm onSave={onSave} />) };
}

describe("SettingsForm", () => {
  it("associates every label with its control", () => {
    setup();
    expect(screen.getByLabelText("Display name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("API key")).toBeInTheDocument();
    expect(screen.getByLabelText("Model")).toBeInTheDocument();
    expect(screen.getByLabelText("Temperature")).toBeInTheDocument();
    expect(screen.getByLabelText("Enable notifications")).toBeInTheDocument();
  });

  it("masks the API key by default and toggles visibility", async () => {
    const { user } = setup();
    const key = screen.getByLabelText("API key");
    expect(key).toHaveAttribute("type", "password");
    await user.click(screen.getByRole("button", { name: "Show" }));
    expect(key).toHaveAttribute("type", "text");
  });

  it("blocks submit and reports an error when display name is empty", async () => {
    const { user, onSave } = setup();
    await user.type(screen.getByLabelText("Email"), "robert@example.com");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("Display name is required")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("rejects a malformed email", async () => {
    const { user, onSave } = setup();
    await user.type(screen.getByLabelText("Display name"), "Robert");
    await user.type(screen.getByLabelText("Email"), "robert@");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("Enter a valid email address")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  // Round one compared temperature as a string: "10" > "2" is false, so 10 passed.
  it("rejects temperature 10 (the string-comparison bug from round one)", async () => {
    const { user, onSave } = setup();
    await user.type(screen.getByLabelText("Display name"), "Robert");
    await user.type(screen.getByLabelText("Email"), "robert@example.com");
    const temp = screen.getByLabelText("Temperature");
    await user.clear(temp);
    await user.type(temp, "10");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("Temperature must be at most 2")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("submits temperature as a number, not a string", async () => {
    const { user, onSave } = setup();
    await user.type(screen.getByLabelText("Display name"), "Robert");
    await user.type(screen.getByLabelText("Email"), "robert@example.com");
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0].temperature).toBe(0.7);
    expect(typeof onSave.mock.calls[0][0].temperature).toBe("number");
  });

  // Round one's Cancel button had no type, so it defaulted to submit.
  it("does not submit when Cancel is clicked", async () => {
    const { user, onSave } = setup();
    await user.type(screen.getByLabelText("Display name"), "Robert");
    await user.type(screen.getByLabelText("Email"), "robert@example.com");
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Display name")).toHaveValue("");
  });

  it("announces a successful save in a live region", async () => {
    const { user } = setup();
    await user.type(screen.getByLabelText("Display name"), "Robert");
    await user.type(screen.getByLabelText("Email"), "robert@example.com");
    await user.click(screen.getByRole("button", { name: "Save" }));
    const status = await screen.findByRole("status");
    await waitFor(() => expect(status).toHaveTextContent("Settings saved."));
  });

  it("surfaces an error when saving fails", async () => {
    const { user } = setup(vi.fn().mockRejectedValue(new Error("network")));
    await user.type(screen.getByLabelText("Display name"), "Robert");
    await user.type(screen.getByLabelText("Email"), "robert@example.com");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("Could not save settings. Try again.")).toBeInTheDocument();
  });
});
