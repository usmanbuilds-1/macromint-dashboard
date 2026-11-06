import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LIMITS, validateNumeric } from "@/lib/validation/limits";
import { backend, bumpData } from "@/lib/backend";
import { useMobileDialogViewport } from "@/hooks/useMobileDialogViewport";

const MACRO_INPUTS = [
  { key: "kcal", label: "Calories (kcal)" },
  { key: "protein", label: "Protein (g)" },
  { key: "carbs", label: "Carbohydrates (g)" },
  { key: "fat", label: "Fat (g)" },
  { key: "fiber", label: "Fiber (g, optional)" },
  { key: "sugar", label: "Sugars (g, optional)" },
  { key: "sodium", label: "Sodium (mg, optional)" },
] as const;


export function CustomFoodDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (food: Awaited<ReturnType<typeof backend.createCustomFood>>) => void }) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const sheetStyle = useMobileDialogViewport(open);
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!name.trim()) {
      toast.error("Give the food a name");
      return;
    }
    if (name.trim().length > 120 || brand.trim().length > 120) {
      toast.error("Food name and brand must be under 120 characters");
      return;
    }
    const kcalResult = validateNumeric(values["kcal"] ?? "", "foodKcalPer100g", "Calories");
    if ("error" in kcalResult) { toast.error(kcalResult.error); return; }
    const optionalKeys = ["protein", "carbs", "fat", "fiber", "sugar", "sodium"] as const;
    for (const key of optionalKeys) {
      const raw = values[key];
      if (raw === undefined || raw.trim() === "") continue;
      const result = validateNumeric(raw, key === "sodium" ? "foodSodiumMgPer100g" : "foodMacroPer100g", key);
      if ("error" in result) { toast.error(result.error); return; }
    }
    const kcal = kcalResult.value;
    setBusy(true);
    try {
      const per100g: Record<string, number | null> = {
        kcal,
        protein: values["protein"]?.trim() ? Number(values["protein"]) : null,
        carbs: values["carbs"]?.trim() ? Number(values["carbs"]) : null,
        fat: values["fat"]?.trim() ? Number(values["fat"]) : null,
        fiber: values["fiber"] ? Number(values["fiber"]) : null,
        sugar: values["sugar"] ? Number(values["sugar"]) : null,
        sodium: values["sodium"] ? Number(values["sodium"]) : null,
      };
      const food = await backend.createCustomFood({
        name: name.trim(),
        brand: brand.trim() || null,
        per100g,
        servingLabel: "100 g",
        servingGrams: 100,
      });
      bumpData();
      toast.success("Custom food created");
      onClose();
      onCreated(food);
    } catch {
      toast.error("Could not create the food");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? onClose() : undefined)}>
      <DialogContent ref={sheetRef}
        className="mm-journey-custom-dialog max-h-[calc(100dvh-1rem)] overflow-y-auto sm:max-w-md"
        style={sheetStyle}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          sheetRef.current?.focus({ preventScroll: true });
        }}
        onCloseAutoFocus={(event) => event.preventDefault()}>
        <DialogHeader>
          <DialogTitle>New custom food</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="cf-name">Name</Label>
              <Input id="cf-name" maxLength={120} value={name} onChange={(e) => setName(e.target.value)} placeholder="Mum's biryani" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="cf-brand">Brand (optional)</Label>
              <Input id="cf-brand" maxLength={120} value={brand} onChange={(e) => setBrand(e.target.value)} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Values per 100 g. Convert liquid labels that use 100 ml into a gram basis before entering them. Leave optional fields empty if unknown — Macromint never invents values.</p>
          <div className="grid grid-cols-2 gap-3">
            {MACRO_INPUTS.map((m) => (
              <div key={m.key} className="grid gap-1.5">
                <Label htmlFor={`cf-${m.key}`}>{m.label}</Label>
                <Input
                  id={`cf-${m.key}`}
                  type="number" min={0}
                  max={m.key === "kcal" ? LIMITS.foodKcalPer100g.max : m.key === "sodium" ? LIMITS.foodSodiumMgPer100g.max : LIMITS.foodMacroPer100g.max}
                  step="any" inputMode="decimal"
                  value={values[m.key] ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [m.key]: e.target.value }))}
                />
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>{busy ? "Saving…" : "Create and log"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
