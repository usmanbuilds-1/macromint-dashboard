import { useRef, useState } from "react";
import { toast } from "sonner";
import { readNutritionLabel } from "@/lib/scan/nutrition-label-client";
import type { LabelResult } from "../../../supabase/functions/ai-scan/nutrition-label";

export function NutritionLabelImport({ onReview }: {
  onReview: (result:LabelResult) => void;
}) {
  const input=useRef<HTMLInputElement>(null);
  const [result,setResult]=useState<LabelResult|null>(null);
  const [busy,setBusy]=useState(false);
  const read=async (file?:File)=>{
    if(!file||busy)return;
    setBusy(true);setResult(null);
    try {setResult(await readNutritionLabel(file));}
    catch(e) {toast.error(e instanceof Error?e.message:"Could not read label.");}
    finally {setBusy(false);if(input.current)input.current.value="";}
  };
  return (
    <details className="border-b pb-3 text-sm">
      <summary className="flex min-h-11 cursor-pointer items-center font-semibold">
        Read nutrition facts from a photo
      </summary>
      <p className="mb-3 text-xs leading-5 text-muted-foreground">
        Optional. The image is sent to the configured AI provider using your scan quota.
        Nothing is saved until you check the numbers and create the food.
      </p>
      <input ref={input} type="file" accept="image/*" capture="environment"
        className="sr-only" aria-label="Nutrition label photo"
        onChange={(e)=>{void read(e.target.files?.[0]);}} />
      <button type="button" disabled={busy} className="min-h-11 rounded border px-3 text-sm font-semibold"
        onClick={()=>input.current?.click()}>
        {busy?"Reading nutrition panel…":"Choose label photo"}
      </button>
      {result && (
        <div className="mt-3 space-y-2 border-t pt-3" aria-label="Recognized nutrition facts">
          <p className="font-semibold">{result.name||"Food name not detected"}</p>
          <p className="text-xs text-muted-foreground">
            Basis: {result.basis==="per100g"?"per 100 g":result.basis==="perServing"?"per serving":
              result.basis==="per100ml"?"per 100 mL":"unknown"}.
            {result.servingGrams?" Serving "+result.servingGrams+" g.":""}
          </p>
          <dl className="grid grid-cols-2 gap-2 text-xs">
            {(["kcal","protein","carbs","fat","fiber","sugar","sodiumMg"] as const).map((key)=>(
              <div key={key}><dt className="text-muted-foreground">{key==="sodiumMg"?"Sodium (mg)":key}</dt>
                <dd className="font-semibold tabular-nums">{result.observed[key]??"—"}</dd></div>
            ))}
          </dl>
          {result.warnings.map((text,i)=><p key={i} className="text-xs text-muted-foreground">{text}</p>)}
          {result.per100g ? (
            <button type="button" className="min-h-11 rounded bg-primary px-3 text-sm font-semibold text-primary-foreground"
              onClick={()=>onReview(result)}>Review these values in the form</button>
          ) : (
            <p className="text-xs font-semibold">The label cannot be converted safely to grams. Enter values manually.</p>
          )}
        </div>
      )}
    </details>
  );
}
