import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { readFileSync } from "node:fs";

// The Node test process does not automatically load Vite's .env variables.
// Read the same release flags the production Vite build consumes.
const buildEnv = readFileSync(new URL("../.env", import.meta.url), "utf8");
const expectSignup = /^VITE_USERNAME_AUTH_ENABLED=true$/m.test(buildEnv)
  && /^VITE_PUBLIC_REGISTRATION_ENABLED=true$/m.test(buildEnv);
const expectTesterInvites = /^VITE_BETA_INVITES_ENABLED=true$/m.test(buildEnv);

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
    // The user-approved composition must be present and fully visible.
    await page.locator("#ref-hero-title").waitFor();
    const hero = page.locator(".ref-hero");
    const phone = page.locator(".ref-device");
    const photo = page.locator(".ref-hero-img");
    if (!await hero.count() || !await phone.count() || !await photo.count()) {
      throw new Error("Reference hero, food photo or phone preview is missing");
    }
    const title = await page.locator("#ref-hero-title").innerText();
    if (!title.includes("A calmer way to")) throw new Error("Reference hero copy was changed");
    const geometry = await page.evaluate(() => {
      const phone = document.querySelector(".ref-device").getBoundingClientRect();
      const media = document.querySelector(".ref-hero-media").getBoundingClientRect();
      const title = document.querySelector("#ref-hero-title").getBoundingClientRect();
      const lead = document.querySelector(".ref-hero-copy>p").getBoundingClientRect();
      return { inside: phone.left >= media.left - 2 && phone.right <= media.right + 2,
        gap: lead.top - title.bottom };
    });
    if (!geometry.inside || geometry.gap < 12) throw new Error("Reference hero has clipping or text overlap: " + JSON.stringify(geometry));
    await photo.scrollIntoViewIfNeeded();
    await photo.evaluate((img) => img.decode());
    if (await photo.evaluate((img) => img.naturalWidth) < 600) throw new Error("Hero photography too small");
    const stepImage = page.locator(".ref-how-photo img");
    await stepImage.scrollIntoViewIfNeeded();
    await stepImage.evaluate((img) => img.decode());
    await page.locator("#ref-hero-title").scrollIntoViewIfNeeded();
    await page.screenshot({ path: `mobile-audit/landing-${width}.png`, fullPage: true });
    if (await page.locator(".ref-example").count() < 2) throw new Error("Real HTML example screens missing");
    if (await page.locator(".mint6-site,.mint6-hero,.mint6-product-stage").count()) throw new Error("Previous unrelated design still rendered");
    if (!await page.getByText(/Illustrative example/i).count()) throw new Error("Example values must be disclosed");
    for (const sel of ["#features","#how-it-works",".ref-manifesto",".ref-bottom-cta"]) {
      if (!await page.locator(sel).count()) throw new Error("Required reference section missing: " + sel);
    }
    const bodyText = await page.locator("body").innerText();
    if (/[✳↗↓✨🎉🍃🚀]/u.test(bodyText)) throw new Error("Cheap decorative symbols visible");
    for (const claim of ["Trust Score","80+ nutrients","Free forever","No ads"]) {
      if (bodyText.toLowerCase().includes(claim.toLowerCase())) throw new Error("Unsupported claim: " + claim);
    }
    if (width === 390) {
      await page.getByRole("link", { name: "See how it works" }).click();
      await page.waitForURL((u) => u.hash === "#how-it-works", { timeout: 10000 });
      await page.getByRole("heading", { name: /The daily loop/i }).waitFor();
    }
    if (problems.length) throw new Error("Runtime errors: " + problems.join("; "));
    console.log("PASS reference visual & navigation", width, dims.heading);
    const reg = await page.goto(url + "/register", { waitUntil: "networkidle", timeout: 30000 });
    if (!reg || reg.status() >= 400) throw new Error("Registration HTTP status " + reg?.status());
    if (expectSignup) {
      if (expectTesterInvites) {
        // First visit: the beta code is the only field. No account is created
        // when Continue is clicked; the actual server validates at signup.
        await page.getByRole("heading", { name: "Enter your beta invitation" }).waitFor({ timeout: 15000 });
        await page.locator("#invite").waitFor({ timeout: 15000 });
        if (await page.locator("#name").count() || await page.locator("#password").count()) {
          throw new Error("Beta invitation must come before account setup");
        }
        if (width === 390) {
          await page.locator("#invite").fill("NOT-A-VALID-CODE");
          await page.getByRole("button", { name: "Continue", exact: true }).click();
          await page.getByRole("heading", { name: "Enter your beta invitation" }).waitFor();
          if (await page.locator("#name").count()) {
            throw new Error("Invalid beta code format advanced to account setup");
          }
        }
        await page.screenshot({ path: `mobile-audit/signup-code-${width}.png`, fullPage: true });
        await page.locator("#invite").fill("MM-" + "A".repeat(40));
        await page.getByRole("button", { name: "Continue", exact: true }).click();
        await page.getByRole("heading", { name: "Set up your beta account" }).waitFor({ timeout: 15000 });
        await page.getByText("Beta tester invitation selected").waitFor();
        if (await page.locator("#name").count()) {
          throw new Error("Signup must not duplicate the name question from onboarding");
        }
        await page.locator("#username").waitFor();
        await page.locator("#password").waitFor();
        if (await page.locator("#invite").count()) throw new Error("Invitation field incorrectly repeated in account setup");
        if (width === 390) {
          // Moving back must not lose the code or accidentally create a user.
          await page.getByRole("button", { name: "Change invitation code" }).click();
          await page.getByRole("heading", { name: "Enter your beta invitation" }).waitFor();
          if (await page.locator("#invite").inputValue() !== "MM-" + "A".repeat(40)) {
            throw new Error("Invitation lost when navigating back");
          }
          await page.getByRole("button", { name: /Don't have a code\? Create a regular account/ }).click();
          await page.getByRole("heading", { name: "Create your account", exact: true }).waitFor();
          await page.getByText("Regular account · No invitation needed").waitFor();
          if (await page.locator("#invite").count()) throw new Error("Regular account wrongly requires an invite");
          if (await page.locator("#name").count()) {
            throw new Error("Regular signup must ask for name only in onboarding");
          }
          await page.locator("#username").waitFor();
          await page.locator("#password").waitFor();
          await page.screenshot({ path: "mobile-audit/signup-regular-390.png", fullPage: true });
          await page.getByRole("button", { name: "Use a beta invitation instead" }).click();
          await page.getByRole("heading", { name: "Enter your beta invitation" }).waitFor();
          await page.locator("#invite").fill("MM-" + "B".repeat(40));
          await page.getByRole("button", { name: "Continue", exact: true }).click();
          await page.getByRole("heading", { name: "Set up your beta account" }).waitFor();
        }
      } else {
        await page.getByRole("heading", { name: "Create your account" }).waitFor({ timeout: 15000 });
        if (await page.locator("#name").count()) {
          throw new Error("Signup must not duplicate the onboarding name");
        }
        await page.locator("#username").waitFor();
        await page.locator("#password").waitFor();
      }
      if (await page.locator("#username").getAttribute("type") !== "text") {
        throw new Error("Unified signup must use username, not email");
      }
      if (width === 390) {
        const login = await page.goto(url + "/login", { waitUntil: "networkidle" });
        if (!login || login.status() >= 400) throw new Error("Unified login page unavailable");
        await page.locator("#identifier").waitFor();
        if (await page.locator("#identifier").getAttribute("type") !== "text") {
          throw new Error("Login must support usernames");
        }
        await page.locator("#password").waitFor();
        await page.goto(url + "/register", { waitUntil: "networkidle" });
      }
    } else {
      await page.getByRole("heading", { name: /Registration unavailable/i }).waitFor({ timeout: 15000 });
      if (await page.locator("#password").count()) {
        throw new Error("Registration must be disabled until Cloud Auth is activated");
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
      await page.getByRole("heading", { name: "Today", exact: true }).waitFor({ timeout: 15000 });
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
