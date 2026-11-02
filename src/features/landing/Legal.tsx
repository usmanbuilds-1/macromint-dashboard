import { Link } from "react-router-dom";
import { Logo } from "@/components/app/AppLayout";

export function LegalShell({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-2xl items-center px-5">
          <Link to="/"><Logo /></Link>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-5 py-12">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-xs text-muted-foreground">Last updated: {updated}</p>
        <div className="mt-8 flex flex-col gap-6 text-sm leading-relaxed text-muted-foreground [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:text-foreground [&_li]:ml-4 [&_li]:list-disc">
          {children}
        </div>
      </main>
    </div>
  );
}

export function Privacy() {
  return (
    <LegalShell title="Privacy policy" updated="November 2026">
      <p>
        Macromint collects the information needed to run a nutrition tracker: your account email, the
        measurements you enter, the foods and meals you log, and minimal technical records such as
        scan events (metadata only, never the photos themselves).
      </p>
      <h2>What we store</h2>
      <ul>
        <li>Account: email, name, hashed password managed by Supabase Auth. Passwords are never stored in application tables.</li>
        <li>Nutrition data: diary entries, custom foods, recipes, weight and water entries, goals.</li>
        <li>Scans: item labels, portions, confidence and timing for quality monitoring. Photographs are processed and discarded; they are not persisted.</li>
        <li>Consents: your analytics and advertising choices with timestamps.</li>
      </ul>
      <h2>Who can see your data</h2>
      <p>
        Only you. Every user-owned table is protected by row level security at the database level, so
        no other account, including through direct API calls, can read your records. Platform
        administrators can change your access status but cannot browse your diary contents through
        the product interface.
      </p>
      <h2>Advertising and analytics</h2>
      <p>
        Both are off by default and governed by your consent in Settings. Advertising funds the free
        tier; when personalised advertising is declined, ads are non-personalised where the provider
        supports it.
      </p>
      <h2>Your controls</h2>
      <p>
        Settings includes a full JSON export of your data and a delete-account action that removes
        your profile and every owned record through cascading deletion. A minimal trial-abuse ledger
        (email and dates) is retained after deletion to protect the platform from repeated trial abuse.
      </p>
      <h2>Honest scope</h2>
      <p>
        This policy describes intended behaviour of the deployed product. Compliance review for a
        specific jurisdiction (including data protection registration where required) is the
        operator's responsibility before commercial launch.
      </p>
    </LegalShell>
  );
}

export function Terms() {
  return (
    <LegalShell title="Terms of service" updated="November 2026">
      <h2>The service</h2>
      <p>
        Macromint is a nutrition tracking tool. It provides estimates, not medical advice. Calorie
        and nutrient targets are derived from standard equations and your own inputs; consult a
        qualified professional for medical or dietary decisions.
      </p>
      <h2>Access</h2>
      <p>
        New accounts receive a free trial whose length is shown at signup. Continued access after the
        trial requires an active subscription, a complimentary grant, or verified rewarded-ad access.
        Access is enforced server-side and may be modified by the platform administrator. We may
        suspend accounts that abuse the trial system, attempt unauthorised access, or breach these terms.
      </p>
      <h2>Payments</h2>
      <p>
        Subscriptions renew automatically until cancelled. Failed payments move the account to a
        payment-overdue state until resolved. Prices are shown before any charge, and access changes
        only after payment is verified by our payment provider's webhooks, never on the basis of a
        browser message.
      </p>
      <h2>Your content</h2>
      <p>
        Foods, recipes and diary entries you create remain yours. You grant us the limited right to
        store and process them to operate the service.
      </p>
      <h2>Liability</h2>
      <p>
        The service is provided as is. To the extent permitted by law, the operator is not liable for
        decisions made on the basis of nutritional estimates produced by the product.
      </p>
    </LegalShell>
  );
}

export function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-5 text-center">
      <Logo />
      <p className="text-4xl font-semibold tabular-nums tracking-tight">404</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        That page does not exist. The diary, however, still does.
      </p>
      <Link to="/today" className="text-sm font-medium text-primary underline underline-offset-4">
        Go to Today
      </Link>
    </div>
  );
}
