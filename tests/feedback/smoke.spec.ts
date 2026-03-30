import { expect, test } from "@playwright/test";
import { buildQaPath, dragBetweenCenters, holdPointer, trackPageErrors, waitForPuzzleStatus } from "./helpers";

test("journey smoke covers browser settings, drag play, puzzle help, and abort flow", async ({ page }) => {
  const pageErrors = trackPageErrors(page);

  await page.goto("/");
  await expect(page.getByTestId("home-screen")).toBeVisible();

  await page.getByTestId("browser-settings-button").click();
  await expect(page.getByTestId("browser-settings-menu")).toBeVisible();

  await page.getByTestId("lock-style-option-icon").click();
  await expect(page.getByTestId("lock-style-option-icon")).toHaveAttribute("aria-checked", "true");
  await page.getByTestId("browser-settings-button").click();
  await expect(page.getByTestId("browser-settings-menu")).toBeHidden();

  await page.getByTestId("home-tier-card-easy").click();
  await expect(page.getByTestId("tier-screen")).toBeVisible();
  await expect(page.getByTestId("tier-active-preview")).toHaveAttribute("data-locked-tile-style", "icon");

  await page.goto(
    buildQaPath({
      qaScreen: "puzzle",
      qaTier: "easy",
      qaPuzzle: "1",
      qaPhase: "playing",
      qaLockStyle: "icon"
    })
  );
  await expect(page.getByTestId("puzzle-screen")).toBeVisible();
  await waitForPuzzleStatus(page, "playing");

  const movableTiles = page.locator('[role="gridcell"]:not([aria-label*="locked tile"])');

  await dragBetweenCenters(page, movableTiles.nth(0), movableTiles.nth(1));
  await expect(page.getByTestId("completion-summary")).toContainText("Moves: 1");

  await holdPointer(page, page.getByTestId("aid-hold-hitbox"));
  await expect(page.getByTestId("completion-summary")).toContainText("Moves: 2");

  await holdPointer(page, page.getByTestId("abort-hold-hitbox"));
  await expect(page.getByTestId("tier-screen")).toBeVisible();
  await expect(page.getByTestId("tier-number-label-1")).toHaveClass(/tier-number-label-active/);

  pageErrors.assertClean();
});
