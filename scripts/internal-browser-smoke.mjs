import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

// This preview is built with intentionally empty Supabase environment variables.
// Never execute this test against the public production API.
const url = process.env.MACROMINT_DEMO_PREVIEW_URL || "http://127.0.0.1:4174";
await mkdir("mobile-audit/screens", { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();
const errors = [];
const visualMetrics = [];
page.on("pageerror", error => errors.push(error.message));

async function screenshotEverySize(name) {
  // Full-page captures should start at the page origin, even after opening
  // and closing an offscreen disclosure that scrolled the browser.
  await page.evaluate(() => window.scrollTo(0, 0));
  for (const [width, height] of [[390, 844], [768, 1024], [1440, 900]]) {
    await page.setViewportSize({ width, height });
    if (name === "today") {
      const selector = width >= 768 ? ".mm-app-shell aside .mm-logo-leaves" : ".mm-app-shell header .mm-logo-leaves";
      const logoVisible = await page.locator(selector).first().evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return getComputedStyle(element).display !== "none" && rect.width >= 15 && rect.height >= 15;
      });
      assert.ok(logoVisible, `Brand mark missing from app navigation at ${width}px`);
    }
    await page.screenshot({
      path: `mobile-audit/screens/${name}-${width}.png`,
      fullPage: true, animations: "disabled",
    });
    const metrics = await page.evaluate(() => {
      const resources = performance.getEntriesByType("resource");
      return {
        pathname: location.pathname,
        title: document.title,
        domNodes: document.querySelectorAll("*").length,
        jsResources: resources.filter((resource) => /\\.m?js(?:\\?|$)/.test(resource.name)).length,
        transferredKb: Math.round(resources.reduce((sum, resource) => sum + (resource.transferSize || 0), 0) / 1024),
        heading: document.querySelector("h1")?.textContent?.trim() || null,
      };
    });
    visualMetrics.push({ name, width, ...metrics });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    if (overflow > 2) {
      const offenders = await page.evaluate(() => [...document.querySelectorAll("body *")]
        .map((element) => ({ tag: element.tagName, className: String(element.getAttribute("class") || "").slice(0,120),
          text: element.textContent?.trim().slice(0,55),
          left: Math.round(element.getBoundingClientRect().left),
          right: Math.round(element.getBoundingClientRect().right),
          width: Math.round(element.getBoundingClientRect().width) }))
        .filter((element) => element.right > innerWidth + 2 || element.left < -2)
        .sort((a,b) => b.right - a.right).slice(0,12));
      console.error("LAYOUT OFFENDERS", name, width, JSON.stringify(offenders));
    }
    assert.ok(overflow <= 2, `Horizontal overflow on ${name} at ${width}px: ${overflow}`);
  }
  await page.setViewportSize({ width: 390, height: 844 });
}

async function screenshotCompact(name) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.setViewportSize({ width: 320, height: 740 });
  await page.screenshot({
    path: `mobile-audit/screens/${name}-320.png`,
    fullPage: true,
    animations: "disabled",
  });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  assert.ok(overflow <= 2, `320px layout overflow in ${name}: ${overflow}`);
  await page.setViewportSize({ width: 390, height: 844 });
}

try {
  // Hard stop before ANY registration if the preview is accidentally connected
  // to production. The footer marker only renders when IS_DEMO=true.
  await page.goto(url + "/login", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.getByText(/Demo mode: any email signs in to a local sample account/).waitFor({ timeout: 15000 });
  await screenshotEverySize("login");
  await page.goto(url + "/register", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.getByRole("heading", { name: "Create your account" }).waitFor({ timeout: 20000 });
  await screenshotEverySize("signup");
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
  await screenshotEverySize("onboarding-basics");
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.getByRole("heading", { name: "What are you working towards?" }).waitFor();
  await page.getByText("Target weight (kg, optional)").waitFor();
  await page.getByRole("radio", { name: /Gain weight/i }).click();
  await page.locator("#ob-target-weight").fill("77");
  await screenshotEverySize("onboarding-goal");
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.getByRole("heading", { name: "How active are you?" }).waitFor();
  assert.equal((await page.locator("body").innerText()).includes("× "), false,
    "Activity choices should not show numeric multipliers");
  await page.getByRole("radio").first().click();
  await screenshotEverySize("onboarding-activity");
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.getByRole("heading", { name: "Your starting targets" }).waitFor();
  await screenshotEverySize("onboarding-targets");
  await page.getByRole("button", { name: /Start tracking/ }).click();
  await page.getByRole("heading", { name: "Today", exact: true }).waitFor({ timeout: 20000 });
  await screenshotEverySize("today");
  const onboardingActivation = await page.locator(".ref-live-today").evaluate((element) => {
    const action = element.querySelector(".mm-home-action-primary")?.getBoundingClientRect();
    const ledger = element.querySelector(".mm-home-overview")?.getBoundingClientRect();
    const macroGrid = element.querySelector(".mm-home-macro-grid");
    return { actionTop: action?.top, ledgerTop: ledger?.top, hasMacroGrid: Boolean(macroGrid) };
  });
  assert.ok(onboardingActivation.actionTop < onboardingActivation.ledgerTop && !onboardingActivation.hasMacroGrid,
    "First-run Today should show a logging action before dense nutrition data");
  // A compact phone is narrower than our usual 390px screen audit.
  await page.setViewportSize({ width: 320, height: 740 });
  await page.screenshot({ path: "mobile-audit/screens/today-320.png", fullPage: true });
  const smallPhoneOverflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  assert.ok(smallPhoneOverflow <= 2, "Today must not horizontally overflow a 320px phone");
  const primaryAction = await page.getByRole("button", { name: "Add food", exact: true }).boundingBox();
  const bottomNav = await page.locator(".ref-mobile-tabs").boundingBox();
  assert.ok(primaryAction && bottomNav && primaryAction.y + primaryAction.height <= bottomNav.y,
    "Add food must remain visible above the fixed navigation on a compact 320px phone");
  await page.setViewportSize({ width: 390, height: 844 });

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
  // Measure navigation as an interaction, not just page startup.
  // Cold pass includes any remaining route chunk fetch; warm pass checks
  // repeat tab switching after all routes have been visited once.
  const tabTimings = [];
  const destinations = [
    ["Diary", "Diary"],
    ["Foods", "Foods"],
    ["Progress", "Progress"],
    ["Today", "Today"],
  ];
  for (const pass of ["first", "warm"]) {
    for (const [tab, heading] of destinations) {
      const started = performance.now();
      await nav.getByRole("link", { name: tab, exact: true }).click();
      await page.getByRole("heading", { name: heading, exact: true }).waitFor();
      if (tab === "Today") {
        // Benchmark meaningful content, not merely the route heading. In the
        // previous build the heading appeared quickly but calories and sections
        // continued animating for 550–720 ms on every return.
        await page.waitForFunction(() => {
          const today = document.querySelector(".ref-live-today");
          const calories = today?.querySelector(".mm-home-calories");
          const summary = today?.querySelector(".mm-home-overview");
          return Boolean(today && summary && calories &&
            calories.textContent?.trim() !== "—");
        }, null, { timeout: 5000 });
        const animations = await page.locator(".ref-live-today").evaluate((el) =>
          el.getAnimations({ subtree: true })
            .filter((animation) => animation.playState === "running")
            .map((animation) => animation.id || "unnamed"));
        assert.deepEqual(animations, [],
          "Today should not replay entrance or number animations after a tab switch");
      }
      const elapsedMs = Math.round(performance.now() - started);
      tabTimings.push({ pass, tab, elapsedMs });
    }
  }
  const warmTimes = tabTimings.filter((timing) => timing.pass === "warm").map((timing) => timing.elapsedMs);
  const warmMedian = [...warmTimes].sort((a, b) => a - b)[Math.floor(warmTimes.length / 2)];
  console.log("TAB NAV BENCH", JSON.stringify({ warmMedianMs: warmMedian, timings: tabTimings }));
  const todayTimes = tabTimings.filter((timing) => timing.tab === "Today");
  console.log("TODAY CONTENT BENCH", JSON.stringify(todayTimes));
  await writeFile("mobile-audit/screens/tab-timing.json", JSON.stringify(tabTimings, null, 2));
  assert.ok(warmTimes.every((time) => time < 2200),
    "Repeated tab navigation must not stall for more than 2.2 seconds in the isolated demo");
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
  await screenshotEverySize("photo-choices");
  // A photo user must be able to switch to text without closing everything
  // and losing the selected meal/date.
  await page.getByRole("button", { name: "Search or enter a meal instead" }).click();
  await page.getByPlaceholder(/Search foods, brands/i).waitFor();
  assert.notEqual(await page.evaluate(() => document.activeElement?.tagName), "INPUT",
    "Switching from photo to search must not pop the keyboard without a tap");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Add food", exact: true }).click();
  // The first logging action leads straight to recent foods and search; the
  // redundant chooser was slowing first activation and repeat logging.
  assert.equal(await page.getByRole("heading", { name: "Add food", exact: true }).count(), 0,
    "First food action should skip the extra chooser");
  await screenshotEverySize("food-search-entry");
  await page.getByPlaceholder(/Search foods, brands/i).waitFor();
  assert.notEqual(await page.evaluate(() => document.activeElement?.tagName), "INPUT",
    "The search sheet must never autofocus on open");
  await page.setViewportSize({ width: 390, height: 390 });
  await page.waitForTimeout(350);
  const clippedSheet = await page.getByRole("dialog").evaluate((dialog) => {
    const box = dialog.getBoundingClientRect();
    const style = getComputedStyle(dialog);
    return { top: box.top, bottom: box.bottom, height: window.innerHeight,
      style: dialog.getAttribute("style"), computed: {
        top: style.top, height: style.height, minHeight: style.minHeight, maxHeight: style.maxHeight,
        translate: style.translate, transform: style.transform, position: style.position },
      visual: { height: window.visualViewport?.height, top: window.visualViewport?.offsetTop } };
  });
  assert.ok(clippedSheet.top >= -2 && clippedSheet.bottom <= clippedSheet.height + 2,
    "Keyboard-sized screen must keep the full search sheet visible: " + JSON.stringify(clippedSheet));
  await page.setViewportSize({ width: 390, height: 844 });
  // Close explicitly. Escape can be consumed by the focused command input
  // while a modal is transitioning, leaving nav inaccessible behind it.
  const searchDialog = page.getByRole("dialog");
  await searchDialog.getByRole("button", { name: "Close" }).click();
  await searchDialog.waitFor({ state: "hidden" });
  await screenshotEverySize("food-search");
  assert.equal(await page.getByRole("dialog").count(), 0,
    "Food search must release modal focus before switching tabs");

  await nav.getByRole("link", { name: "Diary" }).click();
  await page.getByRole("heading", { name: "Diary", exact: true }).waitFor();
  assert.equal(await nav.getByRole("link", { name: "Diary" }).getAttribute("aria-current"), "page",
    "Selected tab indicator should follow navigation");
  await page.getByRole("button", { name: "Add food", exact: true }).waitFor();
  await page.getByRole("button", { name: "Scan photo", exact: true }).waitFor();
  await page.getByText("No food recorded yet").waitFor();
  assert.equal(await page.locator(".mm-journey-ledger").count(), 0,
    "An empty diary should not show a second empty calorie dashboard");
  await screenshotEverySize("diary");
  await screenshotCompact("diary");

  await nav.getByRole("link", { name: "Foods" }).click();
  await page.getByRole("heading", { name: "Foods", exact: true }).waitFor();
  await page.getByRole("tab", { name: "Favorites" }).waitFor();
  await page.getByRole("tab", { name: "Saved meals" }).click();
  await page.getByText("Nothing saved yet").waitFor();
  await page.getByRole("tab", { name: "Search", exact: true }).click();
  await page.getByText("Scan a photo", { exact: true }).waitFor();
  await page.locator(".mm-journey-food-options").waitFor();
  await screenshotEverySize("foods");
  await screenshotCompact("foods");

  await nav.getByRole("link", { name: "Progress" }).click();
  await page.getByRole("heading", { name: "Progress", exact: true }).waitFor();
  await page.locator(".mm-journey-intro").waitFor();
  await screenshotEverySize("progress");
  await screenshotCompact("progress");

  await page.goto(url + "/settings", { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Settings", exact: true }).waitFor();
  assert.equal(await page.getByText("Measurement system").count(), 0);
  await page.locator("#s-height-feet").waitFor();
  assert.equal(await page.locator("#s-height-feet").inputValue(), "5");
  assert.equal(await page.locator("#s-height-inches").inputValue(), "11");
  assert.equal(await page.locator("#s-weight").inputValue(), "73.5");
  await page.locator(".mm-journey-settings-links").waitFor();
  await screenshotEverySize("settings");
  await screenshotCompact("settings");
  await page.goto(url + "/goals", { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Goals", exact: true }).waitFor();
  const recalcToggle = page.getByText("Choose a goal to recalculate");
  await recalcToggle.waitFor();
  await recalcToggle.click();
  await page.getByText("How these estimates are calculated").waitFor();
  await page.getByRole("button", { name: /Maintain/ }).waitFor();
  await recalcToggle.click();
  await screenshotEverySize("goals");
  await screenshotCompact("goals");
  await page.goto(url + "/weight", { waitUntil: "domcontentloaded" });
  await page.locator(".mm-journey-weight-current").waitFor();
  await screenshotEverySize("weight");
  await screenshotCompact("weight");

  // Keep all captures on the disposable localStorage demo fixture. Switch to
  // the seeded owner only after the explicit demo-mode safety check above.
  await page.evaluate(() => {
    const key = "macromint.demo.v2";
    const store = JSON.parse(localStorage.getItem(key) || "null");
    const owner = store?.users.find((user) => user.email === "demo@macromint.app");
    if (!owner || !store.adminUserIds.includes(owner.id))
      throw new Error("Disposable demo owner fixture missing");
    store.sessionUserId = owner.id;
    localStorage.setItem(key, JSON.stringify(store));
  });
  await page.goto(url + "/admin", { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Users", exact: true }).waitFor();
  await screenshotEverySize("admin-users");
  await screenshotCompact("admin-users");
  await page.goto(url + "/admin/audit", { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Audit log", exact: true }).waitFor();
  await screenshotEverySize("admin-audit");
  await screenshotCompact("admin-audit");
  await page.goto(url + "/admin/settings", { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Platform settings", exact: true }).waitFor();
  await screenshotEverySize("admin-settings");
  await screenshotCompact("admin-settings");

  // Restricted account view is part of the product, not a broken dashboard.
  await page.evaluate(() => {
    const key = "macromint.demo.v2";
    const store = JSON.parse(localStorage.getItem(key) || "null");
    const expired = store?.users.find((user) => user.email === "expired.user@example.com");
    if (!expired) throw new Error("Disposable expired fixture missing");
    store.sessionUserId = expired.id;
    localStorage.setItem(key, JSON.stringify(store));
  });
  await page.goto(url + "/upgrade", { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: /free trial has ended|Account access is paused/ }).waitFor();
  await screenshotEverySize("restricted-account");

  for (const path of ["/terms", "/privacy"]) {
    await page.goto(url + path, { waitUntil: "domcontentloaded" });
    await screenshotEverySize(path.slice(1));
  }
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(overflow <= 1, "Horizontal overflow at " + width + "px: " + overflow);
    console.log("PASS internal pages width", width);
  }
  assert.deepEqual(errors, [], "Browser runtime errors");
  await writeFile("mobile-audit/screens/metrics.json", JSON.stringify(visualMetrics, null, 2));
  console.log("CAPTURED", visualMetrics.length, "responsive app screenshots with DOM and transfer metrics");
  console.log("PASS isolated onboarding, daily logging, photo gallery, navigation, diary, foods, progress, settings");
} finally {
  await context.close();
  await browser.close();
}
