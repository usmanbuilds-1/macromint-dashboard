import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "./AuthShell";
import { backend, BackendError } from "@/lib/backend";
import { useSession } from "@/context/Session";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuthUser } = useSession();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await backend.signIn(email.trim(), password);
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
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </div>
        <div className="grid gap-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link to="/reset" className="text-xs text-muted-foreground underline underline-offset-2">Forgot?</Link>
          </div>
          <Input id="password" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</Button>
        <p className="text-center text-sm text-muted-foreground">
          New here?{" "}
          <Link to="/register" className="font-medium text-foreground underline underline-offset-2">Create an account</Link>
        </p>
      </form>
    </AuthShell>
  );
}
