import { Link } from "react-router-dom";
import { ArrowRight, Droplets } from "lucide-react";
import { Logo } from "@/components/app/AppLayout";
import { Reveal } from "@/lib/motion";

const PHOTO_MEAL = "/images/meal-hero-hq.webp";
const PHOTO_BREAKFAST = "/images/breakfast-hero-hq.webp";

const sampleMeals = [
  { meal: "Breakfast", name: "Overnight oats and fruit", kcal: 320 },
  { meal: "Lunch", name: "Chicken, rice and greens", kcal: 610 },
  { meal: "Dinner", name: "Vegetable and grain bowl", kcal: 500 },
];

const features = [
  {
    number: "01",
    title: "A diary you'll want to keep.",
    detail: "Find a food, choose your serving and add it to a day that makes sense at a glance.",
  },
  {
    number: "02",
    title: "Your numbers, without the clutter.",
    detail: "Follow calories and macros. See additional nutrient information when the food data includes it.",
  },
  {
    number: "03",
    title: "Meals that get easier to log.",
    detail: "Save your own foods and favourite combinations, then use them again without starting over.",
  },
  {
    number: "04",
    title: "Progress with perspective.",
    detail: "Look back at nutrition trends, record your weight, adjust targets and export your history.",
  },
];

/** A clearly labelled static example. No imaginary verified scores, customers or live data. */
function StageDiary() {
  return (
    <div className="mint5-stage-card" aria-label="Illustrative daily nutrition dashboard using sample values">
      <div className="mint5-stage-heading">
        <div><span className="mint5-micro">DAILY VIEW</span><h2>Today</h2></div>
        <span className="mint5-stage-date">Example diary</span>
      </div>
      <div className="mint5-energy">
        <div className="mint5-energy-ring" aria-hidden="true">
          <svg viewBox="0 0 120 120" focusable="false">
            <circle cx="60" cy="60" r="46" className="mint5-ring-track" fill="none" strokeWidth="9" />
            <circle cx="60" cy="60" r="46" className="mint5-ring-progress" fill="none" strokeWidth="9" strokeLinecap="round"
              pathLength="100" strokeDasharray="68.1 100" />
          </svg>
          <span>68%</span>
        </div>
        <div className="mint5-energy-caption">
          <span>Calories logged</span>
          <strong>1,430</strong>
          <span>of 2,100 kcal</span>
        </div>
      </div>
      <div className="mint5-macro-lines">
        {[
          { label: "Protein", actual: 96, goal: 130 },
          { label: "Carbs", actual: 148, goal: 220 },
          { label: "Fat", actual: 48, goal: 70 },
        ].map((macro, index) => (
          <div className="mint5-macro-line" key={macro.label} style={{ animationDelay: String(index * 90 + 180) + "ms" }}>
            <div className="mint5-macro-title"><span>{macro.label}</span><strong>{macro.actual} <small>/ {macro.goal} g</small></strong></div>
            <div className="mint5-track"><i style={{ width: String((macro.actual / macro.goal) * 100) + "%" }} /></div>
          </div>
        ))}
      </div>
      <div className="mint5-diary-list">
        <div className="mint5-diary-title"><strong>Food diary</strong><span>kcal</span></div>
        {sampleMeals.map((item, index) => (
          <div className="mint5-diary-row" key={item.meal} style={{ animationDelay: String(index * 100 + 360) + "ms" }}>
            <div><strong>{item.meal}</strong><small>{item.name}</small></div>
            <span>{item.kcal}</span>
          </div>
        ))}
      </div>
      <div className="mint5-water">
        <div><span><Droplets size={15} aria-hidden="true" />Water</span><strong>1.25 <small>/ 2.00 L</small></strong></div>
        <div className="mint5-water-segments" aria-label="Example hydration: five of eight segments filled">
          {Array.from({ length: 8 }, (_, index) => <i key={index} className={index < 5 ? "is-filled" : ""} />)}
        </div>
      </div>
    </div>
  );
}

export function Landing() {
  return (
    <div className="mint5-site">
      <a className="mint5-skip" href="#main-content">Skip to content</a>
      <div className="mint5-shell">
        <aside className="mint5-stage">
          <div className="mint5-stage-sticky">
            <StageDiary />
            <p className="mint5-stage-footnote">PRODUCT PREVIEW <span>•</span> ILLUSTRATIVE VALUES</p>
          </div>
        </aside>

        <div className="mint5-reading">
          <header className="mint5-header">
            <Link to="/" className="mint5-header-logo" aria-label="Macro Mint home"><Logo compact /></Link>
            <nav className="mint5-nav" aria-label="Site navigation">
              <a href="#features">Features</a>
              <a href="#how-it-works">How it works</a>
              <a href="#questions">FAQ</a>
            </nav>
            <Link to="/login" className="mint5-header-signin">Sign in <ArrowRight size={15} aria-hidden="true" /></Link>
          </header>

          <main id="main-content">
            <section className="mint5-hero" aria-labelledby="mint5-main-title">
              <Reveal as="header">
                <p className="mint5-eyebrow">A MORE THOUGHTFUL FOOD DIARY</p>
                <h2>Your nutrition, with room to think.</h2>
                <p className="mint5-hero-lede">Know what you eat, see your progress and make informed choices—without having to decode a dashboard.</p>
                <div className="mint5-actions">
                  <Link to="/login" className="mint5-button">Open your diary <ArrowRight size={17} aria-hidden="true" /></Link>
                  <a href="#features" className="mint5-underlined">Explore the product</a>
                </div>
              </Reveal>
              <div className="mint5-wordmark-wrap">
                <h1 id="mint5-main-title" className="mint5-wordmark">macromint<span>.</span></h1>
                <p>Good nutrition starts with a clearer picture.</p>
              </div>
            </section>

            <section className="mint5-section mint5-features" id="features" aria-labelledby="mint5-features-title">
              <Reveal>
                <p className="mint5-eyebrow">DESIGNED FOR REAL DAYS</p>
                <h2 id="mint5-features-title">Everything in its place.</h2>
                <p className="mint5-intro">The essentials are easy to find. Your diary stays the center of the experience.</p>
              </Reveal>
              <div className="mint5-feature-list">
                {features.map((feature, index) => (
                  <Reveal as="article" className="mint5-feature" delay={index * 75} key={feature.number}>
                    <span className="mint5-feature-number">{feature.number}</span>
                    <div><h3>{feature.title}</h3><p>{feature.detail}</p></div>
                  </Reveal>
                ))}
              </div>
            </section>

            <section className="mint5-section mint5-story" aria-labelledby="mint5-story-title">
              <Reveal as="figure" className="mint5-story-image">
                <img src={PHOTO_MEAL} width={1200} height={900} alt="A meal bowl with grains, chicken and fresh vegetables" loading="lazy" decoding="async" />
                <figcaption>Start with a meal. Keep the details in view.</figcaption>
              </Reveal>
              <Reveal>
                <p className="mint5-eyebrow">FROM PLATE TO DIARY</p>
                <h2 id="mint5-story-title">Log what matters. Skip the busywork.</h2>
                <p className="mint5-intro">Search foods, set a portion, or begin with a photo. Review the entry before it becomes part of your day.</p>
              </Reveal>
            </section>

            <section className="mint5-section mint5-how" id="how-it-works" aria-labelledby="mint5-how-title">
              <Reveal>
                <p className="mint5-eyebrow">A SIMPLE DAILY LOOP</p>
                <h2 id="mint5-how-title">Three steps. A habit you can keep.</h2>
              </Reveal>
              <div className="mint5-how-list">
                {[
                  ["01", "Find your food", "Search, select a saved food or start with a meal photo."],
                  ["02", "Review the portion", "Adjust the quantity and check the available nutrition values."],
                  ["03", "Understand the day", "See your diary, macros, water and weight history over time."],
                ].map(([number, heading, copy], index) => (
                  <Reveal className="mint5-how-row" key={number} delay={index * 85}>
                    <span>{number}</span><div><h3>{heading}</h3><p>{copy}</p></div>
                  </Reveal>
                ))}
              </div>
            </section>

            <section className="mint5-section mint5-breakfast" aria-labelledby="mint5-breakfast-title">
              <Reveal>
                <p className="mint5-eyebrow">THE EVERYDAY, NOT THE EXCEPTION</p>
                <h2 id="mint5-breakfast-title">Breakfast counts, too.</h2>
                <p className="mint5-intro">A familiar breakfast, your usual lunch, a meal you've cooked before. Build an accurate record without starting from scratch every day.</p>
              </Reveal>
              <Reveal as="figure" className="mint5-breakfast-image">
                <img src={PHOTO_BREAKFAST} width={900} height={1100} alt="Yogurt, fresh berries and oats in a breakfast bowl" loading="lazy" decoding="async" />
              </Reveal>
            </section>

            <section className="mint5-section mint5-faq" id="questions" aria-labelledby="mint5-faq-title">
              <Reveal><p className="mint5-eyebrow">JUST THE ANSWERS</p><h2 id="mint5-faq-title">Good to know.</h2></Reveal>
              <dl>
                <Reveal as="div"><dt>Do I need to photograph every meal?</dt><dd>No. You can search foods, create your own entries and reuse saved meals.</dd></Reveal>
                <Reveal as="div"><dt>Can I change my nutrition targets?</dt><dd>Yes. Review your starting estimates and adjust your goals in the app.</dd></Reveal>
                <Reveal as="div"><dt>Can I get my information back out?</dt><dd>Yes. Account settings include downloadable JSON and CSV exports.</dd></Reveal>
                <Reveal as="div"><dt>Where do I sign in?</dt><dd>Use the member sign in link. New accounts are managed through invitations while registration is configured.</dd></Reveal>
              </dl>
            </section>

            <Reveal as="section" className="mint5-last" >
              <p className="mint5-eyebrow">READY WHEN YOU ARE</p>
              <h2>A clearer way to track.</h2>
              <Link to="/login" className="mint5-button">Member sign in <ArrowRight size={17} aria-hidden="true" /></Link>
            </Reveal>
          </main>
        </div>
      </div>

      <footer className="mint5-footer">
        <Logo />
        <p>Photo-based meal suggestions and energy targets are estimates. Review portions and values before saving.</p>
        <nav aria-label="Legal and account"><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link><Link to="/login">Sign in</Link></nav>
      </footer>
    </div>
  );
}
