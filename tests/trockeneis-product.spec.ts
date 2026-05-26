import { test, expect, Locator } from "@playwright/test";
import { QA, withTheme } from "./fixtures";

const SHOT_DIR = "qa-screenshots";

test.describe("trockeneis-product", () => {
  let section: Locator;

  test.beforeEach(async ({ page }) => {
    await page.goto(withTheme(QA.paths.product), { waitUntil: "domcontentloaded" });
    section = page.locator("[data-trockeneis-section]").first();
    await expect(section).toBeVisible();
    await section.scrollIntoViewIfNeeded();
  });

  test("core layout renders", async ({ page }, testInfo) => {
    await expect(section.locator(".te-product__title")).toBeVisible();
    await expect(section.locator("[data-te-price]")).toBeVisible();
    // Editable description under the price (schema default)
    await expect(section.locator(".te-price-description")).toBeVisible();
    // At least one option group + shipping methods
    await expect(section.locator('[data-te-option="size"]')).toBeVisible();
    await expect(section.locator('[data-ship-method="pickup"]')).toBeVisible();
    await expect(section.locator('[data-ship-method="express"]')).toBeVisible();
    await expect(section.locator("[data-te-add-btn]")).toBeVisible();

    await section.screenshot({ path: `${SHOT_DIR}/${testInfo.project.name}-section.png` });
  });

  test("express method opens carriers and a carrier expands", async () => {
    const carriersWrap = section.locator("[data-te-carriers]");
    const expressHeader = section.locator('[data-ship-method="express"] .te-ship-method__header');
    await expressHeader.click();
    await expect(carriersWrap).toHaveClass(/is-open/);

    // GO! must be first (per requirement "GO-Express ganz vorne")
    await expect(section.locator(".te-carrier__name").first()).toContainText("GO");

    const firstCarrier = section.locator(".te-carrier").first();
    await expect(firstCarrier).toBeVisible();
    await firstCarrier.locator(".te-carrier__header").click();
    await expect(firstCarrier).toHaveClass(/is-expanded/);
    // Full conditions text must be visible AND non-empty (no clipping, content present)
    const inner = firstCarrier.locator(".te-carrier__details-inner");
    await expect(inner).toBeVisible();
    expect((await inner.innerText()).trim().length).toBeGreaterThan(10);
  });

  test("selecting an option resolves a real variant and shows a price", async () => {
    const price = section.locator("[data-te-price]");
    // QA fixture variants: S/Black, M/Black, L/Black, M/White.
    // Pick the real combo M (size) + White (2nd option) -> 32.00.
    await section.locator('[data-te-option="size"] .te-option-label', { hasText: /^M$/ }).first().click();
    await section.locator('[data-te-option="qty"] .te-option-label', { hasText: /White/i }).first().click();
    await expect(price).not.toHaveText("–");
    expect((await price.textContent())?.trim()).toBeTruthy();
  });

  test("date picker rejects excluded weekday (Sunday) and accepts a valid day", async () => {
    const picker = section.locator(".te-datepicker__input");
    if ((await picker.count()) === 0) test.skip(true, "date picker disabled");
    const err = section.locator("[data-te-date-error]");

    // 2026-05-31 is a Sunday (excluded by default). fill() fires the change event.
    await picker.fill("2026-05-31");
    await expect(err).toBeVisible();
    await expect(picker).toHaveValue("");

    // 2026-05-29 is a Friday (allowed)
    await picker.fill("2026-05-29");
    await expect(err).toBeHidden();
    await expect(picker).toHaveValue("2026-05-29");
  });
});
