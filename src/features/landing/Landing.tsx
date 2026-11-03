import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/app/AppLayout";
import { IS_DEMO } from "@/lib/backend";
import { formatNumber } from "@/lib/utils";

const SAMPLE = {
  name: "Chicken and rice bowl",
  grams: 300,
  kcal: 480,
  protein: 42,
  carbs: 48,
  fat: 12,
};

/** All figures in the demonstration derive from the same example portion. */
function sampleAt(grams: number) {
  const factor = grams / SAMPLE.grams;
  return {
    grams,
    kcal: Math.round(SAMPLE.kcal * factor),
    protein: Math.round(SAMPLE.protein * factor * 10) / 10,
    carbs: Math.round(SAMPLE.carbs * factor * 10) / 10,
    fat: Math.round(SAMPLE.fat * factor * 10) / 10,
  };
}

export function Landing() {
  const [grams, setGrams] = useState(300);
  const example = sampleAt(grams);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-7">
          <Logo />
          <nav className="flex items-center gap-2" aria-label="Public site">
            <Link className="inline-flex min-h-11 items-center px-2 text-sm font-medium text-muted-foreground hover:text-foreground" to="/login">Sign in</Link>
            <Button className="h-11" asChild><Link to="/register">Join beta</Link></Button>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl gap-12 px-4 pb-16 pt-14 sm:px-7 sm:pt-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-16">
          <div>
            <p className="text-xs font-semibold tracking-wide text-primary">MACROMINT / PRIVATE BETA</p>
            <h1 className="mt-5 max-w-[14ch] text-[clamp(2.6rem,7vw,5rem)] font-semibold leading-[1.04] tracking-[-0.055em]">
              Food tracking, without the guesswork.
            </h1>
            <p className="mt-7 max-w-lg text-base leading-7 text-muted-foreground sm:text-lg">
              Log meals with a quick search or a photo. Correct the portion yourself, see your progress,
              and understand which nutrition values come from a food database or an AI estimate.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button size="lg" className="min-h-12 px-6" asChild>
                <Link to={IS_DEMO ? "/login" : "/register"}>
                  {IS_DEMO ? "Open the demo" : "Enter your invitation"}
                </Link>
              </Button>
              <a href="#try-it" className="inline-flex min-h-12 items-center px-3 text-sm font-medium underline underline-offset-4">
                Try the portion editor
              </a>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              Private beta requires a code. Create a secure account, then start the currently configured free trial.
              No payment information requested.
            </p>
          </div>

          <div id="try-it" className="scroll-mt-12 bg-card p-5 ring-1 ring-border sm:p-8" aria-labelledby="demo-heading">
            <div className="flex items-baseline justify-between gap-3 border-b pb-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground">LIVE DEMONSTRATION</p>
                <h2 id="demo-heading" className="mt-1 text-xl font-semibold">Review a lunch entry</h2>
              </div>
              <span className="text-xs text-muted-foreground">Example data</span>
            </div>
            <div className="pt-6">
              <p className="text-sm font-semibold">{SAMPLE.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">Estimated meal · portions can be corrected</p>
              <div className="mt-7 flex items-baseline justify-between tabular-nums">
                <span className="text-sm text-muted-foreground">Calories</span>
                <strong className="text-3xl font-semibold tracking-tight">{formatNumber(example.kcal)} <span className="text-sm font-normal text-muted-foreground">kcal</span></strong>
              </div>
              <div className="mt-5 grid grid-cols-3 divide-x border-y py-4">
                {[
                  { label: "Protein", value: example.protein },
                  { label: "Carbs", value: example.carbs },
                  { label: "Fat", value: example.fat },
                ].map((metric) => (
                  <div key={metric.label} className="px-3 first:pl-0 last:pr-0">
                    <p className="text-xs text-muted-foreground">{metric.label}</p>
                    <p className="mt-1 text-lg font-semibold tabular-nums">{metric.value} <span className="text-xs font-normal text-muted-foreground">g</span></p>
                  </div>
                ))}
              </div>
              <label htmlFor="demo-grams" className="mt-7 flex justify-between gap-2 text-sm font-medium">
                <span>Adjust portion</span>
                <output htmlFor="demo-grams" className="tabular-nums">{example.grams} g</output>
              </label>
              <input
                id="demo-grams"
                type="range"
                min="100"
                max="600"
                step="25"
                value={grams}
                onChange={(e) => setGrams(Number(e.target.value))}
                className="my-4 h-9 w-full cursor-pointer accent-primary"
              />
              <p aria-live="polite" className="text-xs leading-relaxed text-muted-foreground">
                All example nutrients recalculate together as the portion changes.
                A photo alone cannot establish exact food identity, oil content or weight.
              </p>
            </div>
          </div>
        </section>

        <section className="border-y bg-card" aria-labelledby="process-heading">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-7 sm:py-20">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold tracking-wide text-primary">THE DAILY FLOW</p>
              <h2 id="process-heading" className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Your food diary is the point.</h2>
              <p className="mt-4 text-base leading-7 text-muted-foreground">
                The most valuable nutrition app is one you can actually use after every meal.
                Macromint keeps logging, reviewing and editing in one connected flow.
              </p>
            </div>
            <ol className="mt-10 divide-y border-y lg:grid lg:grid-cols-3 lg:divide-x lg:divide-y-0">
              <li className="py-7 lg:pr-8">
                <span className="text-sm tabular-nums text-primary">01 / Log</span>
                <h3 className="mt-3 text-xl font-semibold">Search or scan.</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Find a food manually or scan your plate. The camera suggests items; it never silently adds them to your diary.
                </p>
              </li>
              <li className="py-7 lg:px-8">
                <span className="text-sm tabular-nums text-primary">02 / Correct</span>
                <h3 className="mt-3 text-xl font-semibold">Choose what you ate.</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Fix portion grams and review calories, macros and available micronutrients before saving.
                </p>
              </li>
              <li className="py-7 lg:pl-8">
                <span className="text-sm tabular-nums text-primary">03 / Understand</span>
                <h3 className="mt-3 text-xl font-semibold">See the full day.</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Keep your remaining calories, protein progress and editable breakfast-to-dinner diary in sight.
                </p>
              </li>
            </ol>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-7 sm:py-20" aria-labelledby="source-heading">
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-20">
            <div>
              <p className="text-xs font-semibold tracking-wide text-primary">THE SOURCE MATTERS</p>
              <h2 id="source-heading" className="mt-3 max-w-sm text-3xl font-semibold tracking-tight sm:text-4xl">A number should come with context.</h2>
            </div>
            <div className="divide-y border-y">
              <div className="py-5">
                <h3 className="font-semibold">Food database</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Nutrition values can come from established reference datasets or community-contributed product labels.
                  A database match is useful, but is not proof the photograph or serving size is correct.
                </p>
              </div>
              <div className="py-5">
                <h3 className="font-semibold">AI-assisted estimate</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  When items or portions are inferred from an image, they remain estimates. Macromint lets you correct them.
                </p>
              </div>
              <div className="py-5">
                <h3 className="font-semibold">Unknown means unknown</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Missing nutrient values are not automatically zeros. You should know what is and is not included in the record.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="border-y bg-card" aria-labelledby="access-heading">
          <div className="mx-auto grid max-w-6xl gap-6 px-4 py-14 sm:px-7 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-xs font-semibold tracking-wide text-primary">CURRENT ACCESS</p>
              <h2 id="access-heading" className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">Private beta by invitation.</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                Use your invitation to create an account. The beta administrator controls access and trial extensions.
                Checkout and rewarded advertising are not configured; no purchase is available on this deployment.
              </p>
            </div>
            <Button size="lg" className="h-12" asChild><Link to="/register">Join with a code</Link></Button>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-4 py-16 sm:px-7" aria-labelledby="faq-heading">
          <h2 id="faq-heading" className="text-2xl font-semibold tracking-tight">Questions</h2>
          <div className="mt-6 divide-y border-y">
            {[
              {
                q: "Do I need an invitation?",
                a: "Yes, new accounts are limited to people who have received a beta invitation from the administrator.",
              },
              {
                q: "Does a photo produce exact calories?",
                a: "No. A photo cannot reliably reveal every ingredient or portion. Check the suggested foods and quantities before logging.",
              },
              {
                q: "Can I edit meals after logging?",
                a: "Yes. Your diary lets you review entries and adjust portions. Changes to portion size recalculate available nutrient values.",
              },
              {
                q: "Can I keep my data?",
                a: "You create a regular account using your email and password. Your diary is scoped to your account, with export and deletion controls in Settings.",
              },
            ].map(({ q, a }) => (
              <details key={q} className="group py-5">
                <summary className="min-h-11 cursor-pointer text-sm font-semibold leading-6">{q}</summary>
                <p className="pb-2 text-sm leading-6 text-muted-foreground">{a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-8 sm:px-7">
          <Logo />
          <nav className="flex flex-wrap gap-5 text-sm text-muted-foreground">
            <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link to="/terms" className="hover:text-foreground">Terms</Link>
            <Link to="/login" className="hover:text-foreground">Sign in</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
