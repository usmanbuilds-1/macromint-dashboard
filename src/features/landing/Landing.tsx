import { Link } from "react-router-dom";
import { Logo } from "@/components/app/AppLayout";
import { Reveal } from "@/lib/motion";

const sampleMacros = [
  { name: "Protein", value: 96, target: 130 },
  { name: "Carbs", value: 148, target: 220 },
  { name: "Fat", value: 48, target: 70 },
];

function ProductPreview({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`mint6-product ${compact ? "mint6-product--compact" : ""}`} aria-label="Illustrative preview of the nutrition diary">
      <div className="mint6-product-top">
        <span className="mint6-overline">MACRO MINT / SAMPLE DAY</span>
        <span className="mint6-product-edition">DAILY VIEW</span>
      </div>
      <div className="mint6-product-title">
        <div><small>Tuesday's diary</small><strong>Today.</strong></div>
        <span>01 / 03</span>
      </div>
      <div className="mint6-energy">
        <div className="mint6-energy-main"><strong>1,430</strong><span>kcal logged</span></div>
        <div className="mint6-energy-detail"><span>Daily target</span><strong>2,100 kcal</strong><small>670 kcal remaining</small></div>
      </div>
      <div className="mint6-energy-track" role="img" aria-label="Example: 1430 of 2100 calories logged"><span /></div>
      <div className="mint6-macros">
        {sampleMacros.map((macro) => (
          <div className="mint6-macro" key={macro.name}>
            <div><span>{macro.name}</span><strong>{macro.value} <small>/ {macro.target} g</small></strong></div>
            <i><b style={{ width: `${Math.round((macro.value / macro.target) * 100)}%` }} /></i>
          </div>
        ))}
      </div>
      <div className="mint6-product-footer">
        <span>Food diary</span><span>3 meals logged</span>
      </div>
      <div className="mint6-meal-rows">
        <div><span>01</span><strong>Breakfast</strong><small>320 kcal</small></div>
        <div><span>02</span><strong>Lunch</strong><small>610 kcal</small></div>
        <div><span>03</span><strong>Dinner</strong><small>500 kcal</small></div>
      </div>
      <p className="mint6-example-note">Illustrative values, not a real person's diary.</p>
    </div>
  );
}

function WeightIllustration() {
  return (
    <div className="mint6-weight-illustration" aria-label="Illustrative weight logging trend">
      <div className="mint6-weight-top"><span>WEIGHT HISTORY / EXAMPLE</span><span>LAST 30 DAYS</span></div>
      <div className="mint6-weight-value"><strong>72.4</strong><span>kg</span></div>
      <svg viewBox="0 0 560 220" role="img" aria-label="Sample weight line varying over a month">
        <g stroke="#d2dacd" strokeWidth="1">
          <line x1="0" y1="45" x2="560" y2="45" />
          <line x1="0" y1="107" x2="560" y2="107" />
          <line x1="0" y1="170" x2="560" y2="170" />
        </g>
        <path d="M 3 51 C 58 46, 76 82, 119 76 S 198 125, 249 110 S 320 117, 359 140 S 450 141, 492 158 S 535 168, 557 176"
          fill="none" stroke="#125e3f" strokeWidth="3.5" strokeLinecap="round" />
        <circle cx="557" cy="176" r="7" fill="#125e3f" stroke="#f4f3ed" strokeWidth="4" />
      </svg>
      <div className="mint6-weight-bottom"><span>Day 1</span><span>Day 30</span></div>
      <p>See the longer view, not just today's number.</p>
    </div>
  );
}

const benefits = [
  { mark: "01", heading: "Food, without the friction.", copy: "Search for a food, save a favourite or review a meal photo. Then decide what belongs in your diary." },
  { mark: "02", heading: "Numbers with context.", copy: "Calories and macros stay close to the food that produced them. Unknown nutrient values aren't quietly turned into zeros." },
  { mark: "03", heading: "A record that stays yours.", copy: "Review your weight over time, change your targets and export your history when you want it." },
];

export function Landing() {
  return (
    <div className="mint6-site">
      <a className="mint6-skip" href="#main-content">Skip to content</a>
      <header className="mint6-header">
        <Link to="/" className="mint6-brand" aria-label="Macro Mint home"><Logo /></Link>
        <nav aria-label="Site navigation" className="mint6-nav">
          <a href="#approach">The approach</a>
          <a href="#inside">Inside the app</a>
          <a href="#questions">Questions</a>
        </nav>
        <Link to="/login" className="mint6-header-action">Member sign in</Link>
      </header>

      <main id="main-content">
        <section className="mint6-hero" aria-labelledby="mint6-hero-title">
          <div className="mint6-hero-copy">
            <p className="mint6-overline mint6-hero-eyebrow"><span className="mint6-tiny-circle" />A FOOD DIARY FOR REAL LIFE</p>
            <h1 id="mint6-hero-title">Eat well.<br />Know <em>why.</em></h1>
            <p className="mint6-hero-lede">The meals you eat. The numbers behind them. Your progress in one quieter, clearer place.</p>
            <div className="mint6-hero-actions">
              <Link to="/login" className="mint6-primary">Open your diary</Link>
              <a href="#inside" className="mint6-text-link">See what’s inside</a>
            </div>
            <p className="mint6-access">Existing members can sign in. New accounts are invitation only during setup.</p>
          </div>
          <div className="mint6-hero-visual">
            <div className="mint6-product-stage">
              <div className="mint6-stage-heading"><span>THE DAILY VIEW</span><span>MACRO MINT / 01</span></div>
              <div className="mint6-stage-ui"><ProductPreview /></div>
              <p className="mint6-stage-footnote">Your meals and the numbers behind them, together in one clear place.</p>
            </div>
          </div>
          <div className="mint6-hero-bottom"><span>YOUR DIARY / REIMAGINED</span><a href="#approach">SCROLL TO EXPLORE</a><span>001 — 006</span></div>
        </section>

        <section className="mint6-ticker" aria-label="Core product capabilities">
          {["Food diary", "Calories & macros", "Weight history", "Saved meals", "Data export"].map((item) =>
            <span key={item}>{item}</span>
          )}
        </section>

        <section className="mint6-manifesto" id="approach" aria-labelledby="mint6-manifesto-title">
          <Reveal>
            <span className="mint6-overline">01 / THE APPROACH</span>
            <h2 id="mint6-manifesto-title">Not another screen<br />full of <em>numbers.</em><br /><span>A better view of yours.</span></h2>
          </Reveal>
          <Reveal>
            <p>Nutrition tracking should answer a simple question: <strong>what's happening with the food I eat?</strong> Macro Mint gives the details enough room to make sense, without turning every meal into a project.</p>
          </Reveal>
        </section>

        <section className="mint6-process" id="inside" aria-labelledby="mint6-inside-title">
          <div className="mint6-process-heading">
            <Reveal>
              <span className="mint6-overline">02 / INSIDE MACRO MINT</span>
              <h2 id="mint6-inside-title">A good day starts<br />with a simple log.</h2>
            </Reveal>
            <p>Three things worth getting right. Nothing you don't need.</p>
          </div>
          <div className="mint6-process-grid">
            <Reveal as="article" className="mint6-process-food">
              <div className="mint6-process-photo mint6-type-poster">
                <p className="mint6-overline">01 / A BETTER WAY TO LOG</p>
                <strong>Find it.<br />Measure it.<br /><em>Move on.</em></strong>
                <div className="mint6-poster-bottom">
                  <span>SEARCH</span>
                  <span>SAVE</span>
                  <span>SCAN</span>
                </div>
              </div>
              <h3>Start with what you ate.</h3>
              <p>Search, save or scan. Pick the portion yourself before you add it.</p>
            </Reveal>
            <Reveal as="article" className="mint6-process-data" delay={100}>
              <div className="mint6-process-panel"><ProductPreview /></div>
              <h3>Understand the day.</h3>
              <p>Calories, macros and meals laid out so you can actually read them.</p>
            </Reveal>
          </div>
          <Reveal as="article" className="mint6-process-trend">
            <div className="mint6-trend-copy"><span className="mint6-overline">03 / THE LONG VIEW</span><h3>Progress is a pattern, not a single day.</h3><p>Record your weight and follow the trend without losing sight of what changed along the way.</p><Link to="/login" className="mint6-text-link">Go to your diary</Link></div>
            <WeightIllustration />
          </Reveal>
        </section>

        <section className="mint6-benefits" aria-labelledby="mint6-benefits-title">
          <div className="mint6-benefits-heading"><span className="mint6-overline">03 / MADE FOR THE EVERYDAY</span><h2 id="mint6-benefits-title">Useful by design.<br /><em>Not loud by default.</em></h2></div>
          <div className="mint6-benefits-rows">
            {benefits.map((item, index) =>
              <Reveal as="article" className="mint6-benefit" key={item.mark} delay={index * 70}>
                <span>{item.mark}</span><h3>{item.heading}</h3><p>{item.copy}</p>
              </Reveal>
            )}
          </div>
        </section>

        <section className="mint6-questions" id="questions" aria-labelledby="mint6-questions-title">
          <div><span className="mint6-overline">04 / A FEW GOOD QUESTIONS</span><h2 id="mint6-questions-title">The details matter.</h2></div>
          <dl>
            <div><dt>Do I have to photograph meals?</dt><dd>No. You can search foods, create your own entries or reuse saved meals. A photo is just another way to begin.</dd></div>
            <div><dt>Can I adjust my goals?</dt><dd>Yes. The initial targets are estimates you can review and change in Goals.</dd></div>
            <div><dt>What happens to my data?</dt><dd>Download your account information and diary history from Settings. Nutrition values from photos are estimates, so review them before saving.</dd></div>
            <div><dt>Can I join today?</dt><dd>Existing members can sign in. New beta invitations will be available once account registration is enabled.</dd></div>
          </dl>
        </section>

        <section className="mint6-finale" aria-labelledby="mint6-finale-title">
          <span className="mint6-overline">05 / MAKE SPACE FOR CLARITY</span>
          <h2 id="mint6-finale-title">Less guessing.<br /><em>More knowing.</em></h2>
          <div><p>Start with a meal. See the whole day.</p><Link to="/login" className="mint6-primary mint6-primary--light">Member sign in</Link></div>
        </section>
      </main>

      <footer className="mint6-footer">
        <Logo />
        <p>Nutrition estimates are a starting point, not a diagnosis. Review portions and values before saving.</p>
        <nav aria-label="Legal and account"><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link><Link to="/login">Sign in</Link></nav>
        <small>Copyright {new Date().getFullYear()} Macro Mint</small>
      </footer>
    </div>
  );
}
