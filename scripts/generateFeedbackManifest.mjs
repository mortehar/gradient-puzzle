import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = process.cwd();
const latestDir = path.join(rootDir, "artifacts", "feedback", "latest");
const screenshotDir = path.join(latestDir, "screenshots");
const reportDir = path.join(latestDir, "playwright-report");
const resultsDir = path.join(latestDir, "test-results");
const baselinesDir = path.join(rootDir, "artifacts", "feedback", "baselines");

function toRelativePath(targetPath) {
  return path.relative(rootDir, targetPath).split(path.sep).join("/");
}

async function readScreenshotEntries() {
  try {
    const files = await fs.readdir(screenshotDir);

    return files
      .filter((file) => file.endsWith(".png"))
      .sort()
      .map((file) => {
        const stem = file.slice(0, -4);
        const separatorIndex = stem.lastIndexOf(".");
        const shot = separatorIndex === -1 ? stem : stem.slice(0, separatorIndex);
        const viewport = separatorIndex === -1 ? "unknown" : stem.slice(separatorIndex + 1);

        return {
          shot,
          viewport,
          path: toRelativePath(path.join(screenshotDir, file))
        };
      });
  } catch {
    return [];
  }
}

async function directoryExists(targetPath) {
  try {
    const stats = await fs.stat(targetPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

export async function generateFeedbackManifest() {
  await fs.mkdir(latestDir, { recursive: true });

  const screenshots = await readScreenshotEntries();
  const manifest = {
    generatedAt: new Date().toISOString(),
    screenshots,
    reportDir: (await directoryExists(reportDir)) ? toRelativePath(reportDir) : null,
    resultsDir: (await directoryExists(resultsDir)) ? toRelativePath(resultsDir) : null,
    baselinesDir: (await directoryExists(baselinesDir)) ? toRelativePath(baselinesDir) : null
  };

  await fs.writeFile(path.join(latestDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await generateFeedbackManifest();
}
