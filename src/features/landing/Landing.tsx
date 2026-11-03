import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Camera, Check, ChevronRight, Search } from "lucide-react";
import { Logo } from "@/components/app/AppLayout";
import { INVITE_REGISTRATION_ENABLED } from "@/lib/beta/config";

/* All numbers in this public demonstration are intentionally illustrative. */
// Optimized high-resolution licensed photographs. The previous bundled
// 170px image was being stretched across desktop and mobile layouts.
const HERO_PHOTO = "/images/meal-hero-hq.webp";
const MEAL_PHOTO = "/images/meal-review-hq.webp";
const BREAKFAST_PHOTO = "/images/breakfast-hero-hq.webp";

const SAMPLE = {
  goal: 2100,
  total: 1430,
  protein: 96,
  proteinGoal: 130,
  carbs: 148,
  fat: 48,
};
const SAMPLE_FOOD = { grams: 300, kcal: 480, protein: 42, carbs: 48, fat: 12 };

function nutritionAt(grams: number) {
  const ratio = grams / SAMPLE_FOOD.grams;
  return {
    kcal: Math.round(SAMPLE_FOOD.kcal * ratio),
    protein: Math.round(SAMPLE_FOOD.protein * ratio),
    carbs: Math.round(SAMPLE_FOOD.carbs * ratio),
    fat: Math.round(SAMPLE_FOOD.fat * ratio),
  };
}

function DailyPreview() {
  return (
    <div className="mint2-dashboard" aria-label="Example of the Macromint daily nutrition screen">
      <div className="mint2-dashboard-head">
        <div>
          <span className="mint2-meta">YOUR DAY</span>
          <h3>Today</h3>
        </div>
        <span className="mint2-daystamp">Sample data</span>
      </div>
      <div className="mint2-total">
        <div>
          <strong>1,430</strong><span>of 2,100 kcal</span>
        </div>
        <div className="mint2-total-remaining">
          <strong>670</strong><span>remaining</span>
        </div>
      </div>
      <div className="mint2-energy-track" aria-label="Example: 1430 of 2100 calories">
        <span style={{ width: `${(SAMPLE.total / SAMPLE.goal) * 100}%` }} />
      </div>
      <div className="mint2-macro-list">
        {[
          { name: "Protein", value: SAMPLE.protein, goal: SAMPLE.proteinGoal },
          { name: "Carbs", value: SAMPLE.carbs, goal: 220 },
          { name: "Fat", value: SAMPLE.fat, goal: 70 },
        ].map((m) => (
          <div className="mint2-macro-row" key={m.name}>
            <span>{m.name}</span>
            <strong>{m.value}g <small>/ {m.goal}g</small></strong>
            <div className="mint2-track"><i style={{ width: `${Math.min(100, (m.value / m.goal) * 100)}%` }} /></div>
          </div>
        ))}
      </div>
      <div className="mint2-dashboard-meals">
        <p>YOUR DIARY</p>
        <div><span>Breakfast</span><b>320 kcal</b></div>
        <div><span>Lunch</span><b>610 kcal</b></div>
        <div><span>Dinner</span><b>500 kcal</b></div>
      </div>
    </div>
  );
}

const STEPS = [
  { key: "search", number: "01", name: "Find your food", summary: "Search foods and saved meals." },
  { key: "scan", number: "02", name: "Review your meal", summary: "Use a photo to get started." },
  { key: "adjust", number: "03", name: "Log your portion", summary: "Adjust the amount and see nutrition update." },
] as const;

type StepKey = typeof STEPS[number]["key"];

function Walkthrough() {
  const [step, setStep] = useState<StepKey>("search");
  const [grams, setGrams] = useState(300);
  const [logged, setLogged] = useState(false);
  const nutrients = nutritionAt(grams);
  const choose = (next: StepKey) => { setStep(next); setLogged(false); };
  return (
    <section className="mint2-walkthrough mint2-section" id="how-it-works" aria-labelledby="walkthrough-title">
      <div className="mint2-container">
        <div className="mint2-section-header">
          <span className="mint2-eyebrow">SEE HOW IT WORKS</span>
          <h2 id="walkthrough-title">From your plate to your diary.</h2>
          <p>Three straightforward steps. No complicated setup.</p>
        </div>
        <div className="mint2-walkthrough-layout">
          <div className="mint2-steps" role="group" aria-label="Explore food logging steps">
            {STEPS.map((s) => (
              <button key={s.key} type="button" id={`step-${s.key}`}
                aria-pressed={step === s.key} aria-controls="walkthrough-panel"
                className={step === s.key ? "mint2-step is-current" : "mint2-step"}
                onClick={() => choose(s.key)}>
                <span className="mint2-step-number">{s.number}</span>
                <span className="mint2-step-text"><strong>{s.name}</strong><small>{s.summary}</small></span>
                <ChevronRight size={18} aria-hidden="true" />
              </button>
            ))}
          </div>
          <div id="walkthrough-panel" className="mint2-step-panel" role="region" aria-label="Interactive food logging example">
            {step === "search" && (
              <div className="mint2-step-content">
                <p className="mint2-preview-label">FOOD SEARCH · EXAMPLE</p>
                <div className="mint2-searchbox"><Search size={17} aria-hidden="true" /><span>chicken rice bowl</span></div>
                <button className="mint2-found-food" type="button" onClick={() => choose("scan")}>
                  <img src={MEAL_PHOTO} alt="" width="86" height="100" loading="lazy" />
                  <span><strong>Grilled chicken rice bowl</strong><small>300 g · 480 kcal</small></span>
                  <ArrowRight size={18} aria-hidden="true" />
                </button>
                <div className="mint2-step-help">Tap the food above to see the next step.</div>
              </div>
            )}
            {step === "scan" && (
              <div className="mint2-step-content">
                <p className="mint2-preview-label">PHOTO REVIEW · EXAMPLE</p>
                <div className="mint2-scan-preview">
                  <img src={MEAL_PHOTO} alt="Example chicken and rice meal" width="600" height="750" loading="lazy" />
                  <div><Camera size={17} aria-hidden="true" /><span>Meal photo</span></div>
                </div>
                <div className="mint2-step-review-row"><strong>Grilled chicken rice bowl</strong><span>1 item found</span></div>
                <button type="button" className="mint2-action" onClick={() => choose("adjust")}>Review portion <ArrowRight size={17} aria-hidden="true" /></button>
              </div>
            )}
            {step === "adjust" && (
              <div className="mint2-step-content">
                <p className="mint2-preview-label">PORTION EDITOR · INTERACTIVE EXAMPLE</p>
                <div className="mint2-portion-top"><span>Grilled chicken rice bowl</span><strong>{nutrients.kcal} kcal</strong></div>
                <label className="mint2-portion-label" htmlFor="portion-control">Portion size <output htmlFor="portion-control">{grams} g</output></label>
                <input id="portion-control" aria-label="Adjust example portion in grams" type="range"
                  min={100} max={500} step={25} value={grams}
                  onChange={(e) => { setGrams(Number(e.target.value)); setLogged(false); }} />
                <div className="mint2-portion-nutrients" aria-live="polite">
                  <div><span>Protein</span><strong>{nutrients.protein}g</strong></div>
                  <div><span>Carbs</span><strong>{nutrients.carbs}g</strong></div>
                  <div><span>Fat</span><strong>{nutrients.fat}g</strong></div>
                </div>
                <button type="button" className="mint2-action" onClick={() => setLogged(true)}>
                  {logged ? <Check size={17} aria-hidden="true" /> : null}{logged ? "Added in this example" : "Add to diary"}
                </button>
              </div>
            )}
            <span className="mint2-sample-tag">Interactive demo · sample values</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Landing() {
  return (
    <div className="mint2-site">
      <header className="mint2-header">
        <div className="mint2-container mint2-header-inner">
          <Link to="/" aria-label="Macro Mint home"><Logo /></Link>
          <nav className="mint2-header-links" aria-label="Site navigation">
            <a href="#features">Features</a>
            <a href="#how-it-works">How it works</a>
          </nav>
          <div className="mint2-header-actions">
            <Link to="/login" className="mint2-text-link">Sign in</Link>
            <a href="#how-it-works" className="mint2-button mint2-button--small">Explore the app</a>
          </div>
        </div>
      </header>

      <main>
        <section className="mint2-hero mint2-container" aria-labelledby="hero-title">
          <div className="mint2-hero-copy">
            <span className="mint2-eyebrow">A BETTER FOOD DIARY</span>
            <h1 id="hero-title">Your nutrition,<br /><em>in focus.</em></h1>
            <p>Log meals by search or photo. Keep your calories, macros, and daily progress in one beautifully clear place.</p>
            <div className="mint2-hero-actions">
              <a href="#how-it-works" className="mint2-button">See how it works <ArrowRight size={18} aria-hidden="true" /></a>
              <a href="#features" className="mint2-secondary">Explore features</a>
            </div>
            <div className="mint2-hero-status"><span aria-hidden="true" /> Available now · Access by invitation</div>
          </div>
          <div className="mint2-hero-visual">
            <picture className="mint2-hero-photo">
              <img src={HERO_PHOTO} alt="Fresh vegetables, grains and greens arranged in a vibrant bowl" width={1200} height={900} fetchPriority="high" decoding="async" />
            </picture>
            <DailyPreview />
          </div>
        </section>

        <section className="mint2-proof" id="features" aria-labelledby="features-title">
          <div className="mint2-container mint2-proof-inner">
            <div className="mint2-proof-intro">
              <span className="mint2-eyebrow">WHAT YOU CAN DO</span>
              <h2 id="features-title">Good nutrition starts with good information.</h2>
            </div>
            <div className="mint2-feature-list">
              <div><span>01</span><h3>Keep a food diary that works.</h3><p>Search foods, save favourites, and return to meals you log often.</p></div>
              <div><span>02</span><h3>See beyond calories.</h3><p>Follow protein, carbs, fat, and available micronutrients as you go.</p></div>
              <div><span>03</span><h3>Make progress visible.</h3><p>Personal targets, weight entries, and trends together in one place.</p></div>
            </div>
          </div>
        </section>

        <Walkthrough />

        <section className="mint2-feature-photo-section" aria-labelledby="detail-title">
          <div className="mint2-container mint2-detail-layout">
            <div className="mint2-detail-photo">
              <img src={BREAKFAST_PHOTO} alt="Yogurt breakfast bowl with berries, oats and banana" width={600} height={750} loading="lazy" decoding="async" />
            </div>
            <div className="mint2-detail-copy">
              <span className="mint2-eyebrow">THE EVERYDAY DETAILS</span>
              <h2 id="detail-title">Food logging that fits real life.</h2>
              <p>Your diary should help you keep going, not get in the way. Add a meal in seconds, edit portions when you need to, and see where you stand for the day.</p>
              <a href="#how-it-works" className="mint2-inline-link">Try the interactive demo <ArrowRight size={17} aria-hidden="true" /></a>
            </div>
          </div>
        </section>

        <section className="mint2-access" id="access" aria-labelledby="access-title">
          <div className="mint2-container mint2-access-inner">
            <div>
              <span className="mint2-eyebrow">MACRO MINT IS LIVE</span>
              <h2 id="access-title">Your next meal is a good place to start.</h2>
              <p>{INVITE_REGISTRATION_ENABLED
                ? "Have an invitation? Create your account and start tracking."
                : "Already have an account? Sign in. New account invitations are being configured."}</p>
            </div>
            <Link to={INVITE_REGISTRATION_ENABLED ? "/register" : "/login"} className="mint2-button">
              {INVITE_REGISTRATION_ENABLED ? "Join with your code" : "Member sign in"} <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>
      <footer className="mint2-footer">
        <div className="mint2-container mint2-footer-inner">
          <Logo />
          <p>Photo-based food suggestions are estimates. Photos: <a href="https://unsplash.com/?utm_source=macro_mint&utm_medium=referral" target="_blank" rel="noopener noreferrer">Unsplash</a>.</p>
          <nav aria-label="Legal links">
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
            <Link to="/login">Sign in</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
