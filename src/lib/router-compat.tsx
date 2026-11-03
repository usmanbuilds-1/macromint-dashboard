// Router compatibility shim: the ported feature modules were written against
// react-router-dom. This module re-implements the small API surface they use
// on top of TanStack Router, and vite/vitest alias "react-router-dom" here —
// so the original screens run unmodified.
import * as React from "react";
import {
  Link as TanStackLink,
  Outlet as TanStackOutlet,
  useNavigate as useTanStackNavigate,
  useLocation as useTanStackLocation,
} from "@tanstack/react-router";

// ── Link ────────────────────────────────────────────────────────────────────
export function Link({ to, ...rest }: { to: string } & Record<string, unknown>) {
  return <TanStackLink to={to as never} {...rest} />;
}

// ── NavLink (supports react-router's functional className) ──────────────────
type NavLinkClassName = string | ((arg: { isActive: boolean; isPending?: boolean; isTransitioning?: boolean }) => string | undefined);

export function NavLink({
  to,
  className,
  children,
  ...rest
}: {
  to: string;
  className?: NavLinkClassName;
  children: React.ReactNode;
} & Record<string, unknown>) {
  const location = useLocation();
  const isActive =
    to === "/" ? location.pathname === "/" : location.pathname === to || location.pathname.startsWith(`${to}/`);
  const resolved = typeof className === "function" ? className({ isActive }) : className;
  return (
    <TanStackLink to={to as never} className={resolved} {...rest}>
      {children}
    </TanStackLink>
  );
}

// ── useNavigate (path strings + optional { replace, state }, history deltas) ─
export function useNavigate(): (
  toOrDelta: number | string,
  opts?: { replace?: boolean; state?: unknown },
) => void {
  const navigate = useTanStackNavigate();
  return React.useCallback(
    (toOrDelta, opts) => {
      if (typeof toOrDelta === "number") {
        if (toOrDelta !== 0) window.history.go(toOrDelta);
        return;
      }
      void navigate({
        to: toOrDelta,
        replace: opts?.replace,
        state: opts?.state,
      } as never);
    },
    [navigate],
  );
}

// ── useLocation (react-router shape: string search, state, pathname) ────────
export function useLocation() {
  const location = useTanStackLocation();
  return {
    pathname: location.pathname,
    search: location.searchStr,
    hash: location.hash ?? "",
    state: (location.state ?? null) as unknown as { from?: string } | null,
    key: "",
  };
}

// ── Outlet ──────────────────────────────────────────────────────────────────
export const Outlet = TanStackOutlet;
