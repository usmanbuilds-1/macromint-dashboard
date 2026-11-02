import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/context/Session";
import { backend } from "@/lib/backend";
import { formatDateShort, todayStr } from "@/lib/nutrition/datetime";

export function Upgrade() {
  const { entitlement, refresh, isAdmin } = useSession();
  const [busy, setBusy] = useState(false);

  const state = entitlement?.state ?? "trial_expired";
  const expiredTrial = entitlement && state === "trial_active" && entitlement.trialEndsAt.slice(0, 10) < todayStr();
  const heading = ["suspended", "revoked"].includes(state)
    ? "Your access has been suspended"
    : expiredTrial || state === "trial_expired"
      ? "Your free trial has ended"
      : state === "payment_overdue"
        ? "Your last payment failed"
        : "Choose how to continue";

  const watchAd = async () => {
    setBusy(true);
    try {
      // The backend decides: 501 NOT_CONFIGURED until a provider is set up.
      const { getSupabase, IS_SUPABASE_CONFIGURED } = await import("@/lib/supabase");
      if (!IS_SUPABASE_CONFIGURED) {
        toast.info("Rewarded access needs a configured ad provider and Supabase. See docs/MONETIZATION.md.");
        return;
      }
      const { error } = await getSupabase().functions.invoke("ad-reward", { body: { token: "pending-provider" } });
      if (error) {
        toast.info("Rewarded advertising is not available yet on this deployment.");
      } else {
        await refresh();
        toast.success("Access granted. Enjoy!");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-12">
        <h1 className="text-2xl font-semibold tracking-tight">{heading}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {entitlement
            ? `Status: ${state.replace(/_/g, " ")}${state === "trial_active" ? ` (until ${formatDateShort(entitlement.trialEndsAt.slice(0, 10))})` : ""}.`
            : "No entitlement record found for this account."}
        </p>

        <div className="mt-8 flex flex-col gap-3">
          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-semibold">Premium access</h2>
              <p className="text-sm text-muted-foreground">
                <span className="text-xl font-semibold text-foreground">$6</span> / month or <span className="text-xl font-semibold text-foreground">$54</span> / year
              </p>
            </div>
            <ul className="mt-3 flex flex-col gap-1.5 text-sm text-muted-foreground">
              <li>Unlimited food logging, recipes and AI meal scanning</li>
              <li>Full trends, adherence and weekly history</li>
              <li>Data export and account controls included</li>
            </ul>
            <Button className="mt-4 w-full" onClick={() => toast.info("Checkout opens once a payment provider is configured for your region (see docs/MONETIZATION.md).")}>
              Continue to checkout
            </Button>
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              Prices are configurable by the platform owner. No charge happens until payment is verified server-side.
            </p>
          </div>

          <div className="rounded-xl border bg-card p-5">
            <h2 className="text-sm font-semibold">Continue free with an ad</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Watch a rewarded advertisement to unlock access for a limited time. Daily limits apply.
            </p>
            <Button variant="outline" className="mt-3 w-full" onClick={() => void watchAd()} disabled={busy}>
              Watch a rewarded ad
            </Button>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between">
          <Link to="/today" className="text-sm text-muted-foreground underline underline-offset-2">Back</Link>
          <Button variant="ghost" size="sm" onClick={() => void refresh()} disabled={busy} className="gap-2">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh status
          </Button>
        </div>
        {isAdmin && (
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Administrators keep full access — open the{" "}
            <Link to="/admin" className="underline underline-offset-2">admin panel</Link>.
          </p>
        )}
      </div>
    </div>
  );
}
