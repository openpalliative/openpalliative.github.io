import { defineConfig } from "@playwright/test";

const port = Number(process.env.OP_ALL_PORT || 8080);
const browserName = process.env.OP_BROWSER || "chromium";
const mobile = { viewport: { width: 390, height: 844 }, hasTouch: true, deviceScaleFactor: 2, isMobile: browserName !== "firefox" };

export default defineConfig({
  testDir: "tests/all",
  outputDir: `_reports/pw-all-${browserName}`,
  fullyParallel: true,
  timeout: 60000,
  reporter: [["list"], ["json", { outputFile: `_reports/e2e-all-${browserName}.json` }]],
  use: { baseURL: `http://127.0.0.1:${port}/`, headless: true, locale: "ru-RU", timezoneId: "Europe/Moscow" },
  webServer: {
    command: `sh scripts/serve-all --no-build --port ${port}`,
    url: `http://127.0.0.1:${port}/`,
    reuseExistingServer: true,
    timeout: 120000,
  },
  projects: [
    { name: "desktop", use: { browserName, viewport: { width: 1280, height: 800 } } },
    { name: "mobile", use: { browserName, ...mobile } },
  ],
});
