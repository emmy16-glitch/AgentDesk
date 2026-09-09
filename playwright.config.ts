import { defineConfig, devices } from "@playwright/test";

const executablePath = process.env.CHROMIUM_PATH?.trim();

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
      ...(executablePath ? { executablePath } : {}),
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--font-render-hinting=none",
      ],
    },
  },
  projects: [
    { name: "desktop-1920", use: { ...devices["Desktop Chrome"], viewport: { width: 1920, height: 1080 } } },
    { name: "desktop-1440", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 1000 } } },
    { name: "desktop-1280", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } } },
    { name: "tablet-1024", use: { ...devices["Desktop Chrome"], viewport: { width: 1024, height: 768 } } },
    { name: "tablet-768", use: { ...devices["Desktop Chrome"], viewport: { width: 768, height: 1024 } } },
    { name: "mobile-430", use: { ...devices["Desktop Chrome"], viewport: { width: 430, height: 932 } } },
    { name: "mobile-390", use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 } } },
  ],
});
