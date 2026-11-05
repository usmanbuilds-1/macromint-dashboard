/**
 * Post-deploy authenticated security smoke for TWO DISPOSABLE TEST USERS.
 *
 * Predeploy/CI: node --check scripts/live-auth-security-audit.mjs
 * Live: requires explicit credentials and a staging/controlled environment.
 *
 * DO NOT use owner credentials. DO NOT put secrets in CLI arguments, output,
 * GitHub comments or Lovable prompts. Do not run against a production owner's
 * data. For optional cross-user write proof set E2E_ALLOW_PROBE_WRITES=true.
 *
 * Required env: E2E_SUPABASE_URL, E2E_SUPABASE_ANON_KEY,
 * E2E_USER_A_USERNAME, E2E_USER_A_PASSWORD,
 * E2E_USER_B_USERNAME, E2E_USER_B_PASSWORD.
 */
import { createClient } from "@supabase/supabase-js";
import assert from "node:assert/strict";

function env(name) {
  const v = process.env[name];
  assert.ok(v, `Required environment variable missing: ${name}`);
  return v;
}
const base = env("E2E_SUPABASE_URL").replace(/\/$/, "");
const key = env("E2E_SUPABASE_ANON_KEY");
assert.ok(base.startsWith("https://"), "Use an HTTPS Cloud target");
const idA = env("E2E_USER_A_USERNAME").toLowerCase();
const idB = env("E2E_USER_B_USERNAME").toLowerCase();
assert.match(idA, /^[a-z0-9_]{3,20}$/);
assert.match(idB, /^[a-z0-9_]{3,20}$/);
assert.notEqual(idA, idB, "Accounts must be distinct");
const mutating = process.env.E2E_ALLOW_PROBE_WRITES === "true";
const sdk = (username, password) => {
  const s = createClient(base, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  return s.auth.signInWithPassword({
    email: `${username}@macromint.internal`, password,
  }).then(({ data, error }) => {
    assert.ifError(error);
    assert.ok(data.user && data.session?.access_token, `Could not sign in ${username}`);
    return { sb: s, user: data.user, accessToken: data.session.access_token };
  });
};
const [a, b] = await Promise.all([
  sdk(idA, env("E2E_USER_A_PASSWORD")),
  sdk(idB, env("E2E_USER_B_PASSWORD")),
]);
assert.notEqual(a.user.id, b.user.id);

const oneRow = async (sb, table, column, value) => {
  const { data, error } = await sb.from(table)
    .select("*").eq(column, value).limit(10);
  assert.ifError(error);
  return data ?? [];
};
// Read-only isolation, even if the other user's record is in the database.
// For a meaningful positive-control proof, use the opt-in write section below.
for (const [table, col] of [
  ["profiles", "user_id"],
  ["entitlements", "user_id"],
  ["water_entries", "user_id"],
  ["weight_entries", "user_id"],
  ["diary_entries", "user_id"],
]) {
  const [aReadsB, bReadsA] = await Promise.all([
    oneRow(a.sb, table, col, b.user.id),
    oneRow(b.sb, table, col, a.user.id),
  ]);
  assert.equal(aReadsB.length, 0, `A can read B's ${table}`);
  assert.equal(bReadsA.length, 0, `B can read A's ${table}`);
}
console.log("PASS: two-user cross-account read denial");

// Admin-only actions must reject both regular test users. Never treat a
// response without actual access as proof of security.
for (const u of [a, b]) {
  const { data, error } = await u.sb.functions.invoke("admin-query", {
    body: { action: "get_settings" },
  });
  assert.ok(error || data?.error, "Non-admin could call admin-query");
  const { data: inviteData, error: inviteError } = await u.sb.functions.invoke("beta-invites", {
    body: { action: "list" },
  });
  assert.ok(inviteError || inviteData?.error, "Non-admin could list private invitations");
}
console.log("PASS: non-admin role denial");

// The edge endpoint must accept the JSON POST contract used in the UI.
// Provider requests may be rate-limited by Open Food Facts; only require
// well-formed responses, not a guaranteed remote data match.
const { data: foodResult, error: foodError } = await a.sb.functions.invoke("food-search", {
  body: { q: "rice" },
});
assert.ifError(foodError);
assert.ok(Array.isArray(foodResult?.local) && Array.isArray(foodResult?.remote),
  "Food search did not honor the frontend JSON contract");
console.log("PASS: live authenticated food-search JSON POST");

// Positive-control RLS isolation using freshly created probes. Must be
// deliberately enabled, and only run on disposable test accounts.
if (mutating) {
  const date = new Date().toISOString().slice(0, 10);
  let probeId;
  try {
    const { data, error } = await b.sb.from("water_entries")
      .insert({ user_id: b.user.id, entry_date: date, amount_ml: 143 })
      .select("id, user_id").single();
    assert.ifError(error);
    assert.equal(data.user_id, b.user.id);
    probeId = data.id;

    const { data: ownerRead, error: readErr } = await b.sb.from("water_entries")
      .select("id").eq("id", probeId);
    assert.ifError(readErr);
    assert.equal(ownerRead?.length, 1, "Positive control: B cannot see B's row");

    const { data: outsiderRead, error: outsiderErr } = await a.sb.from("water_entries")
      .select("id").eq("id", probeId);
    assert.ifError(outsiderErr);
    assert.equal(outsiderRead?.length, 0, "A can read B's probe");

    const { data: outsiderWrite, error: writeErr } = await a.sb
      .from("water_entries").update({ amount_ml: 999 })
      .eq("id", probeId).select("id");
    assert.ok(writeErr || (outsiderWrite?.length ?? 0) === 0,
      "A updated B's probe");

    const { data: bStillOwns, error: verifyErr } = await b.sb
      .from("water_entries").select("amount_ml").eq("id", probeId).single();
    assert.ifError(verifyErr);
    assert.equal(bStillOwns.amount_ml, 143, "B's row was modified across accounts");
    console.log("PASS: positive-control RLS isolation with test data");
  } finally {
    if (probeId) {
      const { error } = await b.sb.from("water_entries").delete().eq("id", probeId);
      assert.ifError(error);
    }
  }
} else {
  console.log("SKIP: positive-control RLS write probe; set E2E_ALLOW_PROBE_WRITES=true for disposable test accounts");
}

for (const u of [a, b]) await u.sb.auth.signOut();
console.log("PASS: authenticated smoke finished; no owner credentials were used");
