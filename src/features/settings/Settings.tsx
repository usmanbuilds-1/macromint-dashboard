import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Download, FlaskConical, ShieldCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useSession } from "@/context/Session";
import { backend, bumpData, IS_DEMO } from "@/lib/backend";
import type { Units } from "@/types";
import { LIMITS, validateNumeric } from "@/lib/validation/limits";
import { estimateWeightTimeline } from "@/lib/weight/timeline";
import { diaryExportCsv, weightExportCsv } from "@/lib/export/csv";
import { publicAccountLabel } from "@/lib/auth/username";

export function Settings() {
  const { profile, isAdmin, refresh, setAuthUser } = useSession();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [targetWeightKg, setTargetWeightKg] = useState("");
  const [busy, setBusy] = useState(false);
  const [prefs, setPrefs] = useState({ adConsent: false, analyticsConsent: false });

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setHeightCm(profile.heightCm ? String(profile.heightCm) : "");
      setWeightKg(profile.weightKg ? String(profile.weightKg) : "");
      setTargetWeightKg(profile.targetWeightKg ? String(profile.targetWeightKg) : "");
    }
    void backend.getPreferences().then((p) => {
      setPrefs({ adConsent: p.adConsent, analyticsConsent: p.analyticsConsent });
    }).catch(() => undefined);
  }, [profile]);

  const saveProfile = async () => {
    setBusy(true);
    try {
      const patch: Record<string, unknown> = { name: name.trim().slice(0, 100) };
      for (const [raw, key, label] of [
        [heightCm, "heightCm", "Height"],
        [weightKg, "weightKg", "Current weight"],
        [targetWeightKg, "weightKg", "Target weight"],
      ] as const) {
        if (!raw.trim()) continue;
        const result = validateNumeric(raw, key, label);
        if ("error" in result) { toast.error(result.error); return; }
      }
      if (heightCm.trim()) patch["heightCm"] = Number(heightCm);
      if (weightKg.trim()) patch["weightKg"] = Number(weightKg);
      patch["targetWeightKg"] = targetWeightKg.trim() ? Number(targetWeightKg) : null;
      if (profile?.objective && profile.heightCm != null && profile.weightKg != null &&
          targetWeightKg.trim()) {
        const assessment = estimateWeightTimeline({
          currentKg: weightKg.trim() ? Number(weightKg) : profile.weightKg,
          targetKg: Number(targetWeightKg),
          heightCm: heightCm.trim() ? Number(heightCm) : profile.heightCm,
          objective: profile.objective,
        });
        if (["review_target", "objective_mismatch", "invalid_input"].includes(assessment.status)) {
          toast.error(assessment.note); return;
        }
      }
      await backend.updateProfile(patch);
      await refresh();
      bumpData();
      toast.success("Profile updated");
    } catch {
      toast.error("Could not update profile");
    } finally {
      setBusy(false);
    }
  };

  const setUnits = async (units: Units) => {
    if (!profile || profile.units === units) return;
    await backend.updateProfile({ units });
    await refresh();
    bumpData();
    toast.success(`Switched to ${units} units. Values are converted, records stay intact.`);
  };

  const exportData = async () => {
    try {
      const data = await backend.exportAllData();
      downloadFile(`macromint-export-${new Date().toISOString().slice(0, 10)}.json`,
        JSON.stringify(data, null, 2), "application/json");
      toast.success("Account export downloaded");
    } catch {
      toast.error("Export failed. No incomplete file was downloaded. Try again.");
    }
  };

  const exportCsv = async (kind: "diary" | "weight") => {
    try {
      const data = await backend.exportAllData();
      const text = kind === "diary" ? diaryExportCsv(data) : weightExportCsv(data);
      downloadFile(`macromint-${kind}-${new Date().toISOString().slice(0, 10)}.csv`,
        "\uFEFF" + text, "text/csv;charset=utf-8");
      toast.success(`${kind === "diary" ? "Diary" : "Weight"} CSV downloaded`);
    } catch {
      toast.error("CSV export failed. No partial file was downloaded.");
    }
  };

  const deleteAccount = async () => {
    try {
      await backend.deleteAccount();
      setAuthUser(null);
      toast.success("Account deleted. Limited trial-abuse records may be retained as explained in our Privacy Policy.");
      navigate("/");
    } catch {
      toast.error("Account deletion failed. Try again or contact support.");
    }
  };

  const setConsent = async (kind: "advertising" | "analytics", granted: boolean) => {
    setPrefs((p) => ({ ...p, [kind === "advertising" ? "adConsent" : "analyticsConsent"]: granted }));
    await backend.savePreferences(kind === "advertising" ? { adConsent: granted } : { analyticsConsent: granted });
    await backend.setConsent(kind, "1.0").catch(() => undefined);
  };

  return (
    <div className="mm6-subpage mm6-page-settings ref-live-settings flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">More</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">{publicAccountLabel(profile ?? {})}</p>
      </header>

      <nav aria-label="Settings sections" className="ref-settings-links">
        <a href="#ref-profile">My account <span>Manage your profile</span></a>
        <button type="button" onClick={() => navigate("/goals")}>Goals <span>Calorie and macro targets</span></button>
        <a href="#ref-export">Exports <span>Download your data</span></a>
        <a href="#ref-privacy">Privacy <span>Your preferences and consent</span></a>
      </nav>

      {IS_DEMO && (
        <section className="rounded-xl border border-warning/30 bg-warning/10 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold text-warning">
                <FlaskConical className="h-4 w-4" /> Demo mode
              </h2>
              <p className="mt-1 text-xs text-warning/90">
                This instance runs without a Supabase project. Data lives in this browser only.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await demoReset();
                toast.success("Demo data reset");
              }}
            >
              Reset demo data
            </Button>
          </div>
        </section>
      )}

      <section id="ref-profile" className="border-b pb-6" aria-label="Profile">
        <h2 className="text-sm font-semibold">Profile</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="grid gap-1.5">
            <Label htmlFor="s-name">Name</Label>
            <Input id="s-name" maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="s-height">Height (cm)</Label>
            <Input id="s-height" type="number" min={LIMITS.heightCm.min} max={LIMITS.heightCm.max} step="any" inputMode="decimal" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="s-weight">Current weight (kg)</Label>
            <Input id="s-weight" type="number" min={LIMITS.weightKg.min} max={LIMITS.weightKg.max} step="any" inputMode="decimal" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} />
          </div>
                    <div className="grid gap-1.5">
            <Label htmlFor="s-target-weight">Target weight (kg, optional)</Label>
            <Input id="s-target-weight" type="number" min={LIMITS.weightKg.min} max={LIMITS.weightKg.max}
              step="any" inputMode="decimal" value={targetWeightKg}
              onChange={(e) => setTargetWeightKg(e.target.value)} placeholder="Your goal" />
          </div>
        </div>
        <div className="mt-4">
          <Button onClick={saveProfile} disabled={busy}>{busy ? "Saving…" : "Save profile"}</Button>
        </div>
      </section>

      <section className="border-b pb-6" aria-label="Units">
        <h2 className="text-sm font-semibold">Measurement system</h2>
        <p className="mt-1 text-xs text-muted-foreground">Changing units converts your profile values; history stays accurate.</p>
        <div className="mt-4 flex gap-2">
          {(["metric", "imperial"] as Units[]).map((u) => (
            <Button key={u} variant={profile?.units === u ? "default" : "outline"} onClick={() => void setUnits(u)} className="capitalize">
              {u}
            </Button>
          ))}
        </div>
      </section>

      <section id="ref-privacy" className="border-b pb-6" aria-label="Privacy">
        <h2 className="text-sm font-semibold">Privacy</h2>
        <div className="mt-4 flex flex-col gap-4">
          <ConsentRow
            title="Analytics"
            description="Optional product usage analytics. Review the privacy policy for what is collected and how it is handled."
            checked={prefs.analyticsConsent}
            onChange={(v) => void setConsent("analytics", v)}
          />
          <ConsentRow
            title="Personalised advertising"
            description="Advertising preferences are saved here. Rewarded ads and personalised advertising are not currently enabled."
            checked={prefs.adConsent}
            onChange={(v) => void setConsent("advertising", v)}
          />
        </div>
      </section>

      <section id="ref-export" className="border-b pb-6" aria-label="Account">
        <h2 className="text-sm font-semibold">Account</h2>
        <div className="mt-4 flex flex-col gap-3">
          <Button variant="outline" className="min-h-11 justify-start gap-2" onClick={() => void exportData()}>
            <Download className="h-4 w-4" /> Export all account data (JSON)
          </Button>
          <Button variant="outline" className="min-h-11 justify-start gap-2" onClick={() => void exportCsv("diary")}>
            <Download className="h-4 w-4" /> Export food diary (CSV)
          </Button>
          <Button variant="outline" className="min-h-11 justify-start gap-2" onClick={() => void exportCsv("weight")}>
            <Download className="h-4 w-4" /> Export weight log (CSV)
          </Button>
          {isAdmin && (
            <Button variant="outline" className="min-h-11 justify-start gap-2" onClick={() => navigate("/admin")}>
              <ShieldCheck className="h-4 w-4" /> Open admin panel
            </Button>
          )}
          <Separator />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" className="min-h-11 justify-start gap-2 self-start text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4" /> Delete account and all data
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently removes your profile, diary, recipes, measurements and preferences. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep my account</AlertDialogCancel>
                <AlertDialogAction onClick={() => void deleteAccount()} className="bg-destructive text-white hover:bg-destructive/90">
                  Delete everything
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </section>
    </div>
  );
}

function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const element = document.createElement("a");
  try {
    element.href = url;
    element.download = filename;
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
  } finally {
    element.remove();
    // Browser downloads need a moment to access the object URL.
    window.setTimeout(() => URL.revokeObjectURL(url), 1200);
  }
}

async function demoReset() {
  const demo = backend as unknown as { resetDemoData?: () => Promise<void> };
  if (demo.resetDemoData) await demo.resetDemoData();
  window.location.reload();
}

function ConsentRow({ title, description, checked, onChange }: { title: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={title} />
    </div>
  );
}
