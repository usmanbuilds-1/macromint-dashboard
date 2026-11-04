import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "./AuthShell";
import { backend, BackendError } from "@/lib/backend";
import { useSession } from "@/context/Session";
import { getRememberMe, setRememberMe } from "@/lib/auth/remember-me";
import { USERNAME_AUTH_ENABLED } from "@/lib/auth/username-config";

export function Login() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [remember, setRemember] = useState(getRememberMe());
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuthUser } = useSession();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      setRememberMe(remember);
      await backend.signIn(identifier.trim(), password);
      await setAuthUserAndGo();
    } catch (err) {
      toast.error(err instanceof BackendError ? err.message : "Sign in failed");
    } finally {
      setBusy(false);
    }
  };

  const setAuthUserAndGo = async () => {
    const user = await backend.getSessionUser();
    setAuthUser(user);
    const profile = user ? await backend.getProfile().catch(() => null) : null;
    navigate(profile?.onboardedAt ? (location.state?.from as string) ?? "/today" : "/onboarding", { replace: true });
  };

  return (
    <AuthShell title="Sign in" subtitle="Continue tracking with Macromint.">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="identifier">{USERNAME_AUTH_ENABLED ? "Username or existing account email" : "Email"}</Label>
          <Input id="identifier" type={USERNAME_AUTH_ENABLED ? "text" : "email"}
            autoCapitalize="none" spellCheck={false} required
            autoComplete="username" maxLength={254}
            value={identifier} onChange={(e) => setIdentifier(e.target.value)}
            placeholder={USERNAME_AUTH_ENABLED ? "Your username" : "you@example.com"} />
        </div>
        <div className="grid gap-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            {!USERNAME_AUTH_ENABLED && <Link to="/reset" className="text-xs text-muted-foreground underline underline-offset-2">Forgot?</Link>}
          </div>
          <Input id="password" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-muted-foreground">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)}
            className="h-4 w-4 accent-primary" />
          Keep me signed in on this device
        </label>
        <Button type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</Button>
        {USERNAME_AUTH_ENABLED && <p className="text-xs leading-5 text-muted-foreground">
          Username accounts do not receive password reset emails. Keep your password secure;
          if you lose access, contact the beta administrator for account recovery.
        </p>}
        <p className="text-center text-sm text-muted-foreground">
          New here?{" "}
          <Link to="/register" className="font-medium text-foreground underline underline-offset-2">Create an account</Link>
        </p>
      </form>
    </AuthShell>
  );
}
