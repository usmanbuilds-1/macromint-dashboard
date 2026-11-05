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
        Macromint processes the information needed for nutrition tracking: your username or existing
        account email, measurements, foods and meals you enter, and minimal usage records.
        Username accounts use an internal sign-in identifier rather than a contact email.
      </p>
      <h2>What we store</h2>
      <ul>
        <li>Account: username or email, name, and password credentials managed by the authentication service. We do not store plaintext passwords in application tables.</li>
        <li>Nutrition data: diary entries, custom foods, recipes, weight and water entries, goals.</li>
        <li>Scans: request counts, confidence summaries and processing times. The photo is sent to the configured AI provider for analysis, but Macro Mint does not save the photo in its application database. The provider has its own data handling practices.</li>
        <li>Consents: your analytics and advertising choices with timestamps.</li>
      </ul>
      <h2>Who can see your data</h2>
      <p>
        Your personal diary records are protected by row level security, which restricts ordinary
        accounts to their own data. Authorized platform operations use higher privileges where
        necessary to run the service. The standard administrator interface manages account status,
        invitations and access rather than providing a diary browser.
      </p>
      <h2>Advertising and analytics</h2>
      <p>
        Paid advertising and rewarded access are not active in the current private beta.
        Settings may record your advertising preferences, but this does not mean an advertising
        provider is enabled. We will update these details before introducing advertisements.
      </p>
      <h2>Your controls</h2>
      <p>
        Settings includes a JSON export of your tracked data and an account-deletion control.
        Deletion removes the account and its associated diary and profile records. A limited
        trial-abuse record containing an account identifier and dates may be retained to prevent
        repeated free trials; it is not a recovery email address for username-only accounts.
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
        New accounts join by private invitation. Eligible accounts may receive a limited free
        trial, and the administrator can grant, suspend or revoke access. Payments and
        rewarded-ad access are unavailable during this private beta. Accounts that abuse access
        controls or violate these terms may be suspended.
      </p>
      <h2>Payments</h2>
      <p>
        Subscription checkout is not enabled in this release, and Macro Mint does not currently
        accept payments through the website. Any future paid service will present its actual
        price, renewal, cancellation and refund terms before a charge; access will not be granted
        based solely on a checkout redirect.
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
