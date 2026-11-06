import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { backend } from "@/lib/backend";

// Session.tsx creates the auth context at module scope, so a hot-swapped copy
// would leave the mounted provider on the old context while new consumers read
// the new one ("useSession must be used inside SessionProvider"). Any edit to
// this file therefore forces a full page reload instead of a hot swap.
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    window.location.reload();
  });
}
import type { GoalSet, Profile, Entitlement } from "@/types";
import type { SessionUser } from "@/lib/backend/types";

interface SessionState {
  loading: boolean;
  user: SessionUser | null;
  profile: Profile | null;
  goals: GoalSet | null;
  entitlement: Entitlement | null;
  isAdmin: boolean;
  /** Client-side mirror of the SQL has_access(): UI routing only. The
   *  database re-checks every operation server-side. */
  hasAccess: boolean;
  refresh: () => Promise<void>;
  setAuthUser: (user: SessionUser | null) => void;
}

const SessionContext = createContext<SessionState | null>(null);

export function hasAccessClient(entitlement: Entitlement | null): boolean {
  if (!entitlement || ["revoked","suspended","trial_expired","payment_overdue"].includes(entitlement.state)) return false;
  if (["paid_active", "complimentary"].includes(entitlement.state)) return true;
  if (entitlement.state === "trial_active" && new Date(entitlement.trialEndsAt).getTime() >= Date.now()) return true;
  if (entitlement.accessUntil && new Date(entitlement.accessUntil).getTime() > Date.now()) return true;
  return false;
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [goals, setGoals] = useState<GoalSet | null>(null);
  const [entitlement, setEntitlement] = useState<Entitlement | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  // An already-active tracking session is signed out when access is lost.
  // An expired user may subsequently sign back in for account-only functions.
  const trackedUser = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    const current = await backend.getSessionUser();
    setUser(current);
    if (!current) {
      trackedUser.current = null;
      setProfile(null);
      setGoals(null);
      setEntitlement(null);
      setIsAdmin(false);
      return;
    }
    const [p, g, e, a] = await Promise.all([
      backend.getProfile().catch(() => null),
      backend.getGoals().catch(() => null),
      backend.getEntitlement().catch(() => undefined),
      backend.amIAdmin().catch(() => false),
    ]);
    if (!a && trackedUser.current === current.id && e !== undefined && !hasAccessClient(e)) {
      // Server RLS independently blocks requests made with stale JWTs.
      trackedUser.current = null;
      await backend.signOut().catch(() => undefined);
      setUser(null);
      setProfile(null);
      setGoals(null);
      setEntitlement(null);
      setIsAdmin(false);
      return;
    }
    if (e !== undefined && hasAccessClient(e)) trackedUser.current = current.id;
    setProfile(p);
    setGoals(g);
    if (e !== undefined) setEntitlement(e);
    setIsAdmin(a);
  }, []);

  useEffect(() => {
    let mounted = true;
    const unsubscribe = backend.onAuthChange((u) => {
      if (!mounted) return;
      if (!u) {
        trackedUser.current = null;
        setUser(null);
        setProfile(null);
        setGoals(null);
        setEntitlement(null);
        setIsAdmin(false);
        setLoading(false);
        return;
      }
      setLoading(true);
      void refresh().finally(() => mounted && setLoading(false));
    });
    void refresh().finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [refresh]);

  // Catch expiry/revocation on tabs that stay open without navigation.
  useEffect(() => {
    const poll = () => { void refresh().catch(() => undefined); };
    const interval = window.setInterval(poll, 45_000);
    window.addEventListener("focus", poll);
    const onVisibility = () => { if (!document.hidden) poll(); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", poll);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refresh]);

  const setAuthUser = useCallback(
    (u: SessionUser | null) => {
      setUser(u);
      if (!u) {
        setProfile(null);
        setGoals(null);
        setEntitlement(null);
        setIsAdmin(false);
      }
    },
    [],
  );

  const value = useMemo<SessionState>(
    () => ({
      loading,
      user,
      profile,
      goals,
      entitlement,
      isAdmin,
      hasAccess: hasAccessClient(entitlement),
      refresh,
      setAuthUser,
    }),
    [loading, user, profile, goals, entitlement, isAdmin, refresh, setAuthUser],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}
