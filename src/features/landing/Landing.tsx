import { useState } from "react";
import { Link } from "react-router-dom";
import { Camera, ChevronDown, ChevronRight, CircleCheck, Plus, Search, SlidersHorizontal } from "lucide-react";
import { Logo } from "@/components/app/AppLayout";
import { IS_DEMO } from "@/lib/backend";
import { INVITE_REGISTRATION_ENABLED } from "@/lib/beta/config";

const DEFAULT_PORTION = 300;
const DEMO_FOOD = { name: "Grilled chicken bowl", kcal: 480, protein: 42, carbs: 48, fat: 12 };
const SAMPLE_DAY = { kcal: 1420, goal: 2000, protein: 92, proteinGoal: 130, carbs: 158, fat: 46 };
const NUTRIENTS = [
  { label: "Protein", key: "protein", suffix: "g" },
  { label: "Carbs", key: "carbs", suffix: "g" },
  { label: "Fat", key: "fat", suffix: "g" },
] as const;

function sampleNutrition(grams: number) {
  const scale = grams / DEFAULT_PORTION;
  return {
    kcal: Math.round(DEMO_FOOD.kcal * scale),
    protein: Math.round(DEMO_FOOD.protein * scale),
    carbs: Math.round(DEMO_FOOD.carbs * scale),
    fat: Math.round(DEMO_FOOD.fat * scale),
  };
}

/** A real, keyboard-accessible React preview with example data. Not a screenshot. */
function ProductScene() {
  const [grams, setGrams] = useState(DEFAULT_PORTION);
  const [added, setAdded] = useState(false);
  const [mealOpen, setMealOpen] = useState(false);
  const food = sampleNutrition(grams);

  return (
    <div className="mm-scene" id="preview" aria-label="Interactive Macromint interface preview">
      <div className="mm-scene-light" aria-hidden="true" />
      <div className="mm-scene-food">
        <img
          src="/images/food-bowl.webp"
          alt="Grilled chicken and rice bowl with vegetables"
          width={194}
          height={190}
          decoding="async"
          fetchPriority="high"
        />
      </div>

      <section className="mm-phone mm-phone--main" aria-label="Example daily nutrition dashboard">
        <div className="mm-phone-top" aria-hidden="true">
          <span>9:41</span><span className="mm-phone-island" /><span>••• ▰</span>
        </div>
        <div className="mm-phone-screen">
          <div className="mm-phone-titlebar">
            <strong>Today</strong>
            <span className="mm-phone-menu"><SlidersHorizontal size={15} aria-hidden="true" /></span>
          </div>
          <p className="mm-phone-date">Tuesday, Nov 3</p>
          <div className="mm-energy-arc" role="img" aria-label="1,420 of 2,000 calories in this demonstration">
            <svg viewBox="0 0 200 112" aria-hidden="true">
              <path d="M 18 97 A 82 82 0 0 1 182 97" pathLength="100" stroke="#e6ebe7" strokeWidth="13" fill="none" strokeLinecap="round" />
              <path d="M 18 97 A 82 82 0 0 1 182 97" pathLength="100" stroke="#1d9368" strokeWidth="13" fill="none" strokeLinecap="round" strokeDasharray="71 100" />
            </svg>
            <div className="mm-energy-number"><strong>1,420</strong><span> / 2,000 kcal</span></div>
          </div>
          <div className="mm-phone-macros">
            {NUTRIENTS.map(({ label, key, suffix }) => (
              <div key={key}>
                <span>{label}</span>
                <strong>{SAMPLE_DAY[key]}{suffix}</strong>
                <div className="mm-mini-progress"><i style={{ width: `${key === "protein" ? 71 : key === "carbs" ? 63 : 56}%` }} /></div>
              </div>
            ))}
          </div>
          <button className="mm-phone-log" type="button" onClick={() => document.getElementById("portion-control")?.focus()}>
            <Plus size={15} aria-hidden="true" /> Log food
          </button>
          <div className="mm-phone-meals">
            {[
              ["Breakfast", "420"],
              ["Lunch", "580"],
              ["Dinner", "420"],
              ["Snacks", "0"],
            ].map(([meal, kcal]) => (
              <button type="button" key={meal} onClick={() => setMealOpen((prev) => !prev)} className="mm-phone-meal">
                <span>{meal}</span><span>{kcal} kcal <ChevronRight size={12} aria-hidden="true" /></span>
              </button>
            ))}
            {mealOpen && <p className="mm-phone-note">Your diary makes every meal easy to review.</p>}
          </div>
          <div className="mm-phone-tabs" aria-hidden="true"><strong>Today</strong><span>Diary</span><span>Trends</span><span>More</span></div>
        </div>
      </section>

      <section className="mm-phone mm-phone--scan" aria-label="Interactive meal scan review demonstration">
        <div className="mm-phone-top mm-phone-top--dark" aria-hidden="true">
          <span>9:41</span><span className="mm-phone-island" /><span>••• ▰</span>
        </div>
        <div className="mm-scan-head"><span>‹</span><strong>Review meal</strong><span>•••</span></div>
        <div className="mm-scan-photo">
          <img src="/images/food-bowl.webp" alt="Example chicken and rice meal selected for review" width={194} height={190} loading="lazy" />
          <span className="mm-scan-corner mm-scan-corner--tl" />
          <span className="mm-scan-corner mm-scan-corner--br" />
        </div>
        <div className="mm-scan-review">
          <p className="mm-scan-review-kicker">YOUR MEAL</p>
          <strong>{DEMO_FOOD.name}</strong>
          <div className="mm-scan-kcal"><b>{food.kcal}</b> kcal <span>· {grams} g</span></div>
          <label htmlFor="portion-control" className="mm-scan-portion">Adjust portion <span>{grams} g</span></label>
          <input
            id="portion-control"
            type="range"
            min={150}
            max={500}
            step={25}
            value={grams}
            onChange={(event) => { setGrams(Number(event.target.value)); setAdded(false); }}
            aria-label="Change example meal portion in grams"
          />
          <div className="mm-scan-macros" aria-live="polite">
            <span>P {food.protein}g</span><span>C {food.carbs}g</span><span>F {food.fat}g</span>
          </div>
          <button type="button" className="mm-scan-button" onClick={() => setAdded(true)}>
            {added ? <CircleCheck size={14} aria-hidden="true" /> : <Plus size={14} aria-hidden="true" />}
            {added ? "Added in this demo" : "Add to diary"}
          </button>
        </div>
      </section>
      <div className="mm-scene-caption">INTERACTIVE PREVIEW <span>·</span> SAMPLE DATA</div>
    </div>
  );
}

export function Landing() {
  const betaReady = INVITE_REGISTRATION_ENABLED || IS_DEMO;
  return (
    <div className="mm-landing">
      <header className="mm-header">
        <div className="mm-container mm-header-inner">
          <Link to="/" aria-label="Macro Mint home"><Logo /></Link>
          <nav className="mm-header-nav" aria-label="Explore Macro Mint">
            <a href="#features">Features</a>
            <a href="#how-it-works">How it works</a>
          </nav>
          <div className="mm-header-actions">
            <Link to="/login" className="mm-outline-button">Sign in</Link>
            <Link to="/register" className="mm-green-button">{betaReady ? "Get started" : "Beta status"}</Link>
          </div>
        </div>
      </header>

      <main>
        <section className="mm-hero mm-container" aria-labelledby="main-heading">
          <div className="mm-hero-copy">
            <p className="mm-eyebrow">NUTRITION TRACKING, MADE SIMPLE</p>
            <h1 id="main-heading">Track your food.<br /><em>Hit your goals.</em></h1>
            <p className="mm-hero-lead">Know what you eat, see what matters, and build habits that last. All in one beautifully simple food diary.</p>
            <div className="mm-hero-actions">
              <Link to="/register" className="mm-green-button mm-large-button">
                {betaReady ? "Get started free" : "Private beta coming soon"} <ChevronRight size={17} aria-hidden="true" />
              </Link>
              <a href="#preview" className="mm-outline-button mm-large-button">See how it works <ChevronDown size={16} aria-hidden="true" /></a>
            </div>
            <p className="mm-access-note">{betaReady ? "A personal invitation is required during the private beta." : "Private beta registration is being prepared."}</p>
          </div>
          <ProductScene />
        </section>

        <section className="mm-benefits" id="features" aria-label="What makes Macro Mint useful">
          <div className="mm-container mm-benefits-grid">
            <div><span className="mm-benefit-index">01</span><h2>Log in seconds</h2><p>Find foods, save favourites, or scan a meal.</p></div>
            <div><span className="mm-benefit-index">02</span><h2>See the whole picture</h2><p>Calories, protein, macros, and daily progress.</p></div>
            <div><span className="mm-benefit-index">03</span><h2>Make it yours</h2><p>Set your own targets and adjust every portion.</p></div>
          </div>
        </section>

        <section className="mm-story mm-container" id="how-it-works">
          <div className="mm-story-photo">
            <img src="/images/food-bowl.webp" alt="Grilled chicken and rice bowl" width={194} height={190} loading="lazy" decoding="async" />
          </div>
          <div className="mm-story-copy">
            <span className="mm-eyebrow">FROM PLATE TO PROGRESS</span>
            <h2>One place for everything you eat.</h2>
            <p>Search your foods, review a photo scan, and log your meal with the right serving size. Your diary and daily targets update together.</p>
            <div className="mm-story-details">
              <div><Search size={18} aria-hidden="true" /><span><strong>Search it</strong> Find familiar foods and recent meals.</span></div>
              <div><Camera size={18} aria-hidden="true" /><span><strong>Scan it</strong> Add a meal from a photo, then review.</span></div>
              <div><CircleCheck size={18} aria-hidden="true" /><span><strong>Track it</strong> Watch the day come together.</span></div>
            </div>
          </div>
        </section>

        <section className="mm-access" id="access">
          <div className="mm-container mm-access-inner">
            <div><span className="mm-eyebrow">EARLY ACCESS</span><h2>Your goals. Your pace.</h2><p>{betaReady ? "Macromint is currently accepting invited beta testers." : "We’re preparing access for our first beta testers."}</p></div>
            <Link className="mm-green-button mm-large-button" to="/register">{betaReady ? "Join the beta" : "View beta status"} <ChevronRight size={17} aria-hidden="true" /></Link>
          </div>
        </section>
      </main>
      <footer className="mm-footer">
        <div className="mm-container mm-footer-inner">
          <Logo />
          <p>Photo-based nutrition suggestions are estimates. Review portions before logging.</p>
          <nav aria-label="Legal and account links"><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link><Link to="/login">Sign in</Link></nav>
        </div>
      </footer>
    </div>
  );
}
