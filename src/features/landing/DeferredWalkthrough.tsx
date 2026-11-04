/**
 * DEFERRED BY PRODUCT OWNER (2026-11-04).
 * The interactive public marketing walkthrough is intentionally NOT rendered
 * and must NOT be linked from the landing page.
 * Do not re-enable, mount, or promote this feature until the owner explicitly asks.
 * This preserves the existing demo implementation for later review.
 */
import { useState } from "react";
import { ArrowRight, Camera, Check, ChevronRight, Search } from "lucide-react";

const MEAL_PHOTO = "/images/meal-review-hq.webp";
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

export function DeferredWalkthrough() {
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

