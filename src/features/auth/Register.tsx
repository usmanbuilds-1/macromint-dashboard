import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "./AuthShell";
import { backend, BackendError, IS_DEMO } from "@/lib/backend";
import { useSession } from "@/context/Session";
import { INVITE_REGISTRATION_ENABLED } from "@/lib/beta/config";
import { USERNAME_AUTH_ENABLED, USERNAME_MIN_PASSWORD_LENGTH } from "@/lib/auth/username-config";
import { isValidUsername } from "@/lib/auth/username";

export function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const navigate = useNavigate();
  const { setAuthUser } = useSession();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (recoveryCodes) {
    return (
      <AuthShell title="Save your recovery codes" subtitle="These codes are shown once. Keep them somewhere private and offline. Each code works only once.">
        <div className="grid gap-4">
          <p className="text-sm leading-6 text-muted-foreground">
            Your account was created as <strong>@{username.trim().toLowerCase()}</strong>.
            There is no recovery email. These codes are the only self-service method to reset a forgotten password.
          </p>
          <div className="max-h-64 overflow-auto rounded-md border bg-muted/30 p-3 font-mono text-xs leading-8" aria-label="One-time account recovery codes">
            {recoveryCodes.map((code, index) => <div className="select-all" key={code}>{index + 1}. {code}</div>)}
          </div>
          <Button type="button" variant="outline" onClick={() => {
            void navigator.clipboard.writeText(recoveryCodes.join("\n"))
              .then(() => toast.success("Recovery codes copied"))
              .catch(() => toast.error("Copy unavailable. Save the codes manually."));
          }}>Copy recovery codes</Button>
          <label className="flex items-start gap-2 text-sm leading-6">
            <input type="checkbox" className="mt-1.5 accent-primary" checked={acknowledged}
              onChange={event => setAcknowledged(event.target.checked)} />
            I have saved these recovery codes somewhere secure.
          </label>
          <Button disabled={!acknowledged || busy} onClick={() => {
            setBusy(true);
            void backend.signIn(username.trim(), password)
              .then(async () => {
                const user = await backend.getSessionUser();
                setAuthUser(user);
                setRecoveryCodes(null);
                setPassword("");
                navigate("/onboarding", { replace: true });
              })
              .catch(() => toast.error("Account created, but sign-in failed. Save your codes and sign in manually."))
              .finally(() => setBusy(false));
          }}>{busy ? "Signing in…" : "Continue to onboarding"}</Button>
        </div>
      </AuthShell>
    );
  }

  if (!INVITE_REGISTRATION_ENABLED && !IS_DEMO) {
      toast.error("New account invitations are temporarily unavailable.");
      return;
    }
    if (!name.trim() || name.trim().length < 2) {
      toast.error("Enter your name");
      return;
    }
    if (!/^MM-[A-F0-9]{40}$/i.test(inviteCode.trim()) && !IS_DEMO) {
      toast.error("Enter your beta invitation code");
      return;
    }
    if (USERNAME_AUTH_ENABLED && !isValidUsername(username)) {
      toast.error("Username must be 3–20 letters, numbers, or underscores");
      return;
    }
    if (password.length < (USERNAME_AUTH_ENABLED ? USERNAME_MIN_PASSWORD_LENGTH : 8)) {
      toast.error(`Password must be at least ${USERNAME_AUTH_ENABLED ? USERNAME_MIN_PASSWORD_LENGTH : 8} characters`);
      return;
    }
    setBusy(true);
    try {
      const { needsVerification, recoveryCodes: issuedCodes } = await backend.signUp(
        USERNAME_AUTH_ENABLED ? username.trim() : email.trim(),
        password, name.trim(), inviteCode.trim(),
      );
      if (USERNAME_AUTH_ENABLED && !IS_DEMO) {
        if (!issuedCodes?.length) {
          toast.error("Account recovery is not configured. Contact your beta administrator.");
          return;
        }
        setRecoveryCodes(issuedCodes);
        setAcknowledged(false);
        return;
      }
      if (needsVerification && !IS_DEMO) {
        navigate("/verify", { state: { email: email.trim() } });
        return;
      }
      const user = await backend.getSessionUser();
      setAuthUser(user);
      navigate("/onboarding", { replace: true });
    } catch (err) {
      toast.error(err instanceof BackendError ? err.message : "Registration failed");
    } finally {
      setBusy(false);
    }
  };

  if (!INVITE_REGISTRATION_ENABLED && !IS_DEMO) {
    return (
      <AuthShell title="Invitation access" subtitle="Macromint is live. New account invitations are temporarily unavailable while account sign-in is configured.">
        <div className="flex flex-col gap-5">
          <p className="text-sm leading-6 text-muted-foreground">
            Already a member? Use your existing account to sign in. New beta invitations are managed separately by the administrator.
          </p>
          <Link className="inline-flex min-h-12 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground" to="/">
            Back to Macromint
          </Link>
          <Link to="/login" className="inline-flex min-h-11 items-center justify-center text-sm font-medium underline underline-offset-4">
            Existing member? Sign in
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Join the private beta" subtitle={USERNAME_AUTH_ENABLED
      ? "Choose a username and a strong password. No email address is required."
      : "Enter your name and personal invitation. Add an email and password so you can securely return to your diary."}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="invite">Invitation code</Label>
          <Input id="invite" required={!IS_DEMO} autoComplete="off" spellCheck={false}
            value={inviteCode} onChange={(e) => setInviteCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""))}
            placeholder="MM-..." className="font-mono text-sm tracking-wide" maxLength={43} />
          <p className="text-xs text-muted-foreground">Codes are single-use. Contact the beta administrator if you need access.</p>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="name">Name</Label>
          <Input id="name" required maxLength={100} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
        </div>
        {USERNAME_AUTH_ENABLED ? (
          <div className="grid gap-1.5">
            <Label htmlFor="username">Username</Label>
            <Input id="username" type="text" required autoComplete="username" maxLength={20}
              autoCapitalize="none" spellCheck={false}
              value={username} onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. alex_mint" aria-describedby="username-help" />
            <p id="username-help" className="text-xs leading-5 text-muted-foreground">
              3–20 letters, numbers, or underscores. No email is collected.
            </p>
          </div>
        ) : (
          <div className="grid gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required autoComplete="email"
              value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
        )}
        <div className="grid gap-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" required minLength={USERNAME_AUTH_ENABLED ? USERNAME_MIN_PASSWORD_LENGTH : 8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <p className="text-xs text-muted-foreground">
            At least {USERNAME_AUTH_ENABLED ? USERNAME_MIN_PASSWORD_LENGTH : 8} characters.
            {USERNAME_AUTH_ENABLED && " Email-based password recovery is unavailable for username accounts."}
          </p>
        </div>
        <Button type="submit" disabled={busy}>{busy ? "Creating account…" : "Create beta account"}</Button>
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-foreground underline underline-offset-2">Sign in</Link>
        </p>
      </form>
    </AuthShell>
  );
}
