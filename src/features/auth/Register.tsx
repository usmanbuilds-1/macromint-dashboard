import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "./AuthShell";
import { backend, BackendError, IS_DEMO } from "@/lib/backend";
import { useSession } from "@/context/Session";
import { INVITE_REGISTRATION_ENABLED, PUBLIC_REGISTRATION_ENABLED } from "@/lib/beta/config";
import { isValidInviteCode } from "@/lib/beta/invite-code";
import { USERNAME_AUTH_ENABLED, USERNAME_MIN_PASSWORD_LENGTH } from "@/lib/auth/username-config";
import { isValidUsername } from "@/lib/auth/username";

export function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  // First collect the single-use invitation, then create permanent credentials.
  // Public signup uses the same account screen but needs no invitation.
  const [signupStep, setSignupStep] = useState<"invitation" | "account">(
    INVITE_REGISTRATION_ENABLED && !IS_DEMO ? "invitation" : "account",
  );
  const [isBetaTester, setIsBetaTester] = useState(false);
  const [busy, setBusy] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const navigate = useNavigate();
  const { setAuthUser } = useSession();

  const continueWithInvitation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidInviteCode(inviteCode)) {
      toast.error("Enter a valid beta invitation code");
      return;
    }
    // Format check only. The server validates and atomically redeems the
    // invitation when the account is created, never on this first screen.
    setIsBetaTester(true);
    setSignupStep("account");
  };

  const continueWithoutInvitation = () => {
    setIsBetaTester(false);
    setInviteCode("");
    setSignupStep("account");
  };

  const returnToInvitation = () => {
    setSignupStep("invitation");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!USERNAME_AUTH_ENABLED || (!INVITE_REGISTRATION_ENABLED && !PUBLIC_REGISTRATION_ENABLED)) && !IS_DEMO) {
      toast.error("New account registration is temporarily unavailable.");
      return;
    }
    if (!name.trim() || name.trim().length < 2) {
      toast.error("Enter your name");
      return;
    }
    if (!IS_DEMO && isBetaTester && !isValidInviteCode(inviteCode)) {
      toast.error("Enter your beta invitation code");
      setSignupStep("invitation");
      return;
    }
    if (!IS_DEMO && !isBetaTester && !PUBLIC_REGISTRATION_ENABLED) {
      toast.error("An invitation is required");
      setSignupStep("invitation");
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
        password, name.trim(), isBetaTester ? inviteCode.trim() : "",
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
    return;
  };

  if (recoveryCodes) {
    return (
      <AuthShell title="Save your recovery codes" subtitle="These codes are shown once. Keep them somewhere private and offline. Each code works only once.">
        <div className="grid gap-4">
          <p className="text-sm leading-6 text-muted-foreground">
            Your account was created as <strong>@{username.trim().toLowerCase()}</strong>.
            No recovery email is collected. These codes are the self-service method to reset your password.
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


  if ((!USERNAME_AUTH_ENABLED || (!INVITE_REGISTRATION_ENABLED && !PUBLIC_REGISTRATION_ENABLED)) && !IS_DEMO) {
    return (
      <AuthShell title="Registration unavailable" subtitle="New account registration is temporarily unavailable while secure sign-in is being configured.">
        <div className="flex flex-col gap-5">
          <p className="text-sm leading-6 text-muted-foreground">
            Already have an account? You can still sign in. New registrations will reopen after security checks.
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

  if (signupStep === "invitation" && INVITE_REGISTRATION_ENABLED && !IS_DEMO) {
    return (
      <AuthShell title="Enter your beta invitation"
        subtitle="Have a beta code? Enter it here to begin. You'll set up your account on the next screen.">
        <form onSubmit={continueWithInvitation} className="flex flex-col gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="invite">Beta invitation code</Label>
            <Input id="invite" required autoFocus autoComplete="off" spellCheck={false}
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""))}
              placeholder="MM-..." className="font-mono text-sm tracking-wide" maxLength={43} />
            <p className="text-xs leading-5 text-muted-foreground">
              One code per tester. Your invitation is checked securely when you create your account.
            </p>
          </div>
          <Button type="submit">Continue</Button>
          {PUBLIC_REGISTRATION_ENABLED && (
            <button type="button" className="min-h-11 text-sm font-medium underline underline-offset-4"
              onClick={continueWithoutInvitation}>
              Don't have a code? Create a regular account
            </button>
          )}
          <p className="text-center text-sm text-muted-foreground">
            Already registered?{" "}
            <Link to="/login" className="font-medium text-foreground underline underline-offset-2">
              Sign in
            </Link>
          </p>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell title={isBetaTester ? "Set up your beta account" : "Create your account"}
      subtitle={isBetaTester
        ? "Your beta code will be verified when you create your account. Choose a username and password to sign in later."
        : "Choose a username and a strong password to start your regular free trial."}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        {INVITE_REGISTRATION_ENABLED && !IS_DEMO && (
          <div className="border-b pb-4">
            <p className="text-xs font-medium text-muted-foreground">
              {isBetaTester ? "Beta tester invitation selected" : "Regular account · No invitation needed"}
            </p>
            <button type="button" disabled={busy}
              className="mt-2 min-h-9 text-sm font-medium underline underline-offset-4"
              onClick={returnToInvitation}>
              {isBetaTester ? "Change invitation code" : "Use a beta invitation instead"}
            </button>
          </div>
        )}
        <div className="grid gap-1.5">
          <Label htmlFor="name">Name</Label>
          <Input id="name" required maxLength={100} autoComplete="name"
            value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
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
          <Input id="password" type="password" required
            minLength={USERNAME_AUTH_ENABLED ? USERNAME_MIN_PASSWORD_LENGTH : 8}
            autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <p className="text-xs text-muted-foreground">
            At least {USERNAME_AUTH_ENABLED ? USERNAME_MIN_PASSWORD_LENGTH : 8} characters.
            {USERNAME_AUTH_ENABLED && " No email-based password recovery is available."}
          </p>
        </div>
        <Button type="submit" disabled={busy}>{busy ? "Creating account…" : "Create account"}</Button>
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-foreground underline underline-offset-2">Sign in</Link>
        </p>
      </form>
    </AuthShell>
  );
}
