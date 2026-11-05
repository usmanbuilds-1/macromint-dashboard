// Guard the gated username auth release against broken SQL and Edge source.
// Frontend TypeScript/build CI never parses Deno Edge Function source or applies
// PostgreSQL migrations; this check covers that source gap.
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import ts from "typescript";

function read(path) {
  return readFileSync(new URL("../" + path, import.meta.url), "utf8");
}
function exactlyOnce(source, literal, label) {
  const count = source.split(literal).length - 1;
  assert.equal(count, 1, `${label}: expected one occurrence of ${literal}; found ${count}`);
}

const migration = read("drizzle/migrations/0006_closed_beta_invites.sql");
assert.match(migration, /submitted_code\s*!~\s*'\^MM-\[A-F0-9\]\{40\}\$'/);
assert.doesNotMatch(migration, /'\^MM-\[A-F0-9\]\{40\}\s+then/);
for (const name of [
  "create trigger beta_check_before_signup",
  "create trigger beta_record_after_signup",
  "create or replace function public.beta_require_invite()",
  "create or replace function public.beta_record_signup()",
]) exactlyOnce(migration, name, "Invitation migration");
assert.match(migration, /revoke all on function public\.beta_require_invite\(\), public\.beta_record_signup\(\)/);
assert.match(migration, /new\.raw_user_meta_data\s*:=/);

for (const handler of ["username-register", "username-recovery", "beta-invites"]) {
  const path = `supabase/functions/${handler}/index.ts`;
  const source = read(path);
  const tree = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const errors = tree.parseDiagnostics;
  assert.equal(
    errors.length, 0,
    `${path}: invalid TypeScript syntax: ${errors.map((d) => ts.flattenDiagnosticMessageText(d.messageText, "\n")).join("; ")}`,
  );
  assert.doesNotMatch(source, /\\n  \/\//, `${path}: literal newline escapes broke the source`);
  if (handler !== "beta-invites") {
    assert.match(source, /checkUsernameAuthBudget\(/, `${path}: no rate limiter`);
    assert.match(source, /RATE_LIMIT/, `${path}: no 429 rate-limit handling`);
    assert.match(source, /NOT_CONFIGURED/, `${path}: not fail-closed`);
  }
}

// Syntax parsing alone cannot catch a spoofable IP fallback. Execute the pure
// parser in Node, including an attacker-provided X-Forwarded-For header.
const rateLimiter = read("supabase/functions/_shared/username-rate-limit.ts");
assert.doesNotMatch(rateLimiter, /req\.headers\.get\(["']x-forwarded-for["']\)/i);
const transpiled = ts.transpileModule(rateLimiter, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  reportDiagnostics: true,
});
assert.equal(transpiled.diagnostics?.length ?? 0, 0);
const mod = await import("data:text/javascript;base64," +
  Buffer.from(transpiled.outputText).toString("base64"));
const parse = (headers) => mod.requestIp(new Request("https://example.test/", { headers }));
assert.equal(parse({ "x-forwarded-for": "198.51.100.7" }), null, "forged XFF cannot supply a rate-limit identity");
assert.equal(parse({ "cf-connecting-ip": "198.51.100.7", "x-forwarded-for": "203.0.113.99" }), "198.51.100.7");
assert.equal(parse({ "cf-connecting-ip": "2001:db8::1", "x-forwarded-for": "203.0.113.99" }), "2001:db8::1");
assert.equal(parse({ "cf-connecting-ip": "999.999.999.999", "x-forwarded-for": "198.51.100.7" }), null);
assert.equal(parse({ "cf-connecting-ip": "198.51.100.7, 203.0.113.2" }), null);
assert.equal(parse({ "cf-connecting-ip": "001.2.3.4" }), null);
assert.equal(parse({ "cf-connecting-ip": ":::" }), null);

console.log("PASS: invite SQL shape, unique triggers, and Deno Edge syntax, and trusted client-IP parsing");
