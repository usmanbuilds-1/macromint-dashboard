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
    await page.screenshot({ path: `mobile-audit/landing-${width}.png`, fullPage: true });
    console.log("PASS landing", width, dims.heading);
    if (width === 390) {
      const slider = page.locator("#portion-control");
      if (!(await slider.count())) throw new Error("Interactive meal portion control missing");
      await slider.evaluate((input) => {
        input.value = "400";
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      });
      await page.screenshot({ path: "mobile-audit/portion-390.png", fullPage: true });
    }
    const reg = await page.goto(url + "/register", { waitUntil: "networkidle", timeout: 30000 });
    if (!reg || reg.status() >= 400) throw new Error("Registration HTTP status " + reg?.status());
    if (process.env.VITE_BETA_INVITES_ENABLED === "true") {
      await page.locator("#invite").waitFor({ timeout: 15000 });
      await page.locator("#name").waitFor({ timeout: 15000 });
    } else {
      await page.getByRole("heading", { name: /Beta registration is coming soon/i }).waitFor({ timeout: 15000 });
      if (await page.locator("#password").count()) {
        throw new Error("Registration must be disabled until Cloud Auth and invite backend are activated");
      }
    }
    const registerSize = await page.evaluate(() => ({ viewport: window.innerWidth, doc: document.documentElement.scrollWidth }));
    if (registerSize.doc > registerSize.viewport + 1) throw new Error("Signup horizontally overflows " + JSON.stringify(registerSize));
    await page.screenshot({ path: `mobile-audit/signup-${width}.png`, fullPage: true });
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
