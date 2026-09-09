#!/usr/bin/env node
/**
 * AgentDesk product-demo recorder.
 *
 * Runs on a machine with: X11 display (Xvfb is fine), Google Chrome,
 * xdotool, playwright-core (npm) and the OpenScreen AppImage extracted
 * (see .github/workflows/product-demo.yml).
 *
 * What it does, deliberately and in order:
 *   1. Opens the AgentDesk app in Chrome (--app window = app area only,
 *      no tabs, no desktop clutter) on a 1920x1080 virtual display.
 *   2. Starts an OpenScreen headless recording of that display.
 *   3. Drives the real product flow with REAL pointer/keyboard events
 *      (xdotool) and REAL network responses — nothing is mocked:
 *        Ask  → type "Find a low-risk yield option for 500 USDC."
 *        Details → review, continue
 *        Test → let live discovery + auditions run at their own pace
 *        Best match → pause on the result
 *        Check → show the verification evidence
 *        Hire → show the hire stage
 *        → return to the AgentDesk brand / homepage message
 *   4. Stops the recording and writes demo/events.json with timestamps
 *      and focus rectangles for the zoom pass (finalize-project.mjs).
 *
 * Honesty rule: if live discovery fails, the failure screen is recorded
 * as-is and flagged in events.json (flowFailed). Nothing is retried
 * silently or papered over.
 */

import { spawn, execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright-core";

const APP_URL = process.env.DEMO_URL || "https://agentdesk-bnb-eight.vercel.app/";
const DEMO_DIR = path.resolve(process.env.DEMO_DIR || "demo");
const DISPLAY = process.env.DEMO_DISPLAY || ":99";
const OPENSCREEN_BIN = process.env.OPENSCREEN_BIN || "./squashfs-root/AppRun";
const PROJECT_FILE = path.join(DEMO_DIR, "agentdesk.openscreen");
const EVENTS_FILE = path.join(DEMO_DIR, "events.json");
const RECORD_LOG = path.join(DEMO_DIR, "openscreen-record.log");
const SCREEN_W = 1920;
const SCREEN_H = 1080;
const PROMPT = "Find a low-risk yield option for 500 USDC.";

fs.mkdirSync(DEMO_DIR, { recursive: true });

const log = (...args) => console.log(new Date().toISOString(), "[record-demo]", ...args);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/* ------------------------------------------------------------------ */
/* Event log                                                           */
/* ------------------------------------------------------------------ */

let t0 = null; // Date.now() when OpenScreen reported "Recording started"
const events = [];

function recordEvent(name, extra = {}) {
  const entry = { name, tMs: t0 === null ? null : Date.now() - t0, ...extra };
  events.push(entry);
  log("event:", name, JSON.stringify(extra));
}

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

/* ------------------------------------------------------------------ */
/* xdotool helpers (real OS-level pointer / keyboard events)           */
/* ------------------------------------------------------------------ */

const env = { ...process.env, DISPLAY };
const xdo = (...args) => execFileSync("xdotool", args, { env, stdio: ["ignore", "pipe", "pipe"] });

const pointer = { x: SCREEN_W / 2, y: SCREEN_H - 120 };

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

async function smoothMoveTo(x, y, durationMs = 650) {
  const steps = Math.max(24, Math.round(durationMs / 12));
  const fromX = pointer.x;
  const fromY = pointer.y;
  const perStep = durationMs / steps;
  for (let i = 1; i <= steps; i += 1) {
    const t = easeInOutCubic(i / steps);
    const px = Math.round(fromX + (x - fromX) * t);
    const py = Math.round(fromY + (y - fromY) * t);
    xdo("mousemove", String(px), String(py));
    pointer.x = px;
    pointer.y = py;
    await sleep(perStep);
  }
  await sleep(120);
}

async function clickAtCurrentPosition() {
  await sleep(160);
  xdo("click", "1");
  await sleep(320);
}

async function typeText(text) {
  // ~16 chars/second, calm and deliberate.
  execFileSync("xdotool", ["type", "--clearmodifiers", "--delay", "62", "--", text], {
    env,
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 60_000,
  });
}

/* ------------------------------------------------------------------ */
/* OpenScreen headless recording                                       */
/* ------------------------------------------------------------------ */

let recorder = null;
let recorderDonePayload = null;
const recorderLines = [];

function startRecordingOnce(sourceArgs, tag) {
  return new Promise((resolve, reject) => {
    const logStream = fs.createWriteStream(RECORD_LOG, { flags: "a" });
    logStream.write(`\n=== attempt: ${tag} ===\n`);
    recorder = spawn(
      OPENSCREEN_BIN,
      ["record", ...sourceArgs, "--cursor", "system", "--project", PROJECT_FILE, "--json"],
      { env: { ...env, ELECTRON_DISABLE_SANDBOX: "1" }, stdio: ["ignore", "pipe", "pipe"] },
    );

    let settled = false;
    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new Error(`OpenScreen recording did not start within 45s. Log tail:\n${recorderLines.slice(-20).join("\n")}`));
      }
    }, 45_000);

    recorder.stdout.on("data", (chunk) => {
      for (const line of chunk.toString("utf8").split("\n")) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        recorderLines.push(trimmed);
        logStream.write(`${trimmed}\n`);
        let parsed = null;
        try { parsed = JSON.parse(trimmed); } catch { continue; }
        if (parsed.event === "log" && /recording started/i.test(String(parsed.message ?? ""))) {
          if (!settled) {
            settled = true;
            clearTimeout(timeout);
            resolve();
          }
        }
        if (parsed.event === "done" && parsed.success === false && !settled) {
          settled = true;
          clearTimeout(timeout);
          reject(new Error(`OpenScreen ${tag} failed: ${JSON.stringify(parsed)}`));
        }
        if (parsed.event === "done") recorderDonePayload = parsed;
      }
    });
    recorder.stderr.on("data", (chunk) => logStream.write(chunk));
    recorder.on("exit", (code) => {
      log(`OpenScreen recorder (${tag}) exited with code`, code);
      if (!settled && code !== 0) {
        settled = true;
        clearTimeout(timeout);
        reject(new Error(`OpenScreen ${tag} exited early with code ${code}`));
      }
      logStream.end();
    });
  });
}

async function startRecording() {
  try {
    await startRecordingOnce(["--display", "0"], "display capture");
  } catch (error) {
    log("Display capture failed, retrying with window capture:", error.message);
    try { if (recorder && recorder.exitCode === null) recorder.kill("SIGKILL"); } catch { /* noop */ }
    await startRecordingOnce(["--window", "AgentDesk"], "window capture");
  }
}

async function stopRecording() {
  if (!recorder || recorder.exitCode !== null) return recorderDonePayload;
  log("Stopping OpenScreen recording (SIGINT)…");
  recorder.kill("SIGINT");
  const deadline = Date.now() + 60_000;
  while (recorder.exitCode === null && Date.now() < deadline) await sleep(500);
  if (recorder.exitCode === null) recorder.kill("SIGKILL");
  return recorderDonePayload;
}

/* ------------------------------------------------------------------ */
/* Cursor overlay: a calm dot that follows the REAL X pointer          */
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
/* Page helpers (CDP observation only — interactions stay OS-level)    */
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

async function run() {
  log("Launching Chrome app window for", APP_URL);
  const chromeBin = ["google-chrome-stable", "google-chrome", "chromium-browser", "chromium"]
    .find((bin) => {
      try { execFileSync("which", [bin], { stdio: "ignore" }); return true; } catch { return false; }
    });
  if (!chromeBin) throw new Error("No Chrome/Chromium binary found on this machine");

  const chrome = spawn(
    chromeBin,
    [
      `--app=${APP_URL}`,
      "--remote-debugging-port=9222",
      "--user-data-dir=/tmp/agentdesk-demo-profile",
      `--window-size=${SCREEN_W},${SCREEN_H}`,
      "--window-position=0,0",
      "--no-first-run",
      "--no-default-browser-check",
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--disable-background-timer-throttling",
      "--disable-renderer-backgrounding",
      "--disable-backgrounding-occluded-windows",
      "--hide-scrollbars",
      "--force-color-profile=srgb",
      "--lang=en-US",
    ],
    { env, stdio: ["ignore", "pipe", "pipe"] },
  );
  const chromeLog = fs.createWriteStream(path.join(DEMO_DIR, "chrome.log"), { flags: "a" });
  chrome.stdout.on("data", (chunk) => chromeLog.write(chunk));
  chrome.stderr.on("data", (chunk) => chromeLog.write(chunk));

  // Wait for the CDP endpoint to come up.
  let cdpReady = false;
  for (let attempt = 0; attempt < 40 && !cdpReady; attempt += 1) {
    await sleep(500);
    try {
      const response = await fetch("http://127.0.0.1:9222/json/version");
      cdpReady = response.ok;
    } catch { /* not up yet */ }
  }
  if (!cdpReady) throw new Error("Chrome DevTools endpoint never came up");

  const browser = await chromium.connectOverCDP("http://127.0.0.1:9222");
  const context = browser.contexts()[0];
  await context.addInitScript(CURSOR_OVERLAY_SCRIPT);
  const page = context.pages()[0] || (await context.waitForEvent("page"));
  page.on("console", (message) => log("page console:", message.type(), message.text().slice(0, 200)));
  page.on("pageerror", (error) => log("page error:", String(error).slice(0, 200)));
  log("Connected over CDP. URL:", page.url(), "Waiting for the homepage to settle…");
  await page.waitForSelector("#agent-task", { timeout: 60_000 });
  await settlePage(page);
  await page.evaluate(CURSOR_OVERLAY_SCRIPT); // cover the already-loaded document too

  // Pin the window to the virtual screen (no WM on Xvfb, be explicit).
  try {
    const wid = xdo("search", "--name", "AgentDesk").toString().trim().split("\n")[0];
    if (wid) {
      xdo("windowmove", wid, "0", "0");
      xdo("windowsize", wid, String(SCREEN_W), String(SCREEN_H));
      xdo("windowfocus", "--sync", wid);
    }
  } catch (error) {
    log("Could not pin window geometry (continuing):", error.message);
  }
  await sleep(1200);

  log("Starting OpenScreen recording…");
  await startRecording();
  t0 = Date.now();
  recordEvent("recording_started");

  /* --- Stage 1 · Ask: let the headline breathe ---------------------- */
  await sleep(2900);
  recordEvent("home_hold", { box: await getBox(page, ".ad-hero-copy") });

  const taskBox = await getBox(page, "#agent-task");
  if (!taskBox) throw new Error("Task textarea not found");
  await smoothMoveTo(centerX(taskBox), centerY(taskBox), 800);
  await clickAtCurrentPosition();
  await sleep(400);
  typeText(PROMPT);
  recordEvent("prompt_typed");
  await sleep(900);

  const ctaBox = await getBox(page, ".ad-ask-cta");
  await smoothMoveTo(centerX(ctaBox), centerY(ctaBox), 650);
  await sleep(500);
  recordEvent("click_find_test", { box: ctaBox });
  await clickAtCurrentPosition();

  /* --- Stage 2 · Details -------------------------------------------- */
  await waitForSelector(page, ".ad-details", { timeout: 20_000, label: "Details stage" });
  await settlePage(page);
  recordEvent("details_visible", { box: await getBox(page, ".ad-understood") });
  await sleep(3100);

  const liveBox = await getBox(page, ".ad-details .ad-primary");
  await smoothMoveTo(centerX(liveBox), centerY(liveBox), 600);
  await sleep(550);
  recordEvent("click_find_live", { box: liveBox });
  await clickAtCurrentPosition();

  /* --- Stage 3 · Test: real discovery, real wait -------------------- */
  await waitForSelector(page, ".ad-test", { timeout: 20_000, label: "Test stage" });
  recordEvent("test_visible");

  const outcome = await waitForAny(page, [".ad-match", ".ad-stream-failure", ".ad-empty-result"], 240_000);
  if (outcome === ".ad-stream-failure" || outcome === ".ad-empty-result") {
    const message = await page.textContent(`${outcome} h2`).catch(() => null);
    recordEvent("flow_failed", { selector: outcome, message: message?.trim() ?? null });
    log("Live discovery failed — recording the honest failure state.");
    await sleep(5200);
    const done = await stopRecording();
    await writeEvents({ flowFailed: true, done });
    log("events.json written. Exiting (failure preserved, not faked).");
    chrome.kill();
    return;
  }
  if (!outcome) throw new Error("Discovery never produced a result or failure state (240s)");

  /* --- Stage 4 · Best match ----------------------------------------- */
  await settlePage(page);
  const answerBox = (await getBox(page, ".ad-agent-answer")) || (await getBox(page, ".ad-match-layout"));
  recordEvent("match_visible", { box: answerBox });
  await sleep(5200); // deliberate pause on the agent's result

  const primaryLabel = ((await page.textContent(".ad-screen-actions .ad-primary")) || "").trim();
  const primaryBox = await getBox(page, ".ad-screen-actions .ad-primary");
  await smoothMoveTo(centerX(primaryBox), centerY(primaryBox), 700);
  await sleep(550);
  recordEvent("click_primary_stage4", { label: primaryLabel, box: primaryBox });
  await clickAtCurrentPosition();

  /* --- Stage 5 · Check (verification evidence) ----------------------- */
  if (/check/i.test(primaryLabel)) {
    await waitForSelector(page, ".ad-check", { timeout: 20_000, label: "Check stage" });
    await settlePage(page);
    recordEvent("check_visible", { box: await getBox(page, ".ad-verification") });
    await sleep(4600); // let the verification evidence read

    const hireBox = await getBox(page, ".ad-screen-actions .ad-primary");
    await smoothMoveTo(centerX(hireBox), centerY(hireBox), 650);
    await sleep(500);
    recordEvent("click_continue_hire", { box: hireBox });
    await clickAtCurrentPosition();
  }

  /* --- Stage 6 · Hire ------------------------------------------------ */
  await waitForSelector(page, ".ad-hire", { timeout: 20_000, label: "Hire stage" });
  await settlePage(page);
  recordEvent("hire_visible", { box: await getBox(page, ".ad-hire-layout") });
  await sleep(4200);

  /* --- Return to the brand ------------------------------------------- */
  const brandBox = await getBox(page, ".ad-brand");
  await smoothMoveTo(centerX(brandBox), centerY(brandBox), 900);
  await sleep(650);
  recordEvent("click_brand", { box: brandBox });
  await clickAtCurrentPosition();

  await page.waitForSelector("#agent-task", { timeout: 30_000 });
  await settlePage(page);
  recordEvent("home_final_visible", { box: await getBox(page, ".ad-hero-copy") });
  await sleep(3300); // final beat on "Don't trust the listing. Test the agent."

  const done = await stopRecording();
  await writeEvents({ flowFailed: false, done });
  log("Recording complete. durationMs =", done?.durationMs ?? "unknown");
  chrome.kill();
}

run().catch(async (error) => {
  console.error("[record-demo] FATAL:", error);
  await writeEvents({ fatal: String(error?.message || error) }).catch(() => {});
  try { await stopRecording(); } catch { /* best effort */ }
  process.exit(1);
});
