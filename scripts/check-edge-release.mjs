// Release gate: validate every serverless source that will be included in the
// one-batch Lovable deployment. Structural checks are intentionally explicit;
// authenticated runtime, gateway and SQL execution remain separate gates.
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import ts from "typescript";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const endpoints = [
  "username-register", "username-recovery", "beta-invites",
  "admin-query", "admin-action", "ai-scan",
  "food-search", "delete-account",
];
for (const name of endpoints) {
  const path = `supabase/functions/${name}/index.ts`;
  const source = read(path);
  const parsed = ts.createSourceFile(path, source, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS);
  assert.equal(parsed.parseDiagnostics.length, 0,
    `${path}: invalid TypeScript syntax: ${parsed.parseDiagnostics.map(d => d.messageText).join(", ")}`);
  assert.match(source, /Deno\.serve\(/, `${name}: no entrypoint`);
  assert.match(source, /preflight\(/, `${name}: no OPTIONS/CORS handler`);
  assert.match(source, /POST/, `${name}: must handle POST`);
}
for (const name of ["http", "username-rate-limit"]) {
  const path = `supabase/functions/_shared/${name}.ts`;
  const parsed = ts.createSourceFile(path, read(path), ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS);
  assert.equal(parsed.parseDiagnostics.length, 0, `${path}: invalid TypeScript syntax`);
}

const food = read("supabase/functions/food-search/index.ts");
assert.match(food, /readJsonObject\\(req, 1024\\)/, "Food search must read bounded POST JSON");
assert.match(food, /supabase\\.rpc\\("check_access"\\)/, "Food search must enforce account access");
assert.match(food, /measuredInGrams/, "Food serving quantities must avoid unit conversion guesses");
assert.doesNotMatch(food, /req\.url.*searchParams/, "Do not read URL-only search params");
assert.match(food, /AbortSignal\.timeout/, "Food search remote provider must time out");
assert.match(food, /userData\?\.user/, "Food search must verify signed-in user");

const ai = read("supabase/functions/ai-scan/index.ts");
assert.match(ai, /consume_ai_scan_budget/, "AI scans must consume atomic preflight quota");
assert.match(ai, /readJsonObject\\(req, 4_100_000\\)/, "AI scan request must be bounded");
assert.match(ai, /if \\(it === null/, "Malformed vision items must be safely ignored");
assert.doesNotMatch(ai, /\.from\("scan_events"\)\s*\.select\("id"/,
  "Counting completed scans is not concurrency-safe");
assert.match(ai, /AI_VISION_PROVIDER/, "Explicit provider choice required");
assert.match(ai, /provider === "gemini" && geminiKey/, "Gemini default priority missing");
assert.match(ai, /"x-goog-api-key": apiKey/, "Gemini credentials must use request header");
assert.doesNotMatch(ai, /generateContent\?key=/, "Do not leak Gemini API keys into request URL");
assert.match(ai, /\.slice\(0, 3\)/, "Bound provider retry attempts to avoid runaway token usage");

assert.match(ai, /AbortSignal\.timeout/, "AI provider timeout missing");
assert.match(ai, /Image content does not match its type/, "Image signature checks missing");
assert.match(ai, /matchScore\(label, p\.product_name\) < 0\.65/,
  "Unrelated food database matches must not overwrite estimates");
assert.doesNotMatch(ai, /String\(\(e as Error\)\.message/,
  "Never send raw provider errors to the client");

const safeJson = read("supabase/functions/_shared/http.ts");
assert.match(safeJson, /export async function readJsonObject/, "Bounded JSON helper missing");
for (const name of ["username-register", "username-recovery", "admin-query",
                    "admin-action", "beta-invites", "ai-scan", "food-search"]) {
  assert.match(read(`supabase/functions/${name}/index.ts`), /readJsonObject\\(/,
    `${name}: must reject malformed JSON object bodies`);
}

const action = read("supabase/functions/admin-action/index.ts");
assert.match(action, /admin_change_entitlement/, "Atomic entitlement RPC not wired");
assert.match(action, /admin_set_app_config/, "Atomic admin config RPC not wired");
assert.doesNotMatch(action, /from\("entitlements"\)\.update/,
  "Admin actions must not write entitlement separately from audit");

const invites = read("supabase/functions/beta-invites/index.ts");
assert.match(invites, /admin_create_beta_invite/, "Atomic invite create RPC not wired");
assert.match(invites, /admin_revoke_beta_invite/, "Atomic invite revoke RPC not wired");
assert.doesNotMatch(invites, /from\("beta_invites"\)\s*\.insert/,
  "Raw invite inserts must not bypass mandatory admin audit");

const adminQuery = read("supabase/functions/admin-query/index.ts");
assert.match(adminQuery, /Invalid search characters/, "Admin filter grammar guard missing");
assert.match(adminQuery, /entRes\.error \|\| diaryRes\.error/,
  "User analytics must not silently replace failed queries with zeros");

for (const [file, marker, grant] of [
  ["0010_ai_scan_atomic_budgets.sql", "consume_ai_scan_budget", "GRANT EXECUTE"],
  ["0011_atomic_admin_actions.sql", "admin_change_entitlement", "GRANT EXECUTE"],
  ["0012_atomic_beta_invites.sql", "admin_create_beta_invite", "GRANT EXECUTE"],
]) {
  const sql = read("drizzle/migrations/" + file);
  assert.match(sql, new RegExp(marker), `${file}: missing API`);
  assert.match(sql, new RegExp(grant), `${file}: service role grant missing`);
  assert.match(sql, /SECURITY DEFINER/, `${file}: RPC privilege contract missing`);
  assert.match(sql, /REVOKE ALL ON FUNCTION/, `${file}: public function access must be revoked`);
  assert.match(sql, /TO service_role;/, `${file}: service role access missing`);
}
const auditSql = read("drizzle/migrations/0011_atomic_admin_actions.sql");
assert.equal((auditSql.match(/CREATE OR REPLACE FUNCTION/g) || []).length, 2,
  "Admin SQL migration has duplicate or missing function declarations");
assert.match(auditSql, /p_date !~ '\^\[0-9\]\{4\}-\[0-9\]\{2\}-\[0-9\]\{2\}\$'/,
  "Admin SQL date validation malformed");

const upgrade = read("src/features/upgrade/Upgrade.tsx");
assert.doesNotMatch(upgrade, /\$6|\$54/, "Invented subscription pricing must not ship");
assert.doesNotMatch(upgrade, /Continue free with an ad/,
  "Unconfigured rewarded-ad checkout must not be advertised");

const legal = read("src/features/landing/Legal.tsx");
assert.match(legal, /Subscription checkout is not enabled/,
  "Legal page must accurately state unavailable payments");
assert.match(legal, /account identifier and dates/,
  "Privacy notice must disclose retained trial-abuse records");
assert.doesNotMatch(legal, /Subscriptions renew automatically until cancelled/,
  "Do not claim working paid subscriptions before provider activation");
const settingsPage = read("src/features/settings/Settings.tsx");
assert.doesNotMatch(settingsPage, /All personal data has been removed/,
  "Deletion UI must not contradict retained abuse ledger");

console.log("PASS: all eight Edge handlers, shared modules, audited SQL interfaces and beta feature gates");
