import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { generateFeedbackManifest } from "./generateFeedbackManifest.mjs";

const rootDir = process.cwd();
const latestScreenshotsDir = path.join(rootDir, "artifacts", "feedback", "latest", "screenshots");
const baselinesDir = path.join(rootDir, "artifacts", "feedback", "baselines");
const nodeCommand = process.platform === "win32" ? "node.exe" : "node";

function runCommand(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: rootDir,
      env: process.env,
      stdio: "inherit"
    });

    child.on("close", (code) => {
      resolve(code ?? 1);
    });
  });
}

async function copyDirectory(sourceDir, targetDir) {
  await fs.mkdir(targetDir, { recursive: true });
  const entries = await fs.readdir(sourceDir, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);

    if (entry.isDirectory()) {
      await copyDirectory(sourcePath, targetPath);
      continue;
    }

    await fs.copyFile(sourcePath, targetPath);
  }
}

const captureExitCode = await runCommand(nodeCommand, ["scripts/runFeedback.mjs", "capture", "dev"]);

if (captureExitCode !== 0) {
  process.exit(captureExitCode);
}

await fs.rm(baselinesDir, { recursive: true, force: true });
await copyDirectory(latestScreenshotsDir, baselinesDir);
await generateFeedbackManifest();
