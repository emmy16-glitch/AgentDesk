#!/usr/bin/env node
/**
 * Post-process the OpenScreen project recorded by record-demo.mjs:
 *   - clean dark/neutral wallpaper, soft shadow, gentle motion blur
 *   - 16:9 export, no webcam, no annotations
 *   - subtle manual zooms derived from the REAL recorded event log
 *     (depth 1 = 1.25x, depth 2 = 1.5x — deliberately restrained)
 *
 * Usage: node scripts/product-demo/finalize-project.mjs [demo/agentdesk.openscreen]
 */

import fs from "node:fs";
import path from "node:path";

const DEMO_DIR = path.resolve(process.env.DEMO_DIR || "demo");
const projectPath = process.argv[2] || path.join(DEMO_DIR, "agentdesk.openscreen");
const eventsPath = path.join(DEMO_DIR, "events.json");

const SCREEN_W = 1920;
const SCREEN_H = 1080;

const project = JSON.parse(fs.readFileSync(projectPath, "utf8"));
const eventsDoc = JSON.parse(fs.readFileSync(eventsPath, "utf8"));
const events = eventsDoc.events || [];
const durationMs = eventsDoc.done?.durationMs ?? null;

const find = (name) => events.find((event) => event.name === name && event.tMs !== null) ?? null;
const clamp01 = (value) => Math.min(1, Math.max(0, value));
const focusOf = (box) => ({
  cx: clamp01((box.x + box.width / 2) / SCREEN_W),
  cy: clamp01((box.y + box.height / 2) / SCREEN_H),
});

function zoomRegion(id, startEvent, { lead = 900, hold = 2200, depth = 1, focusBox = null, endOverride = null } = {}) {
  if (!startEvent || !startEvent.box) return null;
  const startMs = Math.max(0, Math.round(startEvent.tMs - lead));
  const endMs = endOverride ?? Math.round(startEvent.tMs + hold);
  return {
    id,
    startMs,
    endMs: Math.max(startMs + 500, endMs),
    depth,
    focus: focusBox ? focusOf(focusBox) : focusOf(startEvent.box),
    focusMode: "manual",
    source: "manual",
  };
}

const matchVisible = find("match_visible");
const checkVisible = find("check_visible");
const finalVisible = find("home_final_visible");

const regions = [
  // Gentle emphasis on the two decisive clicks…
  zoomRegion("zoom-ask", find("click_find_test"), { lead: 850, hold: 1500, depth: 1 }),
  zoomRegion("zoom-live", find("click_find_live"), { lead: 850, hold: 1500, depth: 1 }),
  // …then pause with real focus on the best-match result.
  matchVisible
    ? zoomRegion("zoom-best-match", matchVisible, {
        lead: -1100, // start slightly after the stage settles
        hold: 4900,
        depth: 2,
        focusBox: matchVisible.box,
      })
    : null,
  // Verification evidence.
  checkVisible
    ? zoomRegion("zoom-check", checkVisible, { lead: -900, hold: 4300, depth: 2, focusBox: checkVisible.box })
    : null,
  // Final beat back on the brand message.
  finalVisible && durationMs
    ? zoomRegion("zoom-brand", finalVisible, {
        lead: -500,
        hold: Math.max(2000, durationMs - finalVisible.tMs),
        depth: 1,
        focusBox: finalVisible.box,
      })
    : null,
].filter(Boolean);

// Never let regions overlap (keeps motion calm and predictable).
regions.sort((a, b) => a.startMs - b.startMs);
for (let i = 1; i < regions.length; i += 1) {
  if (regions[i].startMs < regions[i - 1].endMs + 250) {
    regions[i - 1].endMs = regions[i].startMs - 250;
  }
}

const editor = project.editor ?? {};
Object.assign(editor, {
  // Clean dark, neutral backdrop — no busy wallpaper.
  wallpaper: "linear-gradient(150deg, #0a0d13 0%, #131722 52%, #0a0e15 100%)",
  padding: 64,
  shadowIntensity: 0.38, // soft browser shadow
  motionBlurAmount: 0.2, // gentle motion blur
  aspectRatio: "16:9",
  webcamLayoutPreset: "no-webcam",
  autoZoomEnabled: false, // manual regions above; nothing excessive
  zoomRegions: regions,
  annotationRegions: [],
  exportFormat: "mp4",
  exportQuality: "good",
});
project.editor = editor;

fs.writeFileSync(projectPath, JSON.stringify(project, null, 2));

console.log(JSON.stringify({
  project: projectPath,
  durationMs,
  flowFailed: Boolean(eventsDoc.flowFailed),
  eventCount: events.length,
  zoomRegions: regions.map((region) => ({
    id: region.id,
    startMs: region.startMs,
    endMs: region.endMs,
    depth: region.depth,
    focus: region.focus,
  })),
}, null, 2));

if (durationMs && durationMs > 98_000) {
  console.warn(`[finalize] WARNING: recording is ${(durationMs / 1000).toFixed(1)}s — above the 60–90s target.`);
}
