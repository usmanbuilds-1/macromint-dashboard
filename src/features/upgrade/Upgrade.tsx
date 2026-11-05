import { Link } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/context/Session";
import { backend } from "@/lib/backend";
import { formatDateShort, todayStr } from "@/lib/nutrition/datetime";

export function Upgrade() {
  const { entitlement, refresh, isAdmin } = useSession();

  const state = entitlement?.state ?? "trial_expired";
  const expiredTrial = entitlement && state === "trial_active" && entitlement.trialEndsAt.slice(0, 10) < todayStr();
  const heading = ["suspended", "revoked"].includes(state)
    ? "Your access has been suspended"
    : expiredTrial || state === "trial_expired"
      ? "Your free trial has ended"
      : state === "payment_overdue"
        ? "Your last payment failed"
        : "Choose how to continue";


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
              <p className="text-sm text-muted-foreground">Unavailable during private beta</p>
            </div>
            <ul className="mt-3 flex flex-col gap-1.5 text-sm text-muted-foreground">
              <li>Food logging, recipes and AI meal scanning subject to usage limits</li>
              <li>Full trends, adherence and weekly history</li>
              <li>Data export and account controls included</li>
            </ul>
            <Button className="mt-4 w-full" disabled>
              Payment checkout not available yet
            </Button>
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              No payment provider is configured. Ask the beta administrator about access.
            </p>
          </div>


        </div>

        <div className="mt-8 flex items-center justify-between">
          <Link to="/today" className="text-sm text-muted-foreground underline underline-offset-2">Back</Link>
          <Button variant="ghost" size="sm" onClick={() => void refresh()} className="gap-2">
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
