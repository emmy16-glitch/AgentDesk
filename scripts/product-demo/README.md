# Product demo pipeline

Records a real, un-faked product demo of the deployed AgentDesk app and
polishes it with [OpenScreen](https://github.com/getopenscreen/openscreen)
(dark wallpaper, soft shadow, gentle motion blur, subtle zooms, 16:9 MP4).

- `record-demo.mjs` — drives the live app in headless Chromium (Playwright
  viewport recording = app area only) with calm, eased pointer movement.
  Live discovery and auditions run at their real pace; failures are recorded
  as-is and flagged in `demo/events.json` (`flowFailed`). The raw capture is
  trimmed to start on the settled homepage and wrapped into an
  `.openscreen` project.
- `finalize-project.mjs` — applies the visual treatment to the recorded
  `.openscreen` project using the real event timestamps/focus rectangles.
- `.github/workflows/record-demo.yml` — runs the whole pipeline on a
  GitHub runner (which has internet access to the deployment and the live
  agents) and commits `demo/AgentDesk-demo.mp4` back to the branch.

Trigger: `gh workflow run record-demo.yml --ref <branch>`
