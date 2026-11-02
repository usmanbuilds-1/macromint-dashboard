import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AuthShell } from "./AuthShell";
import { backend, IS_DEMO } from "@/lib/backend";
import { useSession } from "@/context/Session";

export function VerifyEmail() {
  const email = (useLocation().state as { email?: string } | null)?.email ?? "";
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const { setAuthUser } = useSession();

  const checkVerified = async () => {
    setBusy(true);
    try {
      const user = await backend.getSessionUser();
      setAuthUser(user);
      if (user?.emailVerified) {
        navigate("/onboarding", { replace: true });
      } else {
        toast.info("Not verified yet. Click the link in your inbox, then check again.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Verify your email" subtitle={email ? `We sent a verification link to ${email}.` : "We sent a verification link to your inbox."}>
      <div className="flex flex-col gap-4">
        {IS_DEMO && (
          <p className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
            Demo mode: verification is skipped.
          </p>
        )}
        <Button onClick={checkVerified} disabled={busy}>
          {busy ? "Checking…" : "I have verified — continue"}
        </Button>
        <Button variant="outline" onClick={() => void backend.resendVerification().catch(() => toast.error("Could not resend"))}>
          Resend the email
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          <Link to="/login" className="underline underline-offset-2">Back to sign in</Link>
        </p>
      </div>
    </AuthShell>
  );
}
