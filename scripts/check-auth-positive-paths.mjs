// Execute the real username Edge entrypoints against deterministic fake clients.
// This is a PREDEPLOY test: no network, live users, secrets or Cloud writes.
// Complements check-edge-negative-paths.mjs; does not certify proxy trust or RLS.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
function compile(path) {
  const result = ts.transpileModule(read(path), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    reportDiagnostics: true,
  });
  assert.equal(result.diagnostics?.length ?? 0, 0, path + " must transpile");
  return result.outputText
    .replace(/^import\s+[^;]+;\s*$/gm, "")
    .replace(/^export\s*\{\s*\};?\s*$/gm, "")
    .replace(/^export\s+/gm, "");
}

const USER_ID = "33333333-3333-4333-8333-333333333333";
const INVITE = "MM-" + "A".repeat(40);
const CODE = "MMR-" + ["B".repeat(8), "C".repeat(8), "D".repeat(8), "E".repeat(8)].join("-");
const PASSWORD = "A-strong-password-2026";
const makePost = data => new Request("https://example.invalid/functions/v1/test", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(data),
});

function setup(name, options = {}) {
  const calls = [];
  let handler;
  let inviteUsed = 0;
  let codeSpent = false;
  const env = new Map([
    ["SUPABASE_URL", "https://example.invalid"],
    ["SUPABASE_SERVICE_ROLE_KEY", "fake-unit-test-only"],
    ["USERNAME_REGISTRATION_ENABLED", "true"],
    ["USERNAME_INVITE_TRIGGER_VERIFIED", "true"],
    ["USERNAME_REGISTRATION_RATE_LIMIT_VERIFIED", "true"],
    ["USERNAME_PUBLIC_SIGNUP_TICKET_VERIFIED", options.publicTicketDisabled ? "false" : "true"],
    ["PUBLIC_REGISTRATION_ENABLED", options.publicDisabled ? "false" : "true"],
    ["USERNAME_RECOVERY_ENABLED", "true"],
    ["USERNAME_RECOVERY_RATE_LIMIT_VERIFIED", "true"],
  ]);
  const fakeClient = () => ({
    auth: { admin: {
      async createUser(payload) {
        calls.push("createUser");
        assert.equal(payload.email, "beta_user@macromint.internal");
        assert.equal(payload.user_metadata.username, "beta_user");
        if (options.publicSignUp) {
          assert.match(payload.user_metadata.public_signup_ticket, /^[0-9a-f]{64}$/);
          assert.equal(payload.user_metadata.beta_invite_code, undefined);
        } else {
          assert.equal(payload.user_metadata.beta_invite_code, INVITE);
          assert.equal(payload.user_metadata.public_signup_ticket, undefined);
          inviteUsed++;
        }
        return { data: { user: { id: USER_ID } }, error: null };
      },
      async deleteUser(id) {
        assert.equal(id, USER_ID);
        calls.push("deleteUser");
        return { error: null };
      },
      async updateUserById(id, changes) {
        assert.equal(id, USER_ID);
        assert.equal(changes.password, PASSWORD);
        calls.push("updatePassword");
        return { error: options.updateFailure ? { message: "simulated" } : null };
      },
    } },
    from(table) {
      calls.push("from:" + table);
      if (table === "beta_invites") {
        return { select() { return { eq(column, hash) {
          assert.equal(column, "code_hash");
          assert.match(hash, /^[0-9a-f]{64}$/);
          return { async maybeSingle() {
            return { data: options.invalidInvite ? null : {
              id: "88888888-8888-4888-8888-888888888888",
              expires_at: "2099-01-01T00:00:00Z",
              revoked_at: null, used_count: inviteUsed, max_uses: 1,
            }, error: null };
          } };
        } }; } };
      }
      if (table === "username_recovery_codes") {
        return {
          select() { return { async limit() { return {
            error: options.missingRecoveryTable ? { message: "simulated" } : null,
          }; } }; },
          async insert(rows) {
            calls.push("storeRecovery");
            assert.equal(rows.length, 8);
            assert.ok(rows.every(r => r.user_id === USER_ID && /^[0-9a-f]{64}$/.test(r.code_hash)));
            return { error: options.storeFailure ? { message: "simulated" } : null };
          },
        };
      }
      if (table === "profiles") {
        return { select() { return { eq(column, value) {
          assert.equal(column, "email");
          assert.equal(value, "beta_user@macromint.internal");
          return { async maybeSingle() {
            return { data: options.missingProfile ? null : { user_id: USER_ID }, error: null };
          } };
        } }; } };
      }
      throw Error("Unexpected table: " + table);
    },
    async rpc(name, args) {
      if (name === "issue_public_signup_ticket") {
        assert.match(args.p_hash, /^[0-9a-f]{64}$/);
        calls.push("issueTicket");
        return { data: options.ticketIssueFailure ? null : true,
                 error: options.ticketIssueFailure ? { message:"simulated" } : null };
      }
      assert.equal(name, "consume_username_recovery_code");
      assert.equal(args.p_user_id, USER_ID);
      assert.match(args.p_code_hash, /^[0-9a-f]{64}$/);
      calls.push("consumeRecovery");
      if (codeSpent) return { data: false, error: null };
      codeSpent = true;
      return { data: true, error: null };
    },
  });
  const context = {
    Deno: { env: { get: key => env.get(key) }, serve(fn) { handler = fn; } },
    createClient: fakeClient,
    checkUsernameAuthBudget: async (_request, kind, identifier) => {
      calls.push("budget:" + kind);
      assert.equal(identifier.toLowerCase(), "beta_user");
      return options.limitBudget ? "limited" : "allowed";
    },
    json: (data, status = 200) => new Response(JSON.stringify(data), {
      status, headers: { "Content-Type": "application/json" },
    }),
    errorResponse: (code, message, status) => new Response(JSON.stringify({ error: code, message }), {
      status, headers: { "Content-Type": "application/json" },
    }),
    preflight: req => req.method === "OPTIONS" ? new Response(null, { status: 204 }) : null,
    readJsonObject: async req => {
      try {
        const value = await req.json();
        return value && typeof value === "object" && !Array.isArray(value) ? value : null;
      } catch { return null; }
    },
    Request, Response, TextEncoder, TextDecoder, Uint8Array, URL, Date, crypto,
    console: { log() { throw Error("Unexpected log"); }, error() { throw Error("Unexpected log"); } },
  };
  vm.runInNewContext(compile("supabase/functions/" + name + "/index.ts"), context, { timeout: 1500 });
  assert.equal(typeof handler, "function");
  return { handler, calls };
}

const signup = { username: "Beta_User", name: "Beta Tester", password: PASSWORD, inviteCode: INVITE };
const reset = { username: "Beta_User", recoveryCode: CODE, newPassword: PASSWORD };
let checked = 0;

// Happy-path enrollment: exactly eight hashed-at-rest, one-time recovery codes.
{
  const { handler, calls } = setup("username-register");
  const response = await handler(makePost(signup));
  assert.equal(response.status, 201);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.needsVerification, false);
  assert.equal(body.recoveryCodes.length, 8);
  assert.equal(new Set(body.recoveryCodes).size, 8);
  assert.ok(body.recoveryCodes.every(code => /^MMR-(?:[A-F0-9]{8}-){3}[A-F0-9]{8}$/.test(code)));
  assert.ok(calls.indexOf("budget:register") < calls.indexOf("createUser"));
  assert.ok(calls.indexOf("createUser") < calls.indexOf("storeRecovery"));
  checked++;
}
// Public registration can create an account with a server-only one-use ticket.
{
  const { handler, calls } = setup("username-register", { publicSignUp: true });
  const response = await handler(makePost({ username: "Beta_User", name: "Public User", password: PASSWORD }));
  assert.equal(response.status, 201);
  assert.equal((await response.json()).recoveryCodes.length, 8);
  assert.ok(calls.indexOf("budget:register") < calls.indexOf("issueTicket"));
  assert.ok(calls.indexOf("issueTicket") < calls.indexOf("createUser"));
  checked++;
}
// Public registration fails closed if ticket issuance or activation is missing.
for (const options of [
  { publicSignUp: true, publicDisabled: true },
  { publicSignUp: true, publicTicketDisabled: true },
  { publicSignUp: true, ticketIssueFailure: true },
]) {
  const { handler, calls } = setup("username-register", options);
  const response = await handler(makePost({
    username: "Beta_User", name: "Public User", password: PASSWORD,
  }));
  assert.equal(response.status, 503);
  assert.ok(!calls.includes("createUser"));
  checked++;
}
// Invalid invitation or missing recovery infrastructure must never create an account.
for (const options of [{ invalidInvite: true }, { missingRecoveryTable: true }, { limitBudget: true }]) {
  const { handler, calls } = setup("username-register", options);
  const response = await handler(makePost(signup));
  assert.ok([400, 429, 503].includes(response.status));
  assert.ok(!calls.includes("createUser"));
  checked++;
}
// If secure recovery-code storage fails after signup, delete the orphaned account.
{
  const { handler, calls } = setup("username-register", { storeFailure: true });
  const response = await handler(makePost(signup));
  assert.equal(response.status, 503);
  assert.ok(calls.includes("createUser"));
  assert.ok(calls.includes("deleteUser"));
  assert.ok(calls.indexOf("storeRecovery") < calls.indexOf("deleteUser"));
  checked++;
}
// Successful recovery consumes a code before changing a password; reuse fails.
{
  const { handler, calls } = setup("username-recovery");
  const response = await handler(makePost(reset));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).ok, true);
  assert.ok(calls.indexOf("budget:recover") < calls.indexOf("consumeRecovery"));
  assert.ok(calls.indexOf("consumeRecovery") < calls.indexOf("updatePassword"));
  const reused = await handler(makePost(reset));
  assert.equal(reused.status, 400);
  assert.equal((await reused.json()).error, "INVALID_CODE");
  assert.equal(calls.filter(x => x === "updatePassword").length, 1);
  checked += 2;
}
// Failed password update must not restore an already consumed recovery code.
{
  const { handler, calls } = setup("username-recovery", { updateFailure: true });
  const response = await handler(makePost(reset));
  assert.equal(response.status, 503);
  assert.equal((await response.json()).error, "UPDATE_FAILED");
  assert.equal((await handler(makePost(reset))).status, 400);
  assert.equal(calls.filter(x => x === "consumeRecovery").length, 2);
  checked++;
}
// Unknown username and throttled attempts cannot change credentials.
for (const options of [{ missingProfile: true }, { limitBudget: true }]) {
  const { handler, calls } = setup("username-recovery", options);
  const response = await handler(makePost(reset));
  assert.ok([400, 429].includes(response.status));
  assert.ok(!calls.includes("updatePassword"));
  checked++;
}
console.log("PASS: " + checked + " username-auth positive/failure simulations (no network or Cloud)");
