import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const SHOTS = path.join(process.cwd(), "tests", "screenshots");
fs.mkdirSync(SHOTS, { recursive: true });

/** Freeze animations so screenshots are deterministic. */
async function settle(page: import("@playwright/test").Page) {
  await page.addStyleTag({
    content: `*,*::before,*::after{animation:none!important;transition:none!important;
      animation-duration:0s!important;transition-duration:0s!important}`,
  });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
}

test("marketplace renders and is captured", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));

  const res = await page.goto("/", { waitUntil: "networkidle" });
  expect(res?.status(), "homepage HTTP status").toBe(200);

  await settle(page);

  const name = testInfo.project.name;
  await page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: true });

  // Structural assertions — the sections the reference design requires.
  for (const text of [
    "HealthGuard AI",
    "YieldPilot",
    "GridMaster",
    "RebalanceGuard",
    "Your Wallet",
    "AI Assistant",
  ]) {
    await expect(page.getByText(text).first(), `"${text}" present`).toBeVisible();
  }

  // No horizontal overflow at any breakpoint.
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, "horizontal overflow in px").toBeLessThanOrEqual(1);

  expect(errors.filter((e) => !/favicon|404/i.test(e)), "console errors").toEqual([]);
});

test("agent detail page renders", async ({ page }, testInfo) => {
  const res = await page.goto("/agents/healthguard-ai/", { waitUntil: "networkidle" });
  expect(res?.status()).toBe(200);
  await settle(page);
  await page.screenshot({
    path: path.join(SHOTS, `${testInfo.project.name}-detail.png`),
    fullPage: true,
  });
});
