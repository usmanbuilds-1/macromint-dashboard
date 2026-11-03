// ═══════════════════════════════════════════════════════════════════════
// Macromint Edge Function: delete-account
// Deletes the authenticated user and, through cascading foreign keys,
// every owned record. This is the real data deletion workflow.
// ═══════════════════════════════════════════════════════════════════════

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { json, errorResponse, preflight } from "../_shared/http.ts";

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return errorResponse("METHOD", "POST only", 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return errorResponse("AUTH", "Missing bearer token", 401);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: userData, error: userError } = await admin.auth.getUser(
    authHeader.replace("Bearer ", ""),
  );
  const user = userData?.user;
  if (userError || !user) return errorResponse("AUTH", "Invalid token", 401);

  const { data: profile } = await admin
    .from("profiles")
    .select("email")
    .eq("user_id", user.id)
    .maybeSingle();

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) return errorResponse("DB", deleteError.message, 500);

  // Trial ledger keeps the email (personal data minimisation: user_id is
  // nulled by the FK) so anti-abuse checks survive account deletion.
  if (profile?.email) {
    await admin
      .from("trial_records")
      .update({ outcome: "expired", ended_at: new Date().toISOString() })
      .eq("email", profile.email)
      .is("ended_at", null);
  }

  return json({ ok: true });
});
