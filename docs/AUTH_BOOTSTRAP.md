# Macromint authentication bootstrap — Lovable Cloud Supabase

Checked 3 Nov 2026 using read-only project database introspection: the connected Lovable Cloud Supabase has 23 public app tables, a working `on_auth_user_created` database trigger, and **0 existing auth users / 0 admin users**. The existing tables/migrations do NOT need to be recreated.

**Do not create a second Supabase project or reapply migrations 0000–0005 to the current database.**
The main branch currently has public name/email/password registration, whereas the PR branch's registration form requires a beta code. The owner must bootstrap on the existing live/main release BEFORE applying the invite-only migration.

## Required one-time steps

1. Open the Lovable project → **View Backend** → **Authentication** → **Sign In / Providers** → **Email**; turn the **Email provider** on and save. This is a GoTrue service setting, not a React code change, and does not require Lovable credits. Do not enable anonymous sign-ins.
2. Leave **Confirm Email** enabled for a real beta. Register **your own** account on the currently deployed site (main branch's existing open registration) with your actual address, name and a strong unique password. Verify that address, then sign in again. If confirmation email cannot be delivered, investigate Auth email limits/SMTP; do not leave unverified signup enabled for production.
3. With the owner account created and email **verified**, use the backend SQL editor or have an authorized operator run the narrowly scoped bootstrap SQL below. Replace the placeholder locally with the exact email of your new account. **Never share your password or Supabase secret key in ChatGPT.**
4. In the current published site sign in with that account. The existing `/admin` route should now be visible. Verify administrator access and the normal diary.
5. **Only after the owner role works**, deploy the `beta-invites` Edge Function with its Supabase service-role key on the SERVER, backup the database, stage/test the add-only `drizzle/migrations/0006_closed_beta_invites.sql` migration, then coordinate its production application with the invitation-aware frontend rollout.

### Owner bootstrap SQL — run once after verified signup

```sql
-- Review on the Lovable Cloud Supabase database, not an unrelated project.
-- Change the email placeholder to YOUR verified signup email.
insert into public.admin_users (user_id, role)
select u.id, 'owner'
from auth.users as u
where lower(u.email) = lower('REPLACE_WITH_YOUR_VERIFIED_EMAIL')
  and u.email_confirmed_at is not null
  and (select count(*) from public.admin_users where role = 'owner') = 0
on conflict (user_id) do nothing;

-- Verify your account became the one and only owner without printing credentials.
select count(*)::int as owner_count
from public.admin_users
where role = 'owner';
```

**Expected result:** `owner_count = 1`. If result is 0, stop and inspect whether signup or email confirmation completed; do not weaken constraints or add random admin accounts. The bootstrap does not reveal user UUIDs publicly and never creates a backdoor endpoint.

### Security and deployment notes

- The existing app-level admin table checks the role string `'admin'` or `'owner'` (not `super_admin`).
- The new beta form intentionally uses **name + invitation code + email/password**; a one-use code is NOT a reusable login password.
- The invite-only SQL adds a BEFORE INSERT trigger on `auth.users`. Once that migration is applied, all NEW Auth users without a valid code are blocked, including direct API signups; existing owners can still log in.
- Keep **Email provider** enabled after launch. Keep email confirmation and Auth abuse controls enabled. Supabase's hosted default mail sender has delivery/rate limitations: configure production SMTP if confirmation emails to beta testers fail.
- Production SQL migration and Edge Function deployment should happen through the existing Lovable Cloud/Supabase backend. A GitHub commit alone does not apply either.
- Once production closed-beta registration is active, an existing owner can issue/revoke beta codes through the new admin screen and revoke/extend each registered user's app access separately.
- Check Auth redirect URLs, password-reset path, browser persistence toggle, signout and protected route redirects with a test account; verify RLS isolation with a second identity.
- The current sign-in 422 `email_provider_disabled` error means GoTrue Email is OFF. React code changes alone cannot override this service configuration.
- If an administrator prefers a managed bootstrap instead of SQL, authorize a **specific verified account promotion** after registration and ensure the target identity is correct; do not auto-promote the first visitor from application code.
