// Execute the REAL TypeScript shared request reader in Node, without Deno,
// Supabase, provider credentials, network calls or production database writes.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const path = new URL("../supabase/functions/_shared/http.ts", import.meta.url);
const source = readFileSync(path, "utf8");
const transpiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  reportDiagnostics: true,
});
assert.equal(transpiled.diagnostics?.length ?? 0, 0);
const { readJsonObject } = await import(
  "data:text/javascript;base64," + Buffer.from(transpiled.outputText).toString("base64")
);
const make = (text, headers = {}) => new Request("https://example.invalid/functions/v1/test", {
  method: "POST",
  headers: { "content-type": "application/json", ...headers },
  body: text,
});

assert.deepEqual(await readJsonObject(make('{"hello":"world"}')), { hello: "world" });
assert.deepEqual(await readJsonObject(make('{"unicode":"✅"}')), { unicode: "✅" });
assert.deepEqual(await readJsonObject(make("{}"), 2), {});
assert.equal(await readJsonObject(make("null")), null);
assert.equal(await readJsonObject(make("[]")), null);
assert.equal(await readJsonObject(make('"hello"')), null);
assert.equal(await readJsonObject(make("123")), null);
assert.equal(await readJsonObject(make("true")), null);
assert.equal(await readJsonObject(make("{not json}")), null);
assert.equal(await readJsonObject(make(""), null), null);
assert.equal(await readJsonObject(make('{"a":1}'), 6), null, "Actual bytes must be bounded");
assert.equal(await readJsonObject(make('{"a":1}', { "content-length": "90000" })), null);
assert.equal(await readJsonObject(make('{"a":1}', { "content-length": "bad" })), null);
assert.equal(await readJsonObject(make('{"a":1}'), 0), null);
assert.equal(await readJsonObject(make('{"a":1}'), -1), null);

// Streamed body with intentionally untrustworthy Content-Length.
// The reader must reject based on bytes actually received.
let readCount = 0;
const stream = new ReadableStream({
  pull(controller) {
    readCount += 1;
    controller.enqueue(new TextEncoder().encode(readCount === 1 ? "{" : "x".repeat(1024)));
  },
  cancel() {},
});
const oversized = new Request("https://example.invalid/", {
  method: "POST",
  headers: { "content-length": "4" },
  body: stream,
  duplex: "half",
});
assert.equal(await readJsonObject(oversized, 100), null);
assert.ok(readCount <= 3, "Bounded parser must stop reading after budget exceeded");

const validImagePayload = JSON.stringify({
  image: "data:image/png;base64," + "A".repeat(4_000_000),
  hints: "food",
});
assert.equal((await readJsonObject(make(validImagePayload), 4_100_000))?.hints, "food");
console.log("PASS: bounded JSON object reader accepts valid objects and rejects malformed/oversized requests");
