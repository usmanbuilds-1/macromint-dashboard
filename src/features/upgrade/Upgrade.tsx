import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSession } from "@/context/Session";
import { backend } from "@/lib/backend";
import type { ReactivationRequest } from "@/lib/backend/types";
import { toast } from "sonner";
import "./upgrade.css";

function downloadJson(value: Record<string, unknown>): void {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `macromint-export-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }
}

export function Upgrade() {
  const { user, entitlement, refresh, hasAccess, isAdmin } = useSession();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<ReactivationRequest[]>([]);
  const [isBetaTester, setIsBetaTester] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<"request" | "export" | "delete" | "logout" | null>(null);

  useEffect(() => {
    if (!user) return;
    void backend.getReactivationRequests()
      .then((value) => { setRequests(value.requests); setIsBetaTester(value.isBetaTester); })
      .catch(() => undefined);
  }, [user?.id]);

  const sendRequest = async () => {
    setBusy("request");
    try {
      await backend.submitReactivationRequest(note.trim());
      setRequests((await backend.getReactivationRequests()).requests);
      setNote("");
      toast.success("Your request was sent to the beta owner.");
    } catch {
      toast.error("Could not send your request. You may already have a pending request.");
    } finally {
      setBusy(null);
    }
  };
  const exportData = async () => {
    setBusy("export");
    try {
      const data = await backend.exportAllData();
      downloadJson(data);
      toast.success("Your account export was downloaded.");
    } catch {
      toast.error("Complete export unavailable. No partial file was downloaded.");
    } finally {
      setBusy(null);
    }
  };
  const removeAccount = async () => {
    if (!window.confirm("Permanently delete your Macro Mint account and tracked data? This cannot be undone. Limited trial-abuse records may be retained as described in the Privacy Policy.")) return;
    setBusy("delete");
    try {
      await backend.deleteAccount();
      await backend.signOut().catch(() => undefined);
      navigate("/login", { replace: true });
      toast.success("Account deleted. Limited trial-abuse records may be retained.");
    } catch {
      toast.error("Could not delete the account. Contact support.");
    } finally {
      setBusy(null);
    }
  };
  const signOut = async () => {
    setBusy("logout");
    try {
      await backend.signOut();
      navigate("/login", { replace: true });
    } finally {
      setBusy(null);
    }
  };

  const status = entitlement?.state ?? "trial_expired";
  const heading = status === "revoked" || status === "suspended"
    ? "Account access is paused" : "Your free trial has ended";
  const latest = requests[0];
  const pending = requests.some((request) => request.status === "pending");

  return (
    <main className="mm-restricted min-h-screen bg-background px-5 py-12">
      <div className="mm-restricted-inner mx-auto max-w-lg">
        <p className="mm-restricted-eyebrow">MACRO MINT / ACCOUNT</p>
        <h1 className="mm-restricted-title mt-5 text-3xl font-semibold tracking-tight">{hasAccess ? "Your account is active" : heading}</h1>
        <p className="mm-restricted-description mt-3 text-sm leading-6 text-muted-foreground">
          {hasAccess
            ? "Your access has been restored. You can return to your food diary."
            : "Food logging and AI scans are unavailable. Your account and saved data have not been deleted."}
        </p>

        {user ? (
          <div className="mm-restricted-body mt-9 space-y-8">
            {hasAccess && <Button onClick={() => navigate("/today")} className="w-full">Return to tracking</Button>}
            {isAdmin && <Link to="/admin" className="block text-sm font-medium underline underline-offset-4">Open Owner Admin</Link>}

            {!hasAccess && isBetaTester && (
              <section className="mm-restricted-section space-y-3 border-t pt-6">
                <h2 className="mm-restricted-section-heading">Request more beta testing time</h2>
                <p className="text-sm text-muted-foreground">
                  The owner reviews every request. Submitting one does not extend your trial.
                </p>
                {latest && <p className="text-sm">Latest request: <strong>{latest.status}</strong></p>}
                {!pending && (
                  <>
                    <Input value={note} onChange={(event) => setNote(event.target.value)}
                      maxLength={500} placeholder="Why do you need more time? (optional)"
                      aria-label="Extension request message" />
                    <Button disabled={busy !== null} onClick={() => void sendRequest()}>
                      {busy === "request" ? "Sending…" : "Request extension"}
                    </Button>
                  </>
                )}
                {pending && <p className="text-sm text-muted-foreground">Your request is waiting for an owner decision.</p>}
              </section>
            )}

            {!hasAccess && !isBetaTester && !isAdmin && (
              <p className="mt-5 text-sm text-muted-foreground">
                Regular accounts cannot request beta tester extensions.
                Payment checkout is not yet available. Your saved data remains accessible below.
              </p>
            )}
            <section className="mm-restricted-section space-y-3 border-t pt-6">
              <h2 className="mm-restricted-section-heading">Your data</h2>
              <p className="text-sm text-muted-foreground">
                Download your own account data only when you choose to. Exporting does not reactivate tracking.
              </p>
              <Button variant="outline" disabled={busy !== null} onClick={() => void exportData()}>
                {busy === "export" ? "Preparing export…" : "Download my data (JSON)"}
              </Button>
            </section>

            <section className="mm-restricted-section space-y-3 border-t pt-6">
              <h2 className="mm-restricted-section-heading">Account controls</h2>
              <Button variant="outline" disabled={busy !== null} onClick={() => void signOut()}>
                Sign out
              </Button>
              <div>
                <Button variant="destructive" disabled={busy !== null} onClick={() => void removeAccount()}>
                  Permanently delete my account
                </Button>
              </div>
            </section>
            <Button variant="ghost" onClick={() => void refresh()}>Refresh access status</Button>
          </div>
        ) : (
          <div className="mt-9 space-y-4">
            <p className="text-sm text-muted-foreground">
              You're signed out. Sign in to request more beta time or export your saved data.
            </p>
            <Link to="/login" className="inline-flex min-h-11 items-center font-medium underline underline-offset-4">
              Sign in to account controls
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
