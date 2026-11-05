import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useSession } from "@/context/Session";
import type { ReactNode } from "react";

export const Route = createFileRoute("/_app/admin")({
  component: AdminLayout,
});

/**
 * UI-only admin gate. Server-side admin role checks and RLS remain the
 * authorization boundary for every data read and mutation.
 */
export function AdminGate({ isAdmin, children }: { isAdmin: boolean; children: ReactNode }) {
  if (!isAdmin) {
    return (
      <section className="mx-auto w-full max-w-xl py-12" aria-labelledby="admin-denied-title">
        <h1 id="admin-denied-title" className="text-2xl font-semibold tracking-tight">
          Administrator access required
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          This area is only available to authorized Macro Mint administrators.
        </p>
        <a href="/today" className="mt-5 inline-flex min-h-11 items-center text-sm font-medium underline underline-offset-4">
          Return to Today
        </a>
      </section>
    );
  }
  return <>{children}</>;
}

// Do not mount admin pages or trigger their data hooks for ordinary users.
// The parent app route already checks session, onboarding and entitlement.
function AdminLayout() {
  const { loading, isAdmin } = useSession();
  if (loading) return null;
  return <AdminGate isAdmin={isAdmin}><Outlet /></AdminGate>;
}
