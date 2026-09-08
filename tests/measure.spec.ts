import { test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/** Dumps real geometry + computed styles so we can diff against the reference numerically. */
test("measure layout", async ({ page }, testInfo) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await page.addStyleTag({
    content: `*,*::before,*::after{animation:none!important;transition:none!important}`,
  });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);

  const data = await page.evaluate(() => {
    const out: Record<string, unknown> = {};
    const box = (sel: string) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        x: Math.round(r.x), y: Math.round(r.y),
        w: Math.round(r.width), h: Math.round(r.height),
      };
    };
    const style = (sel: string, props: string[]) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const cs = getComputedStyle(el);
      return Object.fromEntries(props.map((p) => [p, cs.getPropertyValue(p)]));
    };

    out.viewport = { w: window.innerWidth, h: window.innerHeight };
    out.nav = box("header, nav");
    out.h1 = box("h1");
    out.h1Style = style("h1", ["font-size", "line-height", "font-weight", "letter-spacing"]);
    out.bodyBg = style("body", ["background-color"]);

    // Hero: first main section
    const main = document.querySelector("main");
    out.main = main ? (() => { const r = main.getBoundingClientRect();
      return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; })() : null;

    // Agent cards: find repeated grid children containing "Trust Score"
    const cards = [...document.querySelectorAll("*")].filter(
      (e) => e.children.length > 2 && /Trust Score/.test(e.textContent ?? "") &&
        !/Trust Score[\s\S]*Trust Score/.test(e.textContent ?? "")
    );
    out.cardCount = cards.length;
    if (cards[0]) {
      const r = cards[0].getBoundingClientRect();
      out.card0 = { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
      const cs = getComputedStyle(cards[0]);
      out.card0Style = {
        bg: cs.backgroundColor, radius: cs.borderRadius,
        border: cs.borderColor, padding: cs.padding,
      };
    }
    if (cards[1]) {
      const r0 = cards[0].getBoundingClientRect(), r1 = cards[1].getBoundingClientRect();
      out.cardGap = Math.round(r1.x - r0.right);
    }

    // Sidebar: element containing "Your Wallet"
    const wallet = [...document.querySelectorAll("*")].find(
      (e) => /Your Wallet/.test(e.textContent ?? "") && e.children.length && e.clientWidth > 200 && e.clientWidth < 600
    );
    if (wallet) {
      const r = wallet.getBoundingClientRect();
      out.sidebar = { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
    }

    // Gold tokens
    const cssVars = getComputedStyle(document.documentElement);
    out.goldVar = cssVars.getPropertyValue("--color-gold") || cssVars.getPropertyValue("--gold");

    // Primary CTA
    const cta = [...document.querySelectorAll("a,button")].find((e) => /Explore Agents/.test(e.textContent ?? ""));
    if (cta) {
      const r = cta.getBoundingClientRect();
      const cs = getComputedStyle(cta);
      out.cta = { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
        bg: cs.backgroundColor, radius: cs.borderRadius, fontSize: cs.fontSize };
    }

    out.docHeight = document.documentElement.scrollHeight;
    return out;
  });

  const dir = path.join(process.cwd(), "tests", "screenshots");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, `measure-${testInfo.project.name}.json`),
    JSON.stringify(data, null, 2),
  );
  console.log(testInfo.project.name, JSON.stringify(data, null, 2));
});
