import { lazy, Suspense } from "react";
import "@/styles/internal-polish.css";
import "@/styles/journey-foundations.css";
import "@/styles/journey-tracking.css";
import "@/styles/journey-density.css";
import "@/styles/journey-task-first.css";
import "@/styles/journey-account.css";
import "@/styles/journey-impeccable.css";
import { Logo } from "./BrandMark";
export { Logo } from "./BrandMark";
import { publicAccountLabel } from "@/lib/auth/username";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  CalendarDays,
  Apple,
  ChartLine,
  Target,
  Settings as SettingsIcon,
  ShieldCheck,
  Home,
  LogOut,
  Menu,
  FlaskConical,
} from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useSession } from "@/context/Session";
import { backend, IS_DEMO } from "@/lib/backend";
import { FoodLogProvider } from "@/features/foods/FoodLogProvider";
import { useAppDataInvalidation } from "@/hooks/useAppDataInvalidation";
import { usePrimaryRoutePreload } from "@/hooks/usePrimaryRoutePreload";
import { useTodayWarmup } from "@/hooks/useTodayWarmup";

// Food dialogs are expensive relative to the shell. Load only when the
// user opens them; keep the four routes usable without vision code.
const FoodSearchDialog = lazy(() =>
  import("@/features/foods/FoodSearchDialog").then((m) => ({ default: m.FoodSearchDialog }))
);
const ServingConfigHost = lazy(() =>
  import("@/features/foods/ServingConfigHost").then((m) => ({ default: m.ServingConfigHost }))
);
const ScanDialog = lazy(() =>
  import("@/features/scan/ScanDialog").then((m) => ({ default: m.ScanDialog }))
);
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/today", label: "Today", icon: Home },
  { to: "/diary", label: "Diary", icon: CalendarDays },
  { to: "/foods", label: "Foods", icon: Apple },
  { to: "/trends", label: "Progress", icon: ChartLine },
];

// Reuse the same familiar icons as the desktop sidebar so navigation
// stays recognizable across screen sizes without a new icon dependency.
const MOBILE_NAV = NAV;

const SECONDARY = [
  { to: "/goals", label: "Goals", icon: Target },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
];

function NavItem({ to, label, icon: Icon, onClick }: { to: string; label: string; icon: typeof Home; onClick?: () => void }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          "mm-app-navitem flex items-center gap-3 border-l-2 border-transparent px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
          isActive && "border-primary text-foreground font-semibold",
        )
      }
    >
      <Icon className="h-4 w-4" />
      {label}
    </NavLink>
  );
}

export function AppLayout() {
  const { profile, isAdmin, setAuthUser } = useSession();
  useAppDataInvalidation();
  usePrimaryRoutePreload();
  useTodayWarmup();
  const navigate = useNavigate();

  const signOut = async () => {
    await backend.signOut();
    setAuthUser(null);
    navigate("/");
  };

  return (
    <FoodLogProvider
      renderSearch={(p) => p.open ? (
        <Suspense fallback={null}>
          <FoodSearchDialog open={p.open} onClose={p.onClose} target={p.target}
            onPicked={(food) => p.onPicked(food)} />
        </Suspense>
      ) : null}
      renderServing={(p) => (p.food || p.target?.editEntryId) ? (
        <Suspense fallback={null}>
          <ServingConfigHost food={p.food} target={p.target} onClose={p.onClose} />
        </Suspense>
      ) : null}
      renderScan={(p) => p.open ? (
        <Suspense fallback={null}>
          <ScanDialog open={p.open} target={p.target} onClose={p.onClose} />
        </Suspense>
      ) : null}
    >
    <div className="mm-app-shell flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col justify-between border-r px-5 py-8 md:flex">
        <div>
          <div className="px-3">
            <Logo />
          </div>
          <nav className="mt-8 flex flex-col gap-1" aria-label="Primary">
            {NAV.map((n) => (
              <NavItem key={n.to} {...n} />
            ))}
            <Separator className="my-2" />
            {SECONDARY.map((n) => (
              <NavItem key={n.to} {...n} />
            ))}
            {isAdmin && (
              <>
                <Separator className="my-2" />
                <NavItem to="/admin" label="Admin" icon={ShieldCheck} />
              </>
            )}
          </nav>
        </div>
        <div className="px-1">
          {IS_DEMO && (
            <div className="mb-3 flex items-center gap-1.5 rounded-md border border-warning/30 bg-warning/10 px-2.5 py-1.5 text-[11px] font-medium text-warning">
              <FlaskConical className="h-3.5 w-3.5" />
              Demo mode with sample data
            </div>
          )}
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{profile?.name || "You"}</p>
              <p className="truncate text-xs text-muted-foreground">{publicAccountLabel(profile ?? {})}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-40 flex items-center justify-between border-b bg-background px-4 py-3 md:hidden">
          <Logo />
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-11 w-11" aria-label="More and settings">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <nav className="mt-6 flex flex-col gap-1" aria-label="Menu">
                {NAV.map((n) => (
                  <NavItem key={n.to} {...n} />
                ))}
                <Separator className="my-2" />
                {SECONDARY.map((n) => (
                  <NavItem key={n.to} {...n} />
                ))}
                {isAdmin && (
                  <>
                    <Separator className="my-2" />
                    <NavItem to="/admin" label="Admin" icon={ShieldCheck} />
                  </>
                )}
              </nav>
              <Separator className="my-4" />
              {IS_DEMO && <p className="px-3 pb-3 text-xs text-warning">Demo mode with sample data</p>}
              <Button variant="outline" className="w-full justify-start gap-2" onClick={signOut}>
                <LogOut className="h-4 w-4" /> Sign out
              </Button>
            </SheetContent>
          </Sheet>
        </header>

        <main className="mm-app-main mx-auto w-full max-w-3xl flex-1 px-5 pb-24 pt-7 md:px-9 md:pb-12 md:pt-10">
          <Outlet />
        </main>

        {/* The four daily destinations stay available on every mobile screen.
            Settings and account actions are in the always-present header menu. */}
        <nav className="ref-mobile-tabs fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t bg-background pb-[env(safe-area-inset-bottom)] md:hidden" aria-label="Primary">
          {MOBILE_NAV.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.to} to={item.to} className={({ isActive }) =>
                cn("ref-mobile-tab", isActive && "ref-mobile-tab--active")
              }>
                <Icon aria-hidden="true" className="ref-mobile-tab-icon" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>
    </div>
    </FoodLogProvider>
  );
}
