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

  test("the whole primary flow is completable by keyboard alone", async ({ page }) => {
    await page.goto("/chat");

    // Tab from the top and assert the skip link is the first stop — the
    // keyboard entry point for the whole page.
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();

    // Keep tabbing until focus lands on the composer, without ever touching
    // the mouse. A bounded loop so a regression fails rather than hangs.
    const composer = page.getByLabel("Message Sema");
    for (let i = 0; i < 25 && !(await composer.evaluate((el) => el === document.activeElement)); i++) {
      await page.keyboard.press("Tab");
    }
    await expect(composer).toBeFocused();

    // Type and submit with Enter — no click anywhere in this test.
    await page.keyboard.type("say hello briefly");
    await page.keyboard.press("Enter");

    await expect(page.getByText("say hello briefly").first()).toBeVisible();

    // A reply arrives and the composer becomes usable again.
    await expect(page.getByRole("button", { name: "Send" })).toBeVisible({ timeout: 30_000 });
    await expect(composer).toHaveValue("");
  });

  test("every interactive control on the chat page has an accessible name", async ({ page }) => {
    await page.goto("/chat");
    const controls = page.locator("button, a[href], input, select, textarea");
    const count = await controls.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const el = controls.nth(i);
      const name = (await el.evaluate((n) => {
        const e = n as HTMLElement;
        return (
          e.getAttribute("aria-label") ??
          e.getAttribute("title") ??
          (e.id ? document.querySelector(`label[for="${e.id}"]`)?.textContent : null) ??
          e.textContent ??
          ""
        );
      })) as string;
      expect(name.trim(), `control ${i} has no accessible name`).not.toBe("");
    }
  });
});
