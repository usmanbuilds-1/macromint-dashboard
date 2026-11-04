import { Link } from "react-router-dom";
import { Logo } from "@/components/app/AppLayout";

const heroMeal = "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1500&q=85";
const breakfastMeal = "https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=900&q=85";
const leafPhoto = "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=1200&q=80";

const macros = [
  { name: "Protein", value: 112, target: 150 },
  { name: "Carbs", value: 176, target: 225 },
  { name: "Fat", value: 48, target: 70 },
];

function ExampleNutrition({ small = false }: { small?: boolean }) {
  return (
    <div className={`ref-example ${small ? "ref-example--small" : ""}`} aria-label="Illustrative sample day, not real user data">
      <div className="ref-example-header"><strong>Today</strong><span>Sample day</span></div>
      <p className="ref-example-date">Tuesday, Jan 28</p>
      <div className="ref-example-overview">
        <div className="ref-example-circle" role="img" aria-label="Example: 1482 of 2000 calories logged">
          <strong>1,482</strong><span>/ 2,000 kcal</span>
        </div>
        <div className="ref-example-macros">
          {macros.map(({ name, value, target }) => (
            <div key={name} className="ref-example-macro">
              <span>{name}<b>{value} g</b></span>
              <div><i style={{ width: `${(value / target) * 100}%` }} /></div>
            </div>
          ))}
        </div>
      </div>
      <span className="ref-example-cta">Log food</span>
      <div className="ref-example-meals">
        {[["Breakfast", "420 kcal"], ["Lunch", "520 kcal"], ["Dinner", "480 kcal"], ["Snacks", "62 kcal"]].map(([name, kcal]) => (
          <div key={name}><span>{name}</span><span>{kcal}</span></div>
        ))}
      </div>
      <p className="ref-example-note">Illustrative example. Your diary uses your own data.</p>
    </div>
  );
}

function ExampleWeight() {
  return (
    <div className="ref-weight-preview" aria-label="Illustrative example of a weight trend">
      <div className="ref-weight-head"><strong>Weight</strong><span>Example / 4 weeks</span></div>
      <div className="ref-weight-value">72.4 <small>kg</small></div>
      <svg viewBox="0 0 370 150" role="img" aria-label="Illustrative weight trend line over four weeks">
        <line x1="0" x2="370" y1="38" y2="38" stroke="#dbe7d9" />
        <line x1="0" x2="370" y1="76" y2="76" stroke="#dbe7d9" />
        <line x1="0" x2="370" y1="114" y2="114" stroke="#dbe7d9" />
        <path d="M 6 78 C 34 70, 48 92, 77 85 S 115 100, 149 94 S 190 96, 220 101 S 260 109, 289 117 S 335 126, 364 132" fill="none" stroke="#155e3d" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="364" cy="132" r="4" fill="#155e3d" />
      </svg>
      <div className="ref-weight-dates"><span>Jan 1</span><span>Jan 28</span></div>
      <small>Example only</small>
    </div>
  );
}

function Photo({ src, alt, className = "" }: { src: string; alt: string; className?: string }) {
  return <img src={src} alt={alt} className={className} loading="lazy" decoding="async" onError={(e) => {
    const img = e.currentTarget;
    if (img.dataset.fallback !== "true") {
      img.dataset.fallback = "true";
      img.src = "/images/meal-review-hq.webp";
    }
  }} />;
}

export function Landing() {
  return (
    <div className="ref-site">
      <a className="ref-skip" href="#ref-content">Skip to content</a>
      <header className="ref-header">
        <Link to="/" className="ref-logo" aria-label="Macro Mint home"><Logo /></Link>
        <nav aria-label="Main" className="ref-nav">
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
          <Link to="/privacy">Privacy</Link>
        </nav>
        <div className="ref-header-actions">
          <Link to="/login" className="ref-outline ref-login">Log in</Link>
          <Link to="/register" className="ref-primary ref-get-started">Get started</Link>
        </div>
      </header>

      <main id="ref-content">
        <section className="ref-hero" aria-labelledby="ref-hero-title">
          <div className="ref-hero-copy">
            <h1 id="ref-hero-title">A calmer way to<br />track nutrition.</h1>
            <p>Track meals, macros, weight and progress<br className="ref-desktop-break" /> without drowning in clutter.</p>
            <div className="ref-hero-actions">
              <Link to="/register" className="ref-primary">Start tracking</Link>
              <a href="#how-it-works" className="ref-outline">See how it works</a>
            </div>
            <span className="ref-private-beta">Early access is invitation only while account registration is being configured.</span>
          </div>
          <div className="ref-hero-media">
            <div className="ref-hero-photo">
              <Photo src={heroMeal} alt="Healthy plated salmon, quinoa and vegetables on a linen tabletop" className="ref-hero-img" />
            </div>
            <div className="ref-device" aria-label="Illustrative Macro Mint mobile diary screenshot">
              <div className="ref-device-bezel"><div className="ref-device-island" aria-hidden="true" />
                <div className="ref-device-brand">Macro Mint</div>
                <ExampleNutrition small />
                <div className="ref-device-nav" aria-hidden="true"><span>Today</span><span>Food</span><span>Progress</span><span>More</span></div>
              </div>
            </div>
          </div>
        </section>

        <div className="ref-proof" id="features" aria-label="What you can do with Macro Mint">
          {["Save meals", "Track macros", "Log weight", "Export your data", "Privacy controls"].map((item) => <span key={item}>{item}</span>)}
        </div>

        <section className="ref-how" id="how-it-works" aria-labelledby="ref-how-title">
          <p className="ref-kicker">HOW IT WORKS</p>
          <h2 id="ref-how-title">The daily loop.</h2>
          <p className="ref-section-intro">A simple routine that helps you stay consistent and make progress.</p>
          <div className="ref-how-steps">
            <article>
              <div className="ref-how-photo"><Photo src={breakfastMeal} alt="Breakfast bowl with fruit and grains" /></div>
              <div className="ref-how-caption"><span className="ref-step">01</span><div><h3>Log the meal.</h3><p>Search, scan or save your meals in seconds.</p></div></div>
            </article>
            <article>
              <div className="ref-how-nutrition"><ExampleNutrition small /></div>
              <div className="ref-how-caption"><span className="ref-step">02</span><div><h3>Understand the day.</h3><p>See your calories and macros update in real time.</p></div></div>
            </article>
            <article>
              <div className="ref-how-weight"><ExampleWeight /></div>
              <div className="ref-how-caption"><span className="ref-step">03</span><div><h3>See the trend.</h3><p>Track your weight and nutrition over time.</p></div></div>
            </article>
          </div>
        </section>

        <section className="ref-manifesto" aria-labelledby="ref-manifesto-heading">
          <div className="ref-manifesto-leaf" aria-hidden="true" style={{ backgroundImage: `url(${leafPhoto})` }} />
          <h2 id="ref-manifesto-heading">Built for real eating,<br />not perfect eating.</h2>
          <div className="ref-manifesto-values">
            <p>Your data stays readable</p><p>Progress without noise</p><p>Export when you want out</p>
          </div>
        </section>

        <section className="ref-bottom-cta" aria-labelledby="ref-cta-title">
          <div className="ref-bottom-photo" aria-hidden="true" style={{ backgroundImage: `url(${leafPhoto})` }} />
          <div className="ref-bottom-content">
            <h2 id="ref-cta-title">Track with<br />more clarity.</h2>
            <Link to="/register" className="ref-white-action">Start your diary</Link>
          </div>
        </section>
      </main>

      <footer className="ref-footer">
        <Link to="/" className="ref-footer-brand">Macro Mint</Link>
        <p>Photo-based food suggestions and targets are estimates. Review values before saving.</p>
        <nav aria-label="Footer"><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link><Link to="/login">Log in</Link></nav>
      </footer>
    </div>
  );
}
