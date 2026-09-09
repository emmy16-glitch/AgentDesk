# Product demo pipeline

Records a real, un-faked product demo of the deployed AgentDesk app and
polishes it with [OpenScreen](https://github.com/getopenscreen/openscreen)
(dark wallpaper, soft shadow, gentle motion blur, subtle zooms, 16:9 MP4).

- `record-demo.mjs` — drives the live app on a virtual display with real
  OS-level pointer/keyboard events (xdotool) while OpenScreen records
  headlessly. Live discovery and auditions run at their real pace; failures
  are recorded as-is and flagged in `demo/events.json` (`flowFailed`).
- `finalize-project.mjs` — applies the visual treatment to the recorded
  `.openscreen` project using the real event timestamps/focus rectangles.
- `.github/workflows/product-demo.yml` — runs the whole pipeline on a
  GitHub runner (which has internet access to the deployment and the live
  agents) and commits `demo/AgentDesk-demo.mp4` back to the branch.

Trigger: `gh workflow run product-demo.yml --ref <branch>`
