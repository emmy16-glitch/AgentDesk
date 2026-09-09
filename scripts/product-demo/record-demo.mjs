#!/usr/bin/env node
/**
 * AgentDesk product-demo recorder.
 *
 * Records the REAL deployed app through a real browser (Playwright
 * Chromium, headless): real network, real live discovery, real agent
 * auditions, real waits. Nothing is mocked, retried silently, or faked.
 *
 * Capture: Playwright viewport recording = the browser/app area only
 * (no tabs, no desktop clutter). A calm cursor dot follows the real
 * pointer events inside the page.
 *
 * Post-capture: the raw webm is trimmed to start on the settled
 * homepage, wrapped into an OpenScreen project (agentdesk.openscreen)
 * and handed to `openscreen export` by the workflow for the polished
 * look (wallpaper, shadow, motion blur, zooms, 16:9 MP4).
 *
 * Flow (deliberate pacing):
 *   Ask → type "Find a low-risk yield option for 500 USDC."
 *   Details → review, continue
 *   Test → live discovery + auditions at their own pace
 *   Best match → pause on the result
 *   Check → verification evidence
 *   Hire → hire stage
 *   → return to the AgentDesk brand / homepage message
 *
 * Honesty rule: if live discovery fails, the failure screen is recorded
 * as-is and flagged in demo/events.json (`flowFailed: true`).
 */

import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";

const APP_URL = process.env.DEMO_URL || "https://agentdesk-bnb-eight.vercel.app/";
const DEMO_DIR = path.resolve(process.env.DEMO_DIR || "demo");
const RAW_DIR = path.join(DEMO_DIR, "raw");
const PROJECT_FILE = path.join(DEMO_DIR, "agentdesk.openscreen");
const EVENTS_FILE = path.join(DEMO_DIR, "events.json");
const SCREEN_W = 1920;
const SCREEN_H = 1080;
const PROMPT = "Find a low-risk yield option for 500 USDC.";

fs.mkdirSync(RAW_DIR, { recursive: true });

const log = (...args) => console.log(new Date().toISOString(), "[record-demo]", ...args);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/* ------------------------------------------------------------------ */
/* Event log (timestamps relative to video epoch)                      */
/* ------------------------------------------------------------------ */

let videoEpoch = Date.now(); // replaced right before the page is created
const events = [];

function recordEvent(name, extra = {}) {
  const entry = { name, tMs: Math.max(0, Date.now() - videoEpoch), ...extra };
  events.push(entry);
  log("event:", name, JSON.stringify(extra));
}

/* ------------------------------------------------------------------ */
/* Cursor overlay: a calm dot riding the real pointer events           */
/* ------------------------------------------------------------------ */

const CURSOR_OVERLAY_SCRIPT = `(() => {
  if (window.__agentDeskDemoCursor) return;
  window.__agentDeskDemoCursor = true;
  const css = document.createElement("style");
  css.textContent = [
    "#ad-demo-cursor{position:fixed;left:0;top:0;width:18px;height:18px;margin:-9px 0 0 -9px;border-radius:50%;",
    "background:rgba(255,255,255,.97);border:1.5px solid rgba(10,12,16,.9);opacity:0;",
    "box-shadow:0 1px 7px rgba(0,0,0,.5),0 0 0 1px rgba(255,255,255,.12);",
    "pointer-events:none;z-index:2147483647;will-change:transform;",
    "transition:transform 95ms cubic-bezier(.22,.61,.36,1),opacity 300ms ease;transform:translate(-100px,-100px);}",
    ".ad-demo-click-ring{position:fixed;width:16px;height:16px;margin:-8px 0 0 -8px;border-radius:50%;",
    "border:2px solid rgba(255,255,255,.85);pointer-events:none;z-index:2147483646;",
    "animation:ad-demo-ring 420ms ease-out forwards;}",
    "@keyframes ad-demo-ring{from{opacity:.9;transform:scale(1);}to{opacity:0;transform:scale(3.2);}}",
  ].join("");
  document.documentElement.appendChild(css);
  const dot = document.createElement("div");
  dot.id = "ad-demo-cursor";
  document.documentElement.appendChild(dot);
  window.addEventListener("mousemove", (event) => {
    dot.style.transform = "translate(" + event.clientX + "px," + event.clientY + "px)";
    if (dot.style.opacity !== "1") dot.style.opacity = "1";
  }, true);
  window.addEventListener("mousedown", (event) => {
    if (event.button !== 0) return;
    const ring = document.createElement("div");
    ring.className = "ad-demo-click-ring";
    ring.style.left = event.clientX + "px";
    ring.style.top = event.clientY + "px";
    document.documentElement.appendChild(ring);
    setTimeout(() => ring.remove(), 480);
  }, true);
})();`;

/* ------------------------------------------------------------------ */
/* Calm pointer helpers                                                */
/* ------------------------------------------------------------------ */

const pointer = { x: SCREEN_W / 2, y: SCREEN_H - 140 };

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

async function smoothMoveTo(page, x, y, durationMs = 650) {
  const steps = Math.max(24, Math.round(durationMs / 12));
  const fromX = pointer.x;
  const fromY = pointer.y;
  for (let i = 1; i <= steps; i += 1) {
    const t = easeInOutCubic(i / steps);
    const px = Math.round(fromX + (x - fromX) * t);
    const py = Math.round(fromY + (y - fromY) * t);
    await page.mouse.move(px, py);
    pointer.x = px;
    pointer.y = py;
    await sleep(11);
  }
  await sleep(140);
}

async function calmClick(page) {
  await sleep(170);
  await page.mouse.down();
  await sleep(95);
  await page.mouse.up();
  await sleep(330);
}

/* ------------------------------------------------------------------ */
/* Page observation helpers                                            */
/* ------------------------------------------------------------------ */

async function waitForSelector(page, selector, { timeout = 30_000, label } = {}) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await page.$(selector)) return true;
    await sleep(300);
  }
  throw new Error(`Timed out waiting for ${label || selector}`);
}

async function waitForAny(page, selectors, timeout = 30_000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    for (const selector of selectors) {
      if (await page.$(selector)) return selector;
    }
    await sleep(400);
  }
  return null;
}

async function getBox(page, selector) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) };
  }, selector);
}

const centerX = (box) => Math.round(box.x + box.width / 2);
const centerY = (box) => Math.round(box.y + box.height / 2);

async function settlePage(page) {
  try { await page.waitForLoadState("networkidle", { timeout: 15_000 }); } catch { /* keep going */ }
  try { await page.evaluate(() => document.fonts?.ready); } catch { /* keep going */ }
  await sleep(900);
}

/* ------------------------------------------------------------------ */
/* The demo flow                                                       */
/* ------------------------------------------------------------------ */

async function writeEvents(extra = {}) {
  const payload = {
    recordedAt: new Date().toISOString(),
    appUrl: APP_URL,
    screen: { width: SCREEN_W, height: SCREEN_H },
    prompt: PROMPT,
    events,
    ...extra,
  };
  fs.writeFileSync(EVENTS_FILE, JSON.stringify(payload, null, 2));
}

let diagPage = null; // for fatal-time screenshots

async function run() {
  log("Launching headless Chromium for", APP_URL);
  const browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--hide-scrollbars",
      "--force-color-profile=srgb",
      "--lang=en-US",
      "--disable-blink-features=AutomationControlled",
    ],
  });

  const context = await browser.newContext({
    viewport: { width: SCREEN_W, height: SCREEN_H },
    deviceScaleFactor: 1,
    locale: "en-US",
    // Plain desktop Chrome UA (no "HeadlessChrome" fingerprint).
    userAgent:
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
    recordVideo: { dir: RAW_DIR, size: { width: SCREEN_W, height: SCREEN_H } },
  });
  await context.addInitScript(CURSOR_OVERLAY_SCRIPT);

  videoEpoch = Date.now();
  const page = await context.newPage();
  diagPage = page;
  page.on("pageerror", (error) => log("page error:", String(error).slice(0, 300)));

  log("Navigating…");
  try {
    await page.goto(APP_URL, { waitUntil: "domcontentloaded", timeout: 60_000 });
  } catch (error) {
    log("First navigation attempt failed, retrying once:", String(error).slice(0, 200));
    await sleep(2000);
    await page.goto(APP_URL, { waitUntil: "load", timeout: 90_000 });
  }
  await page.waitForSelector("#agent-task", { timeout: 60_000 });
  await settlePage(page);
  await page.screenshot({ path: path.join(DEMO_DIR, "diag-01-homepage.png") }).catch(() => {});
  recordEvent("homepage_ready", { box: await getBox(page, ".ad-hero-copy") });

  /* --- Stage 1 · Ask: let the headline breathe ---------------------- */
  await sleep(2900);

  const taskBox = await getBox(page, "#agent-task");
  if (!taskBox) throw new Error("Task textarea not found");
  await smoothMoveTo(page, centerX(taskBox), centerY(taskBox), 800);
  await calmClick(page);
  await sleep(400);
  await page.keyboard.type(PROMPT, { delay: 62 });
  recordEvent("prompt_typed");
  await sleep(900);

  const ctaBox = await getBox(page, ".ad-ask-cta");
  await smoothMoveTo(page, centerX(ctaBox), centerY(ctaBox), 650);
  await sleep(500);
  recordEvent("click_find_test", { box: ctaBox });
  await calmClick(page);

  /* --- Stage 2 · Details -------------------------------------------- */
  await waitForSelector(page, ".ad-details", { timeout: 20_000, label: "Details stage" });
  await settlePage(page);
  recordEvent("details_visible", { box: await getBox(page, ".ad-understood") });
  await sleep(3100);

  const liveBox = await getBox(page, ".ad-details .ad-primary");
  await smoothMoveTo(page, centerX(liveBox), centerY(liveBox), 600);
  await sleep(550);
  recordEvent("click_find_live", { box: liveBox });
  await calmClick(page);

  /* --- Stage 3 · Test: real discovery, real wait -------------------- */
  await waitForSelector(page, ".ad-test", { timeout: 20_000, label: "Test stage" });
  recordEvent("test_visible");

  const outcome = await waitForAny(page, [".ad-match", ".ad-stream-failure", ".ad-empty-result"], 240_000);
  let flowFailed = false;
  if (outcome === ".ad-stream-failure" || outcome === ".ad-empty-result") {
    const message = await page.textContent(`${outcome} h2`).catch(() => null);
    recordEvent("flow_failed", { selector: outcome, message: message?.trim() ?? null });
    await page.screenshot({ path: path.join(DEMO_DIR, "diag-flowfailed.png") }).catch(() => {});
    log("Live discovery failed — recording the honest failure state.");
    flowFailed = true;
    await sleep(5200);
  } else if (!outcome) {
    throw new Error("Discovery never produced a result or failure state (240s)");
  }

  if (!flowFailed) {
    /* --- Stage 4 · Best match --------------------------------------- */
    await settlePage(page);
    const answerBox = (await getBox(page, ".ad-agent-answer")) || (await getBox(page, ".ad-match-layout"));
    recordEvent("match_visible", { box: answerBox });
    await sleep(5200); // deliberate pause on the agent's result

    const primaryLabel = ((await page.textContent(".ad-screen-actions .ad-primary")) || "").trim();
    const primaryBox = await getBox(page, ".ad-screen-actions .ad-primary");
    await smoothMoveTo(page, centerX(primaryBox), centerY(primaryBox), 700);
    await sleep(550);
    recordEvent("click_primary_stage4", { label: primaryLabel, box: primaryBox });
    await calmClick(page);

    /* --- Stage 5 · Check (verification evidence) --------------------- */
    if (/check/i.test(primaryLabel)) {
      await waitForSelector(page, ".ad-check", { timeout: 20_000, label: "Check stage" });
      await settlePage(page);
      recordEvent("check_visible", { box: await getBox(page, ".ad-verification") });
      await sleep(4600); // let the verification evidence read

      const hireBox = await getBox(page, ".ad-screen-actions .ad-primary");
      await smoothMoveTo(page, centerX(hireBox), centerY(hireBox), 650);
      await sleep(500);
      recordEvent("click_continue_hire", { box: hireBox });
      await calmClick(page);
    }

    /* --- Stage 6 · Hire ---------------------------------------------- */
    await waitForSelector(page, ".ad-hire", { timeout: 20_000, label: "Hire stage" });
    await settlePage(page);
    recordEvent("hire_visible", { box: await getBox(page, ".ad-hire-layout") });
    await sleep(4200);

    /* --- Return to the brand ------------------------------------------ */
    const brandBox = await getBox(page, ".ad-brand");
    await smoothMoveTo(page, centerX(brandBox), centerY(brandBox), 900);
    await sleep(650);
    recordEvent("click_brand", { box: brandBox });
    await calmClick(page);

    await page.waitForSelector("#agent-task", { timeout: 30_000 });
    await settlePage(page);
    recordEvent("home_final_visible", { box: await getBox(page, ".ad-hero-copy") });
    await sleep(3300); // final beat on "Don't trust the listing. Test the agent."
  }

  log("Closing context to finalize the video…");
  const video = page.video();
  await context.close();
  const rawPath = await video.path();
  await browser.close();
  log("Raw recording:", rawPath);

  /* --- Trim to start on the settled homepage ------------------------- */
  const homepageReady = events.find((event) => event.name === "homepage_ready");
  const trimStart = Math.max(0, ((homepageReady?.tMs ?? 1000) - 120) / 1000);
  const trimmedPath = path.join(DEMO_DIR, "screen.mp4");
  const ffmpeg = spawnSync(
    "ffmpeg",
    [
      "-y", "-v", "error",
      "-ss", trimStart.toFixed(3),
      "-i", rawPath,
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "16",
      "-pix_fmt", "yuv420p", "-an",
      trimmedPath,
    ],
    { encoding: "utf8" },
  );
  if (ffmpeg.status !== 0) throw new Error(`ffmpeg trim failed: ${ffmpeg.stderr}`);

  const probe = spawnSync(
    "ffprobe",
    ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", trimmedPath],
    { encoding: "utf8" },
  );
  const durationMs = Math.round(Number.parseFloat(probe.stdout.trim()) * 1000);
  log("Trimmed screen.mp4:", trimmedPath, `(${(durationMs / 1000).toFixed(1)}s, trimStart=${trimStart.toFixed(2)}s)`);

  /* --- Wrap into an OpenScreen project ------------------------------- */
  const project = {
    version: 2,
    media: { screenVideoPath: trimmedPath, cursorCaptureMode: "system" },
    editor: {},
  };
  fs.writeFileSync(PROJECT_FILE, JSON.stringify(project, null, 2));

  // Re-anchor event timestamps onto the trimmed timeline.
  const offsetMs = Math.round(trimStart * 1000);
  for (const event of events) event.tMs = Math.max(0, event.tMs - offsetMs);

  await writeEvents({ flowFailed, durationMs, trimmedFrom: rawPath, trimStartSeconds: trimStart });
  log("Done. flowFailed =", flowFailed);
}

run().catch(async (error) => {
  console.error("[record-demo] FATAL:", error);
  try { await diagPage?.screenshot({ path: path.join(DEMO_DIR, "diag-fatal.png") }); } catch { /* best effort */ }
  await writeEvents({ fatal: String(error?.message || error) }).catch(() => {});
  process.exit(1);
});
