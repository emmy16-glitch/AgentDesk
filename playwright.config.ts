import { defineConfig, devices } from "@playwright/test";

const CHROMIUM = process.env.CHROMIUM_PATH ?? "/tmp/chromium-bin/chromium";

export default defineConfig({
  testDir: "./tests",
  outputDir: "./tests/.output",
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  timeout: 90_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: process.env.BASE_URL ?? "http://127.0.0.1:3000",
    launchOptions: {
      executablePath: CHROMIUM,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--in-process-gpu",
        "--use-gl=swiftshader",
        "--font-render-hinting=none",
      ],
    },
  },
  projects: [
    { name: "desktop-1440", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 1000 } } },
    { name: "desktop-1280", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } } },
    { name: "tablet-768", use: { ...devices["Desktop Chrome"], viewport: { width: 768, height: 1024 } } },
    { name: "mobile-390", use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 } } },
  ],
});
