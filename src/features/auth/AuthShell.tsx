import { Link } from "react-router-dom";
import { Logo } from "@/components/app/AppLayout";
import { IS_DEMO } from "@/lib/backend";
import { FlaskConical } from "lucide-react";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-5 py-12">
        <Link to="/" className="mb-10 inline-flex w-fit">
          <Logo />
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
        <div className="mt-8">{children}</div>
      </div>
      <footer className="px-5 pb-6 text-center">
        {IS_DEMO ? (
          <p className="mx-auto flex w-fit items-center gap-1.5 rounded-md border border-warning/30 bg-warning/10 px-2.5 py-1.5 text-[11px] font-medium text-warning">
            <FlaskConical className="h-3.5 w-3.5" />
            Demo mode: any email signs in to a local sample account
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            By continuing you agree to the <Link to="/terms" className="underline underline-offset-2">Terms</Link> and{" "}
            <Link to="/privacy" className="underline underline-offset-2">Privacy Policy</Link>.
          </p>
        )}
      </footer>
    </div>
  );
}
