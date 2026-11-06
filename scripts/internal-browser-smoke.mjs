import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

// This preview is built with intentionally empty Supabase environment variables.
// Never execute this test against the public production API.
const url = process.env.MACROMINT_DEMO_PREVIEW_URL || "http://127.0.0.1:4174";
await mkdir("mobile-audit", { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();
const errors = [];
page.on("pageerror", error => errors.push(error.message));

try {
  // Hard stop before ANY registration if the preview is accidentally connected
  // to production. The footer marker only renders when IS_DEMO=true.
  await page.goto(url + "/login", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.getByText(/Demo mode: any email signs in to a local sample account/).waitFor({ timeout: 15000 });
  await page.goto(url + "/register", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.getByRole("heading", { name: "Create your account" }).waitFor({ timeout: 20000 });
  assert.equal(await page.locator("#name").count(), 0, "Registration shouldn't ask for a name");
  await page.locator("#username").fill("internal_qa");
  await page.locator("#password").fill("internal-preview-only-not-a-secret");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByRole("heading", { name: "A few basics" }).waitFor({ timeout: 20000 });

  // Feet/inches + kg are deliberate Pakistan-localized UX.
  await page.getByText("Height (ft and in)").waitFor();
  await page.getByText("Weight (kg)").waitFor();
  assert.equal(await page.getByText("Measurement system").count(), 0);
  await page.locator("#ob-name").fill("QA Tester");
  await page.getByRole("radio", { name: /^male$/i }).click();
  await page.locator("#ob-age").fill("26");
  await page.locator("#ob-height-feet").fill("5");
  await page.locator("#ob-height-inches").fill("11");
  await page.locator("#ob-weight").fill("73.5");
  assert.equal(await page.getByRole("button", { name: /Continue/ }).isDisabled(), false);
  await page.screenshot({ path: "mobile-audit/internal-onboarding-390.png", fullPage: true });
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.getByRole("heading", { name: "What are you working towards?" }).waitFor();
  await page.getByText("Target weight (kg, optional)").waitFor();
  await page.getByRole("radio", { name: /Gain weight/i }).click();
  await page.locator("#ob-target-weight").fill("77");
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.getByRole("heading", { name: "How active are you?" }).waitFor();
  assert.equal((await page.locator("body").innerText()).includes("× "), false,
    "Activity choices should not show numeric multipliers");
  await page.getByRole("radio").first().click();
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.getByRole("heading", { name: "Your starting targets" }).waitFor();
  await page.getByRole("button", { name: /Start tracking/ }).click();
  await page.getByRole("heading", { name: "Today", exact: true }).waitFor({ timeout: 20000 });

  // Daily navigation never buries diary, the task users perform most often.
  const nav = page.locator(".ref-mobile-tabs");
  for (const name of ["Today", "Diary", "Foods", "Progress"]) {
    const tab = nav.getByRole("link", { name, exact: true });
    assert.equal(await tab.count(), 1, "Missing mobile destination: " + name);
    assert.equal(await tab.locator("svg.ref-mobile-tab-icon").count(), 1,
      "Mobile tab must have exactly one visible icon: " + name);
    assert.equal(await tab.locator("svg").getAttribute("aria-hidden"), "true",
      "Decorative tab icons must not duplicate the accessible tab name");
    const hitArea = await tab.boundingBox();
    assert.ok(hitArea && hitArea.height >= 44,
      "Mobile tab must meet minimum tap area: " + name);
  }
  assert.equal(await nav.getByRole("link", { name: "Today" }).getAttribute("aria-current"), "page",
    "Selected tab should be indicated accessibly");
  await page.getByRole("button", { name: "More and settings" }).waitFor();
  await page.getByRole("button", { name: "Add food", exact: true }).waitFor();
  await page.getByRole("button", { name: "Scan photo", exact: true }).click();
  await page.getByRole("heading", { name: "Add food from a photo" }).waitFor();
  await page.getByRole("button", { name: "Take photo" }).waitFor();
  await page.getByRole("button", { name: "Choose from gallery" }).waitFor();
  await page.getByRole("button", { name: "Search or enter a meal instead" }).waitFor();
  assert.equal(await page.locator("#scan-hints").count(), 0,
    "Notes should remain collapsed until the user asks to type");
  assert.equal(await page.evaluate(() => document.activeElement?.tagName), "BUTTON",
    "Photo dialog must not auto-focus a text field and summon the mobile keyboard");
  const images = page.getByRole("dialog").locator('input[type="file"]');
  assert.equal(await images.count(), 2);
  assert.equal(await images.nth(0).getAttribute("capture"), "environment");
  assert.equal(await images.nth(1).getAttribute("capture"), null,
    "Existing-image input must not force camera capture");
  await page.screenshot({ path: "mobile-audit/internal-gallery-390.png", fullPage: true });
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Add food", exact: true }).click();
  await page.getByRole("heading", { name: "Add food", exact: true }).waitFor();
  await page.getByRole("button", { name: /Search or type a food/ }).waitFor();
  await page.getByRole("button", { name: /Use a meal photo/ }).waitFor();
  assert.notEqual(await page.evaluate(() => document.activeElement?.tagName), "INPUT",
    "The Add food chooser must not open the keyboard");
  await page.screenshot({ path: "mobile-audit/internal-add-food-choice-390.png", fullPage: true });
  await page.getByRole("button", { name: /Search or type a food/ }).click();
  await page.getByPlaceholder(/Search foods, brands/i).waitFor();
  await page.keyboard.press("Escape");
  await page.screenshot({ path: "mobile-audit/internal-today-390.png", fullPage: true });

  await nav.getByRole("link", { name: "Diary" }).click();
  await page.getByRole("heading", { name: "Diary", exact: true }).waitFor();
  assert.equal(await nav.getByRole("link", { name: "Diary" }).getAttribute("aria-current"), "page",
    "Selected tab indicator should follow navigation");
  await page.getByRole("button", { name: "Add food", exact: true }).waitFor();
  await page.getByRole("button", { name: "Scan photo", exact: true }).waitFor();
  await page.screenshot({ path: "mobile-audit/internal-diary-390.png", fullPage: true });

  await nav.getByRole("link", { name: "Foods" }).click();
  await page.getByRole("heading", { name: "Foods", exact: true }).waitFor();
  await page.getByRole("tab", { name: "Favorites" }).waitFor();
  await page.getByText("Scan a photo", { exact: true }).waitFor();
  await page.screenshot({ path: "mobile-audit/internal-foods-390.png", fullPage: true });

  await nav.getByRole("link", { name: "Progress" }).click();
  await page.getByRole("heading", { name: "Progress", exact: true }).waitFor();
  await page.screenshot({ path: "mobile-audit/internal-progress-390.png", fullPage: true });

  await page.goto(url + "/settings", { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Settings", exact: true }).waitFor();
  assert.equal(await page.getByText("Measurement system").count(), 0);
  await page.locator("#s-height-feet").waitFor();
  assert.equal(await page.locator("#s-height-feet").inputValue(), "5");
  assert.equal(await page.locator("#s-height-inches").inputValue(), "11");
  assert.equal(await page.locator("#s-weight").inputValue(), "73.5");
  await page.screenshot({ path: "mobile-audit/internal-settings-390.png", fullPage: true });
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(overflow <= 1, "Horizontal overflow at " + width + "px: " + overflow);
    console.log("PASS internal pages width", width);
  }
  assert.deepEqual(errors, [], "Browser runtime errors");
  console.log("PASS isolated onboarding, daily logging, photo gallery, navigation, diary, foods, progress, settings");
} finally {
  await context.close();
  await browser.close();
}
