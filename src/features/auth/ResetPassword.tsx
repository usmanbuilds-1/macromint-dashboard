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
import { USERNAME_AUTH_ENABLED } from "@/lib/auth/username-config";
import { isValidUsername } from "@/lib/auth/username";

export function ResetPassword() {
  const { user } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [username, setUsername] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [legacyEmailRecovery, setLegacyEmailRecovery] = useState(false);

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

  if (USERNAME_AUTH_ENABLED && !legacyEmailRecovery) {
    return (
      <AuthShell title="Recover your account" subtitle="Use one of the backup codes you saved during signup. No email address is needed.">
        <form className="grid gap-4" onSubmit={async (event) => {
          event.preventDefault();
          if (!isValidUsername(username)) {
            toast.error("Enter a valid username");
            return;
          }
          if (newPassword.length < 12) {
            toast.error("The new password must contain at least 12 characters");
            return;
          }
          setBusy(true);
          try {
            await backend.recoverUsernamePassword(username.trim(), recoveryCode.trim(), newPassword);
            setRecoveryCode("");
            setNewPassword("");
            toast.success("Password updated. Sign in with your new password.");
            navigate("/login", { replace: true });
          } catch (error) {
            toast.error(error instanceof BackendError ? error.message : "Account recovery failed");
          } finally {
            setBusy(false);
          }
        }}>
          <div className="grid gap-1.5">
            <Label htmlFor="recovery-username">Username</Label>
            <Input id="recovery-username" autoComplete="username" autoCapitalize="none"
              spellCheck={false} maxLength={20} required value={username}
              onChange={event => setUsername(event.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="recovery-code">Unused recovery code</Label>
            <Input id="recovery-code" autoComplete="off" spellCheck={false}
              className="font-mono text-xs" required value={recoveryCode}
              onChange={event => setRecoveryCode(event.target.value)} placeholder="MMR-XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="recovery-new-password">New password</Label>
            <Input id="recovery-new-password" type="password" required minLength={12}
              autoComplete="new-password" value={newPassword}
              onChange={event => setNewPassword(event.target.value)} />
          </div>
          <Button type="submit" disabled={busy}>{busy ? "Updating password…" : "Reset password"}</Button>
          <p className="text-xs leading-5 text-muted-foreground">
            Each backup code works once. If you lost all codes, contact the beta
            administrator to discuss identity verification; automatic recovery is not possible.
          </p>
        </form>
        <div className="mt-5 flex flex-col gap-3 text-sm">
          <button type="button" className="text-left underline underline-offset-4"
            onClick={() => setLegacyEmailRecovery(true)}>
            Recover an existing email-based administrator account
          </button>
          <Link className="underline underline-offset-4" to="/login">Back to sign in</Link>
        </div>
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
