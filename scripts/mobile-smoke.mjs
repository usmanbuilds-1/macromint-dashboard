import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const url = process.env.MACROMINT_PREVIEW_URL ?? "http://127.0.0.1:4173";
await mkdir("mobile-audit", { recursive: true });
const browser = await chromium.launch({ headless: true });
let failed = false;
const sizes = [
  [375, 812],
  [390, 844],
  [430, 932],
  [768, 1024],
  [1440, 900],
];

for (const [width, height] of sizes) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  const problems = [];
  page.on("pageerror", (err) => problems.push(err.message));
  try {
    const response = await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    if (!response || response.status() >= 400) throw new Error("Landing HTTP status " + response?.status());
    await page.getByRole("heading", { level: 1 }).waitFor({ timeout: 20000 });
    const overlay = await page.locator("vite-error-overlay").count();
    if (overlay > 0) throw new Error("Vite error overlay is present");
    const stylesheetLoaded = await page.evaluate(() =>
      getComputedStyle(document.body).fontFamily.includes("Instrument Sans")
    );
    if (!stylesheetLoaded) throw new Error("Design system stylesheet failed to load");
    const dims = await page.evaluate(() => ({
      viewport: window.innerWidth,
      document: document.documentElement.scrollWidth,
      heading: document.querySelector("h1")?.textContent?.trim() ?? "",
    }));
    if (dims.document > dims.viewport + 1) throw new Error("Horizontal overflow: " + JSON.stringify(dims));
    if (!dims.heading) throw new Error("Missing h1");
    // Catch low-resolution or broken imagery before a public release.
    const heroImage = page.locator(".mint6-photo-frame img");
    await heroImage.waitFor();
    await heroImage.evaluate((img) => img.decode());
    const renderedImageWidth = await heroImage.evaluate((img) => img.naturalWidth);
    if (renderedImageWidth < 600) throw new Error("Hero photo is broken or too small: " + renderedImageWidth + "px");
    const breakfastImage = page.locator(".mint6-process-photo img");
    await breakfastImage.scrollIntoViewIfNeeded();
    await breakfastImage.evaluate((img) => img.decode());
    const breakfastImageWidth = await breakfastImage.evaluate((img) => img.naturalWidth);
    if (breakfastImageWidth < 600) throw new Error("Breakfast photo is broken or too small: " + breakfastImageWidth + "px");
    await page.locator("#mint6-hero-title").scrollIntoViewIfNeeded();
    await page.screenshot({ path: `mobile-audit/landing-${width}.png`, fullPage: true });
    if (width === 390) {
      await page.emulateMedia({ reducedMotion: "reduce" });
      const reducedOpacity = await page.locator(".mint6-process-food").first().evaluate((node) => getComputedStyle(node).opacity);
      if (Number(reducedOpacity) !== 1) throw new Error("Reduced motion makes content invisible");
      await page.emulateMedia({ reducedMotion: "no-preference" });
    }
    // Public interactive demo is DEFERRED by owner (2026-11-04).
    // The example day preview is intentionally read-only until reactivation is requested.
    const sample = page.locator(".mint6-product");
    if (await sample.count() < 2) throw new Error("Editable, honestly labelled sample diary is missing");
    if (!await page.getByText(/Illustrative values, not a real person/i).count()) throw new Error("Example values are not disclosed");
    if (width >= 1001) {
      const heroLayout = await page.locator(".mint6-hero").evaluate((node) => getComputedStyle(node).display);
      if (heroLayout !== "grid") throw new Error("Editorial desktop layout is missing");
    }
    if (await page.getByRole("button", { name: /Add 250 ml to example|Remove 250 ml from example/i }).count()) {
      throw new Error("Interactive dashboard controls should remain deferred");
    }
    if (await page.locator("#portion-control, .mint2-walkthrough").count()) {
      throw new Error("Deferred interactive walkthrough is still rendered");
    }
    if (await page.locator("#inside, #approach, #questions").count() !== 3) throw new Error("One or more editorial sections are missing");
    if (await page.getByRole("link", { name: /Try the interactive demo/i }).count()) {
      throw new Error("Deferred walkthrough still has an active public link");
    }
    const forbiddenText = await page.locator("body").innerText();
    for (const claim of ["Trust Score", "80+ nutrients", "Speak to a dietician", "verified grade", "Free forever", "No ads"]) {
      if (forbiddenText.toLowerCase().includes(claim.toLowerCase())) throw new Error("Unsupported GLM claim on landing: " + claim);
    }
    console.log("PASS landing", width, dims.heading);
    if (width === 390) {
      await page.getByRole("link", { name: /See what.s inside/i }).click();
      await page.waitForURL((u) => u.hash === "#inside", { timeout: 10000 });
      await page.getByRole("heading", { name: /A good day starts/i }).waitFor();
      console.log("PASS product section CTA; deferred demo remains hidden", width);
    }
    const reg = await page.goto(url + "/register", { waitUntil: "networkidle", timeout: 30000 });
    if (!reg || reg.status() >= 400) throw new Error("Registration HTTP status " + reg?.status());
    if (process.env.VITE_BETA_INVITES_ENABLED === "true") {
      await page.locator("#invite").waitFor({ timeout: 15000 });
      await page.locator("#name").waitFor({ timeout: 15000 });
    } else {
      await page.getByRole("heading", { name: /Invitation access/i }).waitFor({ timeout: 15000 });
      if (await page.locator("#password").count()) {
        throw new Error("Registration must be disabled until Cloud Auth and invite backend are activated");
      }
    }
    const registerSize = await page.evaluate(() => ({ viewport: window.innerWidth, doc: document.documentElement.scrollWidth }));
    if (registerSize.doc > registerSize.viewport + 1) throw new Error("Signup horizontally overflows " + JSON.stringify(registerSize));
    await page.screenshot({ path: `mobile-audit/signup-${width}.png`, fullPage: true });
    if (width === 390 && process.env.MACROMINT_TEST_DEMO_LOGIN === "true") {
      // The checked-in .env already configures Lovable Cloud Supabase. Never
      // try to sign into that live backend from public browser smoke tests.
      // Enable this block only with a purpose-built local demo environment.
      // The smoke environment is the isolated demo adapter, never a live account.
      await page.goto(url + "/login", { waitUntil: "networkidle" });
      await page.locator("#identifier").fill("demo@macromint.app");
      await page.locator("#password").fill("demo-password-only");
      await page.getByRole("button", { name: /^Sign in$/ }).click();
      await page.waitForTimeout(300);
      console.log("Demo login route", page.url());
      console.log("Demo login state", (await page.locator("body").innerText()).slice(0, 500));
      await page.waitForURL((u) => u.pathname === "/today" || u.pathname === "/onboarding", { timeout: 15000 });
      if (page.url().includes("/onboarding")) {
        await page.getByRole("button", { name: /Skip for now/ }).click();
        await page.waitForURL((u) => u.pathname === "/today", { timeout: 15000 });
      }
      await page.getByRole("heading", { name: "Your day.", exact: true }).waitFor({ timeout: 15000 });
      await page.locator(".mm-today-arc").waitFor({ timeout: 10000 });
      const todayOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (todayOverflow > 1) throw new Error("Today screen horizontal overflow: " + todayOverflow);
      await page.screenshot({ path: "mobile-audit/today-390.png", fullPage: true });
      console.log("PASS actual mobile Today", width);
    }
    if (problems.length) throw new Error("Runtime errors: " + problems.join("; "));
    console.log("PASS registration release state", width);
  } catch (error) {
    failed = true;
    console.error("FAIL width", width, String(error));
    await page.screenshot({ path: `mobile-audit/failure-${width}.png`, fullPage: true }).catch(() => undefined);
  } finally {
    await page.close();
  }
}
await browser.close();
if (failed) process.exitCode = 1;
