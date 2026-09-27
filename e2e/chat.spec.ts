import { expect, test } from "@playwright/test";

test.describe("primary flow", () => {
  test("a visitor can send a message and watch the reply stream in", async ({ page }) => {
    await page.goto("/chat");

    // Empty state is onboarding, not an apology.
    await expect(page.getByText("Start a conversation")).toBeVisible();
    const suggestion = page.getByRole("button", { name: /Explain a ResizeObserver/ });
    await suggestion.click();

    const composer = page.getByLabel("Message Sema");
    await expect(composer).not.toHaveValue("");

    await page.getByRole("button", { name: "Send" }).click();

    // The user's own message appears immediately.
    await expect(page.getByText(/Explain a ResizeObserver/).first()).toBeVisible();

    // A reply arrives and grows — proving it streamed rather than appeared.
    const assistant = page.locator("li").last();
    await expect(assistant).not.toBeEmpty({ timeout: 30_000 });
    const early = (await assistant.innerText()).length;
    await page.waitForTimeout(700);
    const later = (await assistant.innerText()).length;
    expect(later).toBeGreaterThanOrEqual(early);

    // Composer is usable again once the turn finishes.
    await expect(page.getByRole("button", { name: "Send" })).toBeVisible({ timeout: 30_000 });
    await expect(composer).toHaveValue("");
  });

  test("a mid-stream failure shows a designed error with a retry", async ({ page }) => {
    await page.goto("/chat?fail=midstream");

    await page.getByLabel("Message Sema").fill("count to twenty");
    await page.getByRole("button", { name: "Send" }).click();

    // Next.js injects its own role="alert" route announcer, so scope to the
    // one that actually carries the error copy.
    const alert = page.getByRole("alert").filter({ hasText: /did not finish/i });
    await expect(alert).toBeVisible({ timeout: 30_000 });
    await expect(alert).toContainText(/did not finish/i);
    // The retry names the message it will resend, not "the conversation".
    await expect(alert).toContainText("count to twenty");
    await expect(page.getByRole("button", { name: /Retry this message/ })).toBeVisible();
  });

  test("the composer is reachable and usable by keyboard alone", async ({ page }) => {
    await page.goto("/chat");
    await page.keyboard.press("Tab"); // skip link
    const composer = page.getByLabel("Message Sema");
    await composer.focus();
    await composer.type("hello from the keyboard");
    await expect(composer).toHaveValue("hello from the keyboard");
    await expect(page.getByRole("button", { name: "Send" })).toBeEnabled();
  });
});
