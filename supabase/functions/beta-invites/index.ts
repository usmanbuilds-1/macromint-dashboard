// Admin-only, server-side invite issuance and revocation.
// Never return invite hashes or persist the raw one-time code in a table.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { json, errorResponse, preflight } from "../_shared/http.ts";

type RequestBody =
  | { action: "create"; expiresDays?: number; maxUses?: number; note?: string }
  | { action: "list" }
  | { action: "revoke"; inviteId?: string };

function generateCode(): string {
  // 160-bit CSPRNG token; each issuance differs even for identical admin inputs.
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  const hex = Array.from(bytes, (v) => v.toString(16).padStart(2, "0")).join("");
  return "MM-" + hex.toUpperCase();
}

async function hashCode(code: string): Promise<string> {
  const input = new TextEncoder().encode(code.trim().toLowerCase());
  const digest = await crypto.subtle.digest("SHA-256", input);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  const cors = preflight(req);
  if (cors) return cors;
  if (req.method !== "POST") return errorResponse("METHOD", "POST only", 405);

  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer /i, "");
  if (!token) return errorResponse("AUTH", "You must sign in", 401);

  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return errorResponse("CONFIG", "Invitation service not configured", 503);

  const sb = createClient(url, key, { auth: { persistSession: false } });
  const { data: authData, error: authError } = await sb.auth.getUser(token);
  if (authError || !authData.user) return errorResponse("AUTH", "Invalid session", 401);

  const ownerId = authData.user.id;
  const { data: admin, error: adminError } = await sb.from("admin_users")
    .select("role").eq("user_id", ownerId).maybeSingle();
  if (adminError || !admin) return errorResponse("FORBIDDEN", "Administrator only", 403);

  let body: RequestBody;
  try { body = await req.json(); }
  catch { return errorResponse("INPUT", "Invalid request", 400); }

  if (body.action === "list") {
    const { data, error } = await sb.from("beta_invites")
      .select("id, created_at, expires_at, max_uses, used_count, revoked_at, note")
      .order("created_at", { ascending: false }).limit(200);
    if (error) return errorResponse("DB", "Could not load invitations", 500);
    return json({ invitations: data ?? [] });
  }

  if (body.action === "create") {
    const days = body.expiresDays ?? 14;
    const maxUses = body.maxUses ?? 1;
    const note = (body.note ?? "").trim();
    if (!Number.isInteger(days) || days < 1 || days > 90 ||
        !Number.isInteger(maxUses) || maxUses < 1 || maxUses > 100 ||
        note.length > 200) {
      return errorResponse("INPUT", "Invalid expiry, uses or note", 400);
    }
    const invitationCode = generateCode();
    const codeHash = await hashCode(invitationCode);
    const expiresAt = new Date(Date.now() + days * 86400000).toISOString();

    const { data, error } = await sb.from("beta_invites")
      .insert({ code_hash: codeHash, created_by: ownerId, expires_at: expiresAt, max_uses: maxUses, note })
      .select("id, expires_at, max_uses").single();
    if (error) return errorResponse("DB", "Could not create invitation", 500);
    await sb.from("admin_audit_logs").insert({
      admin_id: ownerId,
      target_user_id: ownerId,
      action: "create_beta_invite",
      metadata: { invite_id: data.id, max_uses: maxUses, expires_at: expiresAt },
    });
    // This response is the ONLY time the raw invitation is exposed.
    return json({ invitationCode, invitation: data }, 201);
  }

  if (body.action === "revoke") {
    if (!body.inviteId || !/^[0-9a-f-]{36}$/i.test(body.inviteId)) {
      return errorResponse("INPUT", "Invalid invitation ID", 400);
    }
    const { data, error } = await sb.from("beta_invites")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", body.inviteId).is("revoked_at", null)
      .select("id").maybeSingle();
    if (error) return errorResponse("DB", "Could not revoke invitation", 500);
    if (!data) return errorResponse("NOT_FOUND", "Invitation not found or already revoked", 404);
    await sb.from("admin_audit_logs").insert({
      admin_id: ownerId,
      target_user_id: ownerId,
      action: "revoke_beta_invite",
      metadata: { invite_id: data.id },
    });
    return json({ ok: true });
  }

  return errorResponse("INPUT", "Unknown invitation action", 400);
});
