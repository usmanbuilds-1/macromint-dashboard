# Promote the verified Usman account to Macro Mint owner
Updated 7 November 2026. **Not executed.** This procedure requires privileged production database access; pushing code cannot change a user's admin role.

## Why the username alone is insufficient
The UI's account display name is mutable, usernames are case-insensitive, and existing email accounts may predate username signup. Do **not** promote all profiles where `name = 'Usman'`, the first registered user, or any requester who submits a username. An attacker could impersonate such a name. The actual authorization check is `public.admin_users` linked by an immutable `auth.users.id`. Server-side Edge Functions must continue to check that table.

## Verification
1. Sign in as the intended account on the production website using its genuine credentials. In the trusted authentication console, identify that session's exact UUID and the normalized authentication identifier. The synthetic identifier for username-only accounts is `username@macromint.internal`; it cannot receive email.
2. In the privileged database console, confirm there is exactly one `auth.users` row with that **UUID and identifier**. Confirm the account is the intended registered owner. Review existing rows of `public.admin_users` first. Never infer authorization from a profile name.
3. After verifying, replace both placeholders in the SQL below *locally*. Never paste a password, recovery code, JWT, or service-role secret into chat or a Git commit.

## One-time, guarded SQL (privileged console only)
```sql
BEGIN;
DO $$
DECLARE
  intended_user uuid := '00000000-0000-0000-0000-000000000000';
  intended_identifier text := 'REPLACE_WITH_EXACT_AUTH_IDENTIFIER';
BEGIN
  IF intended_user = '00000000-0000-0000-0000-000000000000'::uuid
     OR intended_identifier = 'REPLACE_WITH_EXACT_AUTH_IDENTIFIER' THEN
    RAISE EXCEPTION 'Replace both placeholders after verifying the signed-in owner identity';
  END IF;

  IF (SELECT count(*) FROM auth.users
      WHERE id = intended_user AND lower(email) = lower(intended_identifier)) <> 1 THEN
    RAISE EXCEPTION 'No unique matching verified auth identity';
  END IF;

  IF EXISTS (SELECT 1 FROM public.admin_users
             WHERE role = 'owner' AND user_id <> intended_user) THEN
    RAISE EXCEPTION 'Another owner already exists. Stop and review roles manually.';
  END IF;

  INSERT INTO public.admin_users (user_id, role)
    VALUES (intended_user, 'owner')
  ON CONFLICT (user_id) DO UPDATE
    SET role = EXCLUDED.role;
END $$;
COMMIT;

-- Confirm that the intended account, not a same-name account, holds the owner role:
SELECT user_id, role FROM public.admin_users WHERE role = 'owner';
```

Afterwards sign out and back in, check that `/admin` opens, and that an ordinary test account cannot open it or call `admin-action`. Check the audit log for access-grant actions. The SQL above changes only one role record, not any authentication password or entitlement. It deliberately refuses to replace an existing different owner.

## Status
The assistant can edit the repository but has not verified the live account UUID or executed this transaction; therefore owner promotion is **pending**, not completed. The older `docs/AUTH_BOOTSTRAP.md` describes an earlier rollout state (Nov 3) and its "0 users" statement must not be treated as current.
