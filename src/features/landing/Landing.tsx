import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/app/AppLayout";
import { IS_DEMO } from "@/lib/backend";
import { ScanLine, Database, ChartLine, ShieldCheck } from "lucide-react";

export function Landing() {
  const [portion, setPortion] = useState(100);
  const fraction = portion / 100;
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-5">
          <Logo />
          <nav className="flex items-center gap-1">
            <Button variant="ghost" asChild>
              <Link to="/privacy">Privacy</Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link to="/login">Sign in</Link>
            </Button>
            <Button asChild>
              <Link to="/register">Start free</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto max-w-5xl px-5 pb-16 pt-20">
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-primary">
            Precision nutrition tracking
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
            Know exactly what you ate, without guessing.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
            Macromint pairs a photograph with a verified food database. Scan a meal, confirm the
            items, and every calorie and micronutrient is recorded against your daily targets in
            seconds.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" asChild>
              <Link to={IS_DEMO ? "/login" : "/register"}>
                {IS_DEMO ? "Open the demo" : "Start your free trial"}
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/login">Sign in</Link>
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            14 days free. No payment details required.
          </p>
        </section>

        <section aria-labelledby="portion-heading" className="border-y bg-card">
          <div className="mx-auto max-w-5xl px-5 py-12">
            <h2 id="portion-heading" className="text-3xl font-semibold tracking-tight">
              How much of your lunch did you eat?
            </h2>
            <p className="mt-3 text-muted-foreground">
              Try a sample rice bowl. Change the portion to see what goes into your diary.
            </p>
            <label htmlFor="portion" className="mt-8 block font-medium">
              Portion eaten: {portion}%
            </label>
            <input
              id="portion"
              type="range"
              min="5"
              max="100"
              step="5"
              value={portion}
              onChange={(e) => setPortion(Number(e.target.value))}
              className="my-4 w-full max-w-lg accent-primary"
            />
            <p aria-live="polite" className="text-lg tabular-nums">
              <strong>{Math.round(536 * fraction)} kcal</strong> · Protein{" "}
              {Math.round(32 * fraction)} g · Carbs {Math.round(66 * fraction)} g · Fat{" "}
              {Math.round(16 * fraction)} g
            </p>
          </div>
        </section>

        {/* What it does — editorial sections, no card grid */}
        <section className="mx-auto max-w-5xl px-5">
          <div className="grid gap-10 py-14 md:grid-cols-3">
            <article>
              <ScanLine className="h-5 w-5 text-primary" />
              <h2 className="mt-4 text-lg font-semibold tracking-tight">Scan, confirm, done</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                One photo identifies each item on the plate. Portions are estimated from visual
                scale, matched against the food database, checked for consistency, and shown to you
                for a quick review before anything is logged.
              </p>
            </article>
            <article>
              <Database className="h-5 w-5 text-primary" />
              <h2 className="mt-4 text-lg font-semibold tracking-tight">Grounded in real data</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Wherever a verified match exists, database values replace model estimates. Whole
                foods carry micronutrients; where a value is genuinely unknown, Macromint says so
                instead of inventing a number.
              </p>
            </article>
            <article>
              <ChartLine className="h-5 w-5 text-primary" />
              <h2 className="mt-4 text-lg font-semibold tracking-tight">
                Trends that mean something
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Daily calories against your target, weight trajectory, macro distribution and weekly
                adherence, computed only from what you actually logged.
              </p>
            </article>
          </div>
        </section>

        {/* Accuracy */}
        <section className="border-y bg-card/40">
          <div className="mx-auto max-w-5xl px-5 py-14">
            <h2 className="max-w-2xl text-2xl font-semibold tracking-tight">
              Accuracy is the product
            </h2>
            <ol className="mt-8 grid gap-6 md:grid-cols-4">
              {[
                {
                  step: "1",
                  title: "Identify",
                  body: "Each visible food and drink is separated and named, with cooking method and visible scale cues.",
                },
                {
                  step: "2",
                  title: "Ground",
                  body: "Items are matched to the verified database; Open Food Facts covers branded products.",
                },
                {
                  step: "3",
                  title: "Validate",
                  body: "Energy is checked against macronutrients; implausible portions are flagged, not silently accepted.",
                },
                {
                  step: "4",
                  title: "Confirm",
                  body: "You review editable portions before logging. Scans are never saved automatically.",
                },
              ].map((s) => (
                <li key={s.step}>
                  <span className="text-xs font-semibold tabular-nums text-primary">{s.step}</span>
                  <h3 className="mt-2 text-sm font-semibold">{s.title}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Pricing */}
        <section className="mx-auto max-w-5xl px-5 py-14" id="pricing">
          <h2 className="text-2xl font-semibold tracking-tight">Straight pricing</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border bg-card p-6">
              <h3 className="text-sm font-semibold">Free trial</h3>
              <p className="mt-2 text-3xl font-semibold tabular-nums">14 days</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Everything included. No card required. The trial length is set by the platform, not
                a sales page.
              </p>
            </div>
            <div className="rounded-xl border border-primary/40 bg-card p-6">
              <h3 className="text-sm font-semibold text-primary">Monthly</h3>
              <p className="mt-2 text-3xl font-semibold tabular-nums">
                $6<span className="text-sm font-normal text-muted-foreground"> / month</span>
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Unlimited logging, scanning, recipes and trends. Cancel any time.
              </p>
            </div>
            <div className="rounded-xl border bg-card p-6">
              <h3 className="text-sm font-semibold">Annual</h3>
              <p className="mt-2 text-3xl font-semibold tabular-nums">
                $54<span className="text-sm font-normal text-muted-foreground"> / year</span>
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Save $18 compared with monthly billing. Payment verified by the server before access
                opens.
              </p>
            </div>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Rewarded ads are available only where supported.
          </p>
        </section>

        {/* FAQ */}
        <section className="border-t">
          <div className="mx-auto max-w-3xl px-5 py-14">
            <h2 className="text-2xl font-semibold tracking-tight">Questions</h2>
            <div className="mt-8 flex flex-col divide-y">
              {[
                {
                  q: "How accurate is AI scanning?",
                  a: "Every scan is grounded against verified food data where a match exists, validated for internal consistency, and reviewed by you before logging. Items with no reliable match are clearly marked as estimates.",
                },
                {
                  q: "What if a micronutrient is unknown?",
                  a: "It is shown as unavailable rather than zero. Macromint never fabricates nutritional values.",
                },
                {
                  q: "Can I log part of a portion?",
                  a: "Yes. Choose the percentage you actually ate — 70% of a 500 kcal dish records 350 kcal, with every other nutrient scaled the same way. You can edit it later.",
                },
                {
                  q: "Who can see my data?",
                  a: "Only you. Row level security enforces ownership at the database level, and you can export or delete everything from Settings.",
                },
                {
                  q: "Do you give medical advice?",
                  a: "No. Calorie and nutrient targets are estimates derived from standard equations and are not a medical prescription.",
                },
              ].map((item) => (
                <details key={item.q} className="group py-4">
                  <summary className="cursor-pointer list-none text-sm font-medium marker:hidden group-open:text-primary">
                    {item.q}
                  </summary>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-5 py-8">
          <Logo />
          <nav className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <Link to="/privacy" className="hover:text-foreground">
              Privacy policy
            </Link>
            <Link to="/terms" className="hover:text-foreground">
              Terms of service
            </Link>
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5" /> Private diary
            </span>
          </nav>
        </div>
      </footer>
    </div>
  );
}
