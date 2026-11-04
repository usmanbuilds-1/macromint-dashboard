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
import { useDataVersion } from "@/hooks/useData";
import { FoodLogProvider } from "@/features/foods/FoodLogProvider";
import { FoodSearchDialog } from "@/features/foods/FoodSearchDialog";
import { ServingConfigHost } from "@/features/foods/ServingConfigHost";
import { ScanDialog } from "@/features/scan/ScanDialog";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/today", label: "Today", icon: Home },
  { to: "/diary", label: "Diary", icon: CalendarDays },
  { to: "/foods", label: "Foods", icon: Apple },
  { to: "/trends", label: "Trends", icon: ChartLine },
];

const SECONDARY = [
  { to: "/goals", label: "Goals", icon: Target },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
];

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="mm-logo inline-flex items-center gap-2.5">
      <span className="mm-logo-leaves" aria-hidden="true">
        <span className="mm-logo-leaf mm-logo-leaf--left" />
        <span className="mm-logo-leaf mm-logo-leaf--right" />
      </span>
      {!compact && <span className="mm-logo-name">Macro Mint</span>}
    </span>
  );
}

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
  const navigate = useNavigate();
  useDataVersion();

  const signOut = async () => {
    await backend.signOut();
    setAuthUser(null);
    navigate("/");
  };

  return (
    <FoodLogProvider
      renderSearch={(p) => (
        <FoodSearchDialog
          open={p.open}
          onClose={p.onClose}
          target={p.target}
          onPicked={(food) => p.onPicked(food)}
        />
      )}
      renderServing={(p) => <ServingConfigHost food={p.food} target={p.target} onClose={p.onClose} />}
      renderScan={(p) => <ScanDialog open={p.open} target={p.target} onClose={p.onClose} />}
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
              <Button variant="ghost" size="icon" aria-label="Menu">
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

        {/* Mobile bottom nav */}
        <nav
          className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t bg-background pb-[env(safe-area-inset-bottom)] md:hidden"
          aria-label="Primary"
        >
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                cn(
                  "flex min-h-[52px] flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground",
                  isActive && "text-primary",
                )
              }
            >
              <n.icon className="h-[18px] w-[18px]" />
              {n.label}
            </NavLink>
          ))}
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              cn(
                "flex min-h-[52px] flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground",
                isActive && "text-primary",
              )
            }
          >
            <SettingsIcon className="h-[18px] w-[18px]" />
            More
          </NavLink>
        </nav>
      </div>
    </div>
    </FoodLogProvider>
  );
}
