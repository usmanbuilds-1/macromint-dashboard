import { createFileRoute, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppLayout } from "@/components/app/AppLayout";
import { useSession } from "@/context/Session";

export const Route = createFileRoute("/_app")({
  component: AppShell,
});

/** Spinner shown while the session loads (and while a redirect is pending). */
function ShellGate() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    </div>
  );
}

/** Client-side mirror of the original RequireApp gating: requires a signed-in
 *  user, a completed onboarding and active access. The database re-checks
 *  every operation server-side. */
function AppShell() {
  const { loading, user, profile, hasAccess } = useSession();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/login", state: { from: location.pathname }, replace: true });
      return;
    }
    if (profile && !profile.onboardedAt) {
      navigate({ to: "/onboarding", replace: true });
      return;
    }
    if (profile && !hasAccess) {
      navigate({ to: "/upgrade", replace: true });
    }
  }, [loading, user, profile, hasAccess, location.pathname, navigate]);

  if (loading || !user) return <ShellGate />;
  if (!profile) return <ShellGate />;
  if (!profile.onboardedAt || !hasAccess) return <ShellGate />;

  // AppLayout renders <Outlet /> itself (it was ported as a react-router layout).
  return <AppLayout />;
}
