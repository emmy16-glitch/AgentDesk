import { expect, test } from "@playwright/test";

test("mobile menu manages focus, Escape and outside dismissal", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "networkidle" });

  const toggle = page.getByRole("button", { name: "Open menu" });
  await toggle.click();

  const menu = page.getByRole("navigation", { name: "Mobile navigation" });
  await expect(menu).toBeVisible();
  await expect(page.getByRole("link", { name: "Marketplace" }).last()).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(menu).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Open menu" })).toBeFocused();

  await page.getByRole("button", { name: "Open menu" }).click();
  await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toBeVisible();
  await page.locator("main").click({ position: { x: 5, y: 5 } });
  await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toHaveCount(0);
});

test("completed workflow steps use a real icon instead of a text glyph", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await page.getByLabel("What do you want an agent to do?").fill("Find a yield option");
  await page.getByRole("button", { name: /Find the best agent/i }).click();

  const completedStep = page.locator(".ad-stepper li.complete").first();
  await expect(completedStep.locator("svg")).toHaveCount(1);
  await expect(completedStep).not.toContainText("✓");
});
