import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { backend } from "@/lib/backend";
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
  if (!entitlement) return false;
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

  const refresh = useCallback(async () => {
    const current = await backend.getSessionUser();
    setUser(current);
    if (!current) {
      setProfile(null);
      setGoals(null);
      setEntitlement(null);
      setIsAdmin(false);
      return;
    }
    const [p, g, e, a] = await Promise.all([
      backend.getProfile().catch(() => null),
      backend.getGoals().catch(() => null),
      backend.getEntitlement().catch(() => null),
      backend.amIAdmin().catch(() => false),
    ]);
    setProfile(p);
    setGoals(g);
    setEntitlement(e);
    setIsAdmin(a);
  }, []);

  useEffect(() => {
    let mounted = true;
    const unsubscribe = backend.onAuthChange((u) => {
      if (!mounted) return;
      if (!u) {
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
