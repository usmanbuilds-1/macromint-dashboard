# Macro Mint — migration 0017 deployment and rollback gate

**Not applied to production by a GitHub merge.** Source branch only.
This migration adds `nutritional_goals.day_targets`, `public.planned_meals`, and three guarded functions:
`plan_saved_meal`, `consume_planned_meal`, and `replace_recipe`.

## Required order
1. Back up the production database using the provider's approved process, verify that migrations 0000–0016 are installed, and confirm a recent user export works. **Do not run migration from an unauthenticated frontend.**
2. Review 0017 in a staging clone with two distinct authenticated test accounts and a seeded saved meal. Run the migration under the trusted database administrator. PostgREST schema caches must refresh.
3. Account A plans a saved meal. Confirm it appears in plans but produces **zero diary rows**. Account B must not read, create, delete or consume A's plan—even by guessing its UUID.
4. In account A, invoke `consume_planned_meal` twice (including concurrent requests); assert the same stored entry IDs are returned and no extra diary rows appear. Force an invalid ingredient in an isolated test transaction; assert **no** diary rows or state changes persist.
5. Remove a still-planned meal, verify it disappears. An eaten plan may not be deleted through the client. Delete a test account and verify cascade removes plans.
6. Edit a recipe with the owner RPC; verify ingredients are replaced atomically, and previously logged entries keep their original saved nutrients. Confirm a stranger can't alter or enumerate the recipe by ID.
7. Save an invalid day schedule (e.g. calorie target under 800) and verify a DB constraint rejects it; verify other days continue using base targets. Export and deletion must include plans.
8. Only after staging tests and monitoring are satisfactory, deploy migration and the corresponding frontend/Edge export changes **together**. Validate iOS/Android; confirm keyboard behavior and tab switching latency.

## Rollback
Avoid destructive rollback while users have plan data. Disable the Planner UI if RPCs fail, investigate, and restore from the verified backup or issue a forward migration. Removing the column, table or functions drops user data and is **not** a safe default rollback.

## Security invariants
- RLS is server enforced; no UI is an authorization boundary.
- Direct client INSERT/UPDATE of `planned_meals` is not granted; plan/consume go through guarded RPCs.
- Plans snapshot only the signed-in user's saved meal; no raw nutrition is auto-generated.
- Consuming locks the row, writes diary rows and updates status in one transaction. Retries are idempotent.
- Recipe edit mutates only an owner-controlled recipe and keeps the diary snapshot intact.
- Export service role always derives target user from a verified bearer token, never a user-supplied ID.

**External dependencies**: production SQL migration and real two-account staging security tests require privileged Supabase access; no such access is assumed or requested through Lovable.
