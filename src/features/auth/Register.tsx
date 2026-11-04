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

export function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const { setAuthUser } = useSession();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
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
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setBusy(true);
    try {
      const { needsVerification } = await backend.signUp(email.trim(), password, name.trim(), inviteCode.trim());
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
    <AuthShell title="Join the private beta" subtitle="Enter your name and personal invitation. Add an email and password so you can securely return to your diary.">
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
          <Input id="name" required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <p className="text-xs text-muted-foreground">At least 8 characters.</p>
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
