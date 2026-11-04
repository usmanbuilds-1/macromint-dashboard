import { Link } from "react-router-dom";
import { ArrowRight, Droplets } from "lucide-react";
import { Logo } from "@/components/app/AppLayout";

/* All numbers in this public demonstration are intentionally illustrative. */
// Optimized high-resolution licensed photographs. The previous bundled
// 170px image was being stretched across desktop and mobile layouts.
const HERO_PHOTO = "/images/meal-hero-hq.webp";
const BREAKFAST_PHOTO = "/images/breakfast-hero-hq.webp";

const SAMPLE = {
  goal: 2100,
  total: 1430,
  protein: 96,
  proteinGoal: 130,
  carbs: 148,
  fat: 48,
};

function DailyPreview() {
  return (
    <section className="mint4-preview" aria-label="Example daily nutrition dashboard with sample data">
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
        <div className="mint4-water-top">
          <div><Droplets size={16} aria-hidden="true" /><span>Water <small>1.25 / 2.00 L</small></span></div>
        </div>
        <div className="mint4-water-meter" role="progressbar" aria-label="Sample water intake" aria-valuenow={1250} aria-valuemin={0} aria-valuemax={2000}><i style={{width:"62.5%"}}/></div>
      </div>
    </section>
  );
}

// DEFERRED BY OWNER (2026-11-04): Public interactive walkthrough moved to
// DeferredWalkthrough.tsx. Do not mount/link it until explicitly requested.

export function Landing() {
  return (
    <div className="mint4-site">
      <a href="#main-content" className="mint4-skip">Skip to content</a>
      <header className="mint4-header">
        <Link to="/" aria-label="Macro Mint home"><Logo /></Link>
        <nav aria-label="Site navigation" className="mint4-navigation">
          <a href="#features">Features</a>
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
            <p className="mint4-rail-foot">PRODUCT PREVIEW <span>·</span> SAMPLE DATA</p>
          </div>
          </aside>
          <section className="mint4-hero" aria-labelledby="mint4-hero-title">
            <p className="mint4-eyebrow">NUTRITION TRACKING, WITHOUT THE NOISE</p>
            <h1 id="mint4-hero-title">macro<span>mint.</span></h1>
            <h2>Know what you eat.<br/>See what matters.</h2>
            <p>Search for food, review a meal from a photo, and follow your calories and nutrients in one clear diary.</p>
            <div className="mint4-actions">
              <a className="mint4-primary" href="#features">Explore features <ArrowRight size={16} aria-hidden="true"/></a>
              <Link className="mint4-text-action" to="/login">Member sign in</Link>
            </div>
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
          {/* DEFERRED BY OWNER: Interactive demo is intentionally hidden. See DeferredWalkthrough.tsx. */}
          {/* Deferred by owner: illustrative Fiber/Iron/Vitamin C bars were static
              marketing figures without diary provenance, so this section is
              intentionally removed until per-nutrient source coverage and
              missing-data handling are demonstrated end-to-end. */}
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
              <div><dt>Where do I access my account?</dt><dd>Use the Sign in link to access your account.</dd></div>
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
