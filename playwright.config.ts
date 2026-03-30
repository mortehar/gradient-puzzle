import { defineConfig, devices } from "@playwright/test";

const baseURL = "http://127.0.0.1:4173";
const serverCommand = process.env.FEEDBACK_SERVER_MODE === "preview" ? "npm run feedback:serve:preview" : "npm run feedback:serve:dev";

export default defineConfig({
  testDir: "./tests/feedback",
  fullyParallel: true,
  timeout: 30_000,
  expect: {
    timeout: 10_000
  },
  outputDir: "artifacts/feedback/latest/test-results",
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "artifacts/feedback/latest/playwright-report" }]
  ],
  use: {
    baseURL,
    trace: "retain-on-failure",
    video: "retain-on-failure",
    screenshot: "only-on-failure"
  },
  projects: [
    {
      name: "desktop",
      use: {
        viewport: { width: 1440, height: 1100 }
      }
    },
    {
      name: "mobile",
      use: {
        ...devices["Pixel 7"]
      }
    }
  ],
  webServer: {
    command: serverCommand,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe"
  }
});
