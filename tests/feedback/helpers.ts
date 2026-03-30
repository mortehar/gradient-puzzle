import path from "node:path";
import { expect, type Locator, type Page } from "@playwright/test";

const IGNORED_CONSOLE_ERROR_PATTERNS = [/favicon\.ico/i];

export function buildQaPath(params: Record<string, string>) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      searchParams.set(key, value);
    }
  });

  const query = searchParams.toString();
  return query ? `/?${query}` : "/";
}

export function trackPageErrors(page: Page) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];

  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      !IGNORED_CONSOLE_ERROR_PATTERNS.some((pattern) => pattern.test(message.text()))
    ) {
      consoleErrors.push(message.text());
    }
  });

  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });

  return {
    assertClean() {
      expect(pageErrors, "Unexpected uncaught page errors").toEqual([]);
      expect(consoleErrors, "Unexpected console errors").toEqual([]);
    }
  };
}

function getCenterPoint(box: { x: number; y: number; width: number; height: number }) {
  return {
    x: box.x + box.width / 2,
    y: box.y + box.height / 2
  };
}

export async function holdPointer(page: Page, target: Locator, durationMs = 1600) {
  const box = await target.boundingBox();

  if (!box) {
    throw new Error("Expected target to have a visible bounding box.");
  }

  const center = getCenterPoint(box);

  await page.mouse.move(center.x, center.y);
  await page.mouse.down();
  await page.waitForTimeout(durationMs);
  await page.mouse.up();
}

export async function dragBetweenCenters(page: Page, from: Locator, to: Locator) {
  const fromBox = await from.boundingBox();
  const toBox = await to.boundingBox();

  if (!fromBox || !toBox) {
    throw new Error("Expected both drag endpoints to have visible bounding boxes.");
  }

  const fromCenter = getCenterPoint(fromBox);
  const toCenter = getCenterPoint(toBox);

  await page.mouse.move(fromCenter.x, fromCenter.y);
  await page.mouse.down();
  await page.mouse.move(toCenter.x, toCenter.y, { steps: 8 });
  await page.mouse.up();
}

export async function waitForPuzzleStatus(page: Page, status: "playing" | "solved") {
  await expect(page.getByTestId("puzzle-screen")).toHaveAttribute("data-game-status", status, {
    timeout: 8_000
  });
}

export function getFeedbackScreenshotPath(testName: string, viewportName: string) {
  return path.join(process.cwd(), "artifacts", "feedback", "latest", "screenshots", `${testName}.${viewportName}.png`);
}
