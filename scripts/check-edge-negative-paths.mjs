// Execute actual TypeScript Edge handlers in a strict Node VM with mocked
// Supabase and no network access. These tests are release safeguards, not
// substitutes for real post-deployment login, RLS or gateway probes.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
function compile(path) {
  const transpiled = ts.transpileModule(read(path), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    reportDiagnostics: true,
  });
  assert.equal(transpiled.diagnostics?.length ?? 0, 0, `Invalid ${path}`);
  return transpiled.outputText
    .replace(/^import\s+[^;]+;\s*$/gm, "")
    .replace(/^export\s*\{\s*\};?\s*$/gm, "")
    .replace(/^export\s+/gm, "");
}
const helperPath = "supabase/functions/_shared/http.ts";
const helpers = {};
vm.runInNewContext(compile(helperPath) + "\nthis.__helpers = { json, errorResponse, preflight, readJsonObject, CORS_HEADERS };",
  { ...helpers, Request, Response, TextDecoder, TextEncoder, Uint8Array, URL },
  { timeout: 1000 });

function makeHandler(name, options = {}) {
  let handler;
  const calls = [];
  const fakeClient = () => ({
    auth: {
      getUser: async () => options.loggedIn === false
        ? { data: { user: null }, error: { message: "invalid" } }
        : { data: { user: { id: "33333333-3333-4333-8333-333333333333" } }, error: null },
    },
    rpc: async name => {
      calls.push(`rpc:${name}`);
      return { data: options.hasAccess !== false, error: null };
    },
    from: table => {
      calls.push(`from:${table}`);
      if (table === "admin_users") {
        return { select: () => ({ eq: () => ({ maybeSingle: async () =>
          ({ data: { role: "owner" }, error: null }) }) }) };
      }
      throw Error(`Unexpected database use: ${table}`);
    },
  });
  const env = new Map([["SUPABASE_URL", "https://example.invalid"], ["SUPABASE_ANON_KEY", "placeholder"], ["SUPABASE_SERVICE_ROLE_KEY", "placeholder"]]);
  const d = {
    env: { get: key => env.get(key) },
    serve(fn) { handler = fn; },
  };
  const fakeFetch = async () => { throw Error("Unexpected external network call"); };
  const context = {
    Deno: d, createClient: fakeClient, fetch: fakeFetch,
    json: (body, status) => new Response(JSON.stringify(body), { status: status ?? 200, headers: { "Content-Type": "application/json" } }),
    errorResponse: (code, message, status) => new Response(JSON.stringify({ error: code, message }), { status, headers: { "Content-Type": "application/json" } }),
    preflight: req => req.method === "OPTIONS" ? new Response("ok") : null,
    readJsonObject: async (req, maxBytes = 16384) => {
      const raw = await req.text();
      if (Buffer.byteLength(raw) > maxBytes) return null;
      try { const obj = JSON.parse(raw); return obj && typeof obj === "object" && !Array.isArray(obj) ? obj : null; }
      catch { return null; }
    },
    checkUsernameAuthBudget: async () => { throw Error("Auth must remain disabled in tests"); },
    Request, Response, TextDecoder, TextEncoder, Uint8Array, URL, AbortSignal,
    crypto, atob, btoa, Date, Buffer, console: { log() {}, error() {} },
  };
  vm.runInNewContext(compile(`supabase/functions/${name}/index.ts`), context, { timeout: 1500 });
  assert.equal(typeof handler, "function", `${name} entrypoint not registered`);
  return { handler, calls };
}
const post = (body, bearer = false) => new Request("https://example.invalid/functions/v1/test", {
  method: "POST",
  headers: { "Content-Type": "application/json", ...(bearer ? { Authorization: "Bearer test-token" } : {}) },
  body: JSON.stringify(body),
});
const invalidBodies = [null, [], 0, "string", true];
let assertions = 0;

for (const name of ["username-register", "username-recovery"]) {
  const { handler, calls } = makeHandler(name);
  const response = await handler(post({ username: "test", password: "placeholder" }));
  assert.equal(response.status, 503, `${name} must remain disabled`);
  assert.equal((await response.json()).error, "NOT_CONFIGURED");
  assert.deepEqual(calls, [], "Disabled auth must not access DB");
  assertions++;
}

for (const name of ["admin-action", "admin-query", "beta-invites", "delete-account", "food-search", "ai-scan", "account-data", "beta-appeals"]) {
  const { handler, calls } = makeHandler(name);
  const response = await handler(post({ action: "get_settings", q: "rice" }));
  assert.equal(response.status, 401, `${name} must require bearer JWT`);
  assert.deepEqual(calls, [], `${name} should reject before DB operations`);
  assertions++;
}

for (const name of ["admin-action", "admin-query", "beta-invites", "food-search", "ai-scan", "account-data", "beta-appeals"]) {
  const { handler } = makeHandler(name);
  for (const obj of invalidBodies) {
    const response = await handler(post(obj, true));
    assert.equal(response.status, 400, `${name} must reject ${JSON.stringify(obj)}`);
    assertions++;
  }
}
// A revoked user must be rejected before food/AI requests reach providers.
for (const name of ["food-search", "ai-scan"]) {
  const { handler, calls } = makeHandler(name, { hasAccess: false });
  const response = await handler(post({ q: "rice", image: "not an image" }, true));
  assert.equal(response.status, 403, `${name} must enforce access`);
  assert.ok(calls.includes("rpc:check_access"));
  assertions++;
}
// A user with access but invalid photo fails before scan quota or AI provider.
{
  const { handler, calls } = makeHandler("ai-scan", { hasAccess: true });
  const response = await handler(post({ image: "bad base64" }, true));
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error, "INVALID_IMAGE");
  assert.ok(!calls.includes("rpc:consume_ai_scan_budget"));
  assertions++;
}
console.log(`PASS: ${assertions} real Edge entrypoint negative-path checks (no network or live DB)`);
