import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Camera, Check, ChevronRight, Search, Droplets, Plus, Minus } from "lucide-react";
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
  const [water, setWater] = useState(1250);
  return (
    <section className="mint4-preview" aria-label="Interactive example nutrition dashboard">
      <div className="mint4-preview-top">
        <div><span className="mint4-preview-overline">YOUR DAY</span><h3>Today</h3></div>
        <span className="mint4-preview-label">Sample diary</span>
      </div>
      <div className="mint4-energy-heading">
        <div><span>Calories consumed</span><strong>1,430 <small>/ 2,100 kcal</small></strong></div>
        <span className="mint4-energy-remaining"><strong>670</strong><small>remaining</small></span>
      </div>
      <div className="mint4-energy-meter" role="progressbar" aria-label="Example calories consumed" aria-valuemin={0} aria-valuenow={1430} aria-valuemax={2100}><i style={{width:"68.095%"}} /></div>
      <div className="mint4-preview-macros">
        {[
          ["Protein", SAMPLE.protein, SAMPLE.proteinGoal],
          ["Carbs", SAMPLE.carbs, 220],
          ["Fat", SAMPLE.fat, 70]
        ].map(([name, value, goal])=>(
          <div className="mint4-macro" key={name}>
            <div><span>{name}</span><strong>{value} <small>/ {goal} g</small></strong></div>
            <div className="mint4-macro-meter"><i style={{width:`${Math.round(Number(value)/Number(goal)*100)}%`}} /></div>
          </div>
        ))}
      </div>
      <div className="mint4-preview-diary">
        <div className="mint4-section-line"><strong>Your food diary</strong><span>1,430 kcal</span></div>
        <div><span>Breakfast <small>Overnight oats</small></span><b>320</b></div>
        <div><span>Lunch <small>Chicken and rice</small></span><b>610</b></div>
        <div><span>Dinner <small>Vegetable bowl</small></span><b>500</b></div>
      </div>
      <div className="mint4-preview-water">
        <div className="mint4-water-top"><div><Droplets size={16} aria-hidden="true" /><span>Water <small>{(water/1000).toFixed(2)} / 2.00 L</small></span></div><div>
          <button type="button" aria-label="Remove 250 ml from example" disabled={water===0} onClick={()=>setWater(v=>Math.max(0,v-250))}><Minus size={15}/></button>
          <button type="button" aria-label="Add 250 ml to example" disabled={water>=2000} onClick={()=>setWater(v=>Math.min(2000,v+250))}><Plus size={15}/></button>
        </div></div>
        <div className="mint4-water-meter" role="progressbar" aria-label="Example water intake" aria-valuenow={water} aria-valuemin={0} aria-valuemax={2000}><i style={{width:`${water/20}%`}}/></div>
        <p>Use the controls to try the preview</p>
      </div>
    </section>
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
    <div className="mint4-site">
      <a href="#main-content" className="mint4-skip">Skip to content</a>
      <header className="mint4-header">
        <Link to="/" aria-label="Macro Mint home"><Logo /></Link>
        <nav aria-label="Site navigation" className="mint4-navigation">
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
          <a href="#questions">Questions</a>
        </nav>
        <Link to="/login" className="mint4-signin">Sign in <ArrowRight size={16} aria-hidden="true" /></Link>
      </header>
      <main id="main-content">
        <div className="mint4-layout">
          <aside className="mint4-rail" aria-label="Product preview">
          <div className="mint4-rail-inner">
            <p className="mint4-rail-eyebrow">A BETTER VIEW OF EVERY DAY</p>
            <DailyPreview />
            <p className="mint4-rail-foot">INTERACTIVE PREVIEW <span>·</span> SAMPLE DATA</p>
          </div>
          </aside>
          <section className="mint4-hero" aria-labelledby="mint4-hero-title">
            <p className="mint4-eyebrow">NUTRITION TRACKING, WITHOUT THE NOISE</p>
            <h1 id="mint4-hero-title">macro<span>mint.</span></h1>
            <h2>Know what you eat.<br/>See what matters.</h2>
            <p>Search for food, review a meal from a photo, and follow your calories and nutrients in one clear diary.</p>
            <div className="mint4-actions">
              <a className="mint4-primary" href="#how-it-works">Try the interactive demo <ArrowRight size={16} aria-hidden="true"/></a>
              <Link className="mint4-text-action" to="/login">Member sign in</Link>
            </div>
            <p className="mint4-access">The web app is live. {INVITE_REGISTRATION_ENABLED ? "New members join using a personal invitation." : "New account invitations are not yet available; existing members can sign in."}</p>
          </section>
        </div>
          <section className="mint4-features mint4-section" id="features" aria-labelledby="mint4-features-title">
            <p className="mint4-eyebrow">DESIGNED FOR THE DAILY ROUTINE</p>
            <h2 id="mint4-features-title">A food diary that stays useful.</h2>
            <div className="mint4-features-list">
              <article><span>01</span><div><h3>Food logging, less friction.</h3><p>Find foods, save favourites, and reuse meals you log often.</p></div></article>
              <article><span>02</span><div><h3>More than a calorie total.</h3><p>Track protein, carbs, fat, and available vitamins and minerals.</p></div></article>
              <article><span>03</span><div><h3>Your goals, in context.</h3><p>Review estimated energy targets and change them when needed.</p></div></article>
              <article><span>04</span><div><h3>A record of your progress.</h3><p>Follow weight entries and nutrition trends. Export your data.</p></div></article>
            </div>
          </section>
          <section className="mint4-photo mint4-section" aria-labelledby="mint4-photo-title">
            <img src={HERO_PHOTO} alt="Colorful bowl of grains, fresh vegetables and greens" width={1200} height={900} loading="lazy" />
            <p className="mint4-eyebrow">YOUR PLATE, YOUR PORTION</p>
            <h2 id="mint4-photo-title">More useful detail.<br/>Fewer steps.</h2>
            <p>Check the food and quantity before logging. Keep the rest of your day in view.</p>
          </section>
          <Walkthrough />
          <section className="mint4-nutrients mint4-section" aria-labelledby="mint4-nutrient-title">
            <p className="mint4-eyebrow">THE DETAILS BEHIND THE DAY</p>
            <h2 id="mint4-nutrient-title">Track what your food data actually provides.</h2>
            <p>Macro totals stay easy to find, while available vitamins and minerals add context. Missing nutrient data stays missing instead of turning into a made-up number.</p>
            <div className="mint4-nutrient-example">
              <span>SAMPLE NUTRIENTS</span>
              {[["Fiber","18 g",61],["Iron","9 mg",74],["Vitamin C","67 mg",82]].map(([name,value,pct])=><div key={name}><strong>{name}</strong><span>{value}</span><div><i style={{width:`${pct}%`}} /></div></div>)}
            </div>
          </section>
          <section className="mint4-photo mint4-section" aria-labelledby="mint4-breakfast-title">
            <img src={BREAKFAST_PHOTO} alt="Yogurt bowl with berries and oats" width={600} height={750} loading="lazy" />
            <h2 id="mint4-breakfast-title">Make the ordinary meals count.</h2>
            <p>Whether it's breakfast or your usual lunch, build a diary you can actually keep up with.</p>
          </section>
          <section className="mint4-faq mint4-section" id="questions" aria-labelledby="mint4-faq-title">
            <p className="mint4-eyebrow">STRAIGHT ANSWERS</p>
            <h2 id="mint4-faq-title">A few useful details.</h2>
            <dl>
              <div><dt>Can I log food without a photo?</dt><dd>Yes. Search foods, use saved items, or enter a custom food.</dd></div>
              <div><dt>Does Macromint automatically prescribe calories?</dt><dd>No. Starting targets are estimates based on your profile and activity. You can review and edit them.</dd></div>
              <div><dt>Can I export my data?</dt><dd>Yes. Account settings include an export of your stored data.</dd></div>
              <div><dt>How do I join?</dt><dd>{INVITE_REGISTRATION_ENABLED ? "Use the private invitation code provided to you." : "Existing members can sign in. New invitations are not currently active."}</dd></div>
            </dl>
          </section>
          <section className="mint4-close mint4-section" aria-labelledby="mint4-close-title">
            <h2 id="mint4-close-title">A clearer view of your nutrition.</h2>
            <Link to="/login" className="mint4-primary">Member sign in <ArrowRight size={17} aria-hidden="true" /></Link>
          </section>
          <footer className="mint4-footer">
            <Logo/>
            <p>Photo-based nutrition suggestions are estimates. Check portions before logging.</p>
            <nav aria-label="Legal links"><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link><Link to="/login">Sign in</Link></nav>
          </footer>
      </main>
    </div>
  );
}
