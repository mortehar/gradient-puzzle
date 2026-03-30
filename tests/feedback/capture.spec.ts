import { expect, test, type Page } from "@playwright/test";
import { buildQaPath, getFeedbackScreenshotPath, trackPageErrors, waitForPuzzleStatus } from "./helpers";

const captureStates = [
  {
    name: "home",
    path: buildQaPath({
      qaScreen: "home",
      qaMotion: "static"
    }),
    ready: async (page: Page) => {
      await expect(page.getByTestId("home-screen")).toBeVisible();
    }
  },
  {
    name: "home-settings",
    path: buildQaPath({
      qaScreen: "home",
      qaSettings: "open",
      qaLockStyle: "icon",
      qaMotion: "static"
    }),
    ready: async (page: Page) => {
      await expect(page.getByTestId("home-screen")).toBeVisible();
      await expect(page.getByTestId("browser-settings-menu")).toBeVisible();
    }
  },
  {
    name: "tier",
    path: buildQaPath({
      qaScreen: "tier",
      qaTier: "expert",
      qaPuzzle: "4",
      qaLockStyle: "mounted",
      qaMotion: "static"
    }),
    ready: async (page: Page) => {
      await expect(page.getByTestId("tier-screen")).toBeVisible();
      await expect(page.getByTestId("tier-number-label-4")).toHaveClass(/tier-number-label-active/);
    }
  },
  {
    name: "puzzle-playing",
    path: buildQaPath({
      qaScreen: "puzzle",
      qaTier: "hard",
      qaPuzzle: "2",
      qaPhase: "playing",
      qaLockStyle: "frosted",
      qaMotion: "static"
    }),
    ready: async (page: Page) => {
      await expect(page.getByTestId("puzzle-screen")).toBeVisible();
      await waitForPuzzleStatus(page, "playing");
    }
  },
  {
    name: "puzzle-solved",
    path: buildQaPath({
      qaScreen: "puzzle",
      qaTier: "master",
      qaPuzzle: "5",
      qaPhase: "solved",
      qaLockStyle: "icon",
      qaMotion: "static"
    }),
    ready: async (page: Page) => {
      await expect(page.getByTestId("puzzle-screen")).toBeVisible();
      await waitForPuzzleStatus(page, "solved");
      await expect(page.getByTestId("completion-checkmark")).toBeVisible();
    }
  }
] as const;

for (const state of captureStates) {
  test(`captures ${state.name}`, async ({ page }, testInfo) => {
    const pageErrors = trackPageErrors(page);

    await page.goto(state.path);
    await state.ready(page);
    await page.screenshot({
      path: getFeedbackScreenshotPath(state.name, testInfo.project.name),
      fullPage: true,
      animations: "disabled"
    });

    pageErrors.assertClean();
  });
}
