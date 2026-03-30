import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { generateFeedbackManifest } from "./generateFeedbackManifest.mjs";

const [, , suite = "ci", serverMode = "dev"] = process.argv;
const rootDir = process.cwd();
const latestDir = path.join(rootDir, "artifacts", "feedback", "latest");
const screenshotDir = path.join(latestDir, "screenshots");
const npxCommand = process.platform === "win32" ? "npx.cmd" : "npx";
const feedbackEnv = {
  ...process.env,
  FEEDBACK_SERVER_MODE: serverMode,
  TMPDIR: "/tmp",
  TMP: "/tmp",
  TEMP: "/tmp"
};

function runCommand(command, args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: rootDir,
      env: feedbackEnv,
      stdio: "inherit",
      ...options
    });

    child.on("close", (code) => {
      resolve(code ?? 1);
    });
  });
}

function resolveTestArgs() {
  if (suite === "capture") {
    return ["playwright", "test", "tests/feedback/capture.spec.ts", "--config=playwright.config.ts"];
  }

  return [
    "playwright",
    "test",
    "tests/feedback/smoke.spec.ts",
    "tests/feedback/capture.spec.ts",
    "--config=playwright.config.ts"
  ];
}

await fs.rm(latestDir, { recursive: true, force: true });
await fs.mkdir(screenshotDir, { recursive: true });

const exitCode = await runCommand(npxCommand, resolveTestArgs(), {
  env: feedbackEnv
});

await generateFeedbackManifest();
process.exit(exitCode);
