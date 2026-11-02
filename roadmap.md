# Macromint migration roadmap

Source: /tmp/macromint-src/macromint (Vite + React Router SPA + Supabase edge functions).
Target: this TanStack Start project + Lovable Cloud (enabled).

## Tasks
- [ ] Apply the 5 SQL migrations from source `supabase/migrations/` to Lovable Cloud (lov_database--migration, byte-for-byte)
- [ ] Enable email/password auth (`enable_email_auth`)
- [ ] Copy framework-agnostic code: `src/types`, `src/lib/nutrition`, `src/lib/scan`, nutrition tests
- [ ] Wire backend to generated Cloud client (replace `src/lib/supabase.ts` shim), port `supabase-backend.ts`
- [ ] Port edge functions: ai-scan → server route on Lovable AI Gateway; food-search → server route; payment-webhook → `/api/public/payment-webhook` (generic HMAC, 501 until provider configured); admin-action/admin-query/ad-reward/delete-account → authenticated server functions
- [ ] Port screens to TanStack routes: /, /login, /register, /verify, /reset, /upgrade, /privacy, /terms, /onboarding, /today, /diary, /foods, /trends, /goals, /settings, /admin(/audit,/settings)
- [ ] Gate protected routes under `_authenticated`; port RequireApp (onboarding + access) gating
- [ ] Port ui components, AppLayout, Session provider, styles (design tokens)
- [ ] Run nutrition unit tests with vitest; keep them in project
- [ ] Verify: build green, signup→verify→onboarding→log food→diary reads back; scan endpoint live; payment checkout honest state; admin panel role-gated
- [ ] After preview: request existing data exports from the user (their old Supabase DB) — pending

## Notes
- No payment provider configured (per docs/MONETIZATION.md): keep checkout in honest "not available" state, webhook endpoint generic HMAC.
- AI scanning: use Lovable AI Gateway (vision-capable model) instead of GEMINI_API_KEY.
- Demo backend: keep code, IS_DEMO=false since Cloud is always configured.
- No record export in archive → schema + seed foods only; user data import pending.
