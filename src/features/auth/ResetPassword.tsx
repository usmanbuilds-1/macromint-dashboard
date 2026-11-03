import { useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { useSession } from "@/context/Session";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "./AuthShell";
import { backend, BackendError, IS_DEMO } from "@/lib/backend";

export function ResetPassword() {
  const { user } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await backend.requestPasswordReset(email.trim());
      setSent(true);
    } catch (err) {
      toast.error(err instanceof BackendError ? err.message : "Could not send the reset email");
    } finally {
      setBusy(false);
    }
  };

  if (!IS_DEMO && user && new URLSearchParams(location.search).get("change") === "1") {
    return (
      <AuthShell title="Choose a new password" subtitle="Use at least eight characters.">
        <form
          className="grid gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              const { error } = await getSupabase().auth.updateUser({ password });
              if (error) throw error;
              toast.success("Password updated");
              navigate("/today", { replace: true });
            } catch {
              toast.error("Could not update your password. Please request a fresh link.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <Label htmlFor="new-password">New password</Label>
          <Input
            id="new-password"
            type="password"
            minLength={8}
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button disabled={busy}>Save password</Button>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={sent ? "Check your inbox" : "Reset your password"}
      subtitle={
        sent
          ? `If an account exists for ${email}, a reset link is on its way.`
          : "Enter your email and we will send a reset link."
      }
    >
      {IS_DEMO && !sent && (
        <p className="mb-4 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
          Demo mode: password emails are simulated.
        </p>
      )}
      {!sent ? (
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={busy}>
            {busy ? "Sending…" : "Send reset link"}
          </Button>
        </form>
      ) : (
        <Button onClick={() => setSent(false)} variant="outline">
          Use a different email
        </Button>
      )}
      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link to="/login" className="underline underline-offset-2">
          Back to sign in
        </Link>
      </p>
    </AuthShell>
  );
}
