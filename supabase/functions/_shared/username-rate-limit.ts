/**
 * DB-backed abuse budget for public username endpoints.
 *
 * These endpoints use the service role and therefore MUST NOT accept unlimited
 * unauthenticated requests. Hash the rate-limit keys with a server-only secret:
 * no plaintext IP, invitation code, or username is stored in the database.
 *
 * The edge gateway / trusted proxy must additionally enforce IP-level limits.
 * x-forwarded-for alone is not cryptographic proof of client identity.
 */
type Scope = "register_ip" | "register_invite" | "recover_ip" | "recover_username";
type Budget = { scope: Scope; subject: string; maximum: number; seconds: 900 | 3600 | 86400 };
type Consume = (budget: { p_scope: Scope; p_key_hash: string; p_limit: number; p_window_seconds: number }) =>
  PromiseLike<{ data: unknown; error: unknown }>;

const encoder = new TextEncoder();

function requestIp(req: Request): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = (req.headers.get("cf-connecting-ip") ?? forwarded?.split(",")[0] ?? "").trim();
  // Reject missing, ambiguous or obviously malformed addresses. Proxy forwarding
  // must be verified separately before release.
  return /^[0-9a-fA-F:.]{3,65}$/.test(ip) ? ip.toLowerCase() : null;
}

export async function checkUsernameAuthBudget(
  req: Request,
  kind: "register" | "recover",
  identifier: string,
  consume: Consume,
): Promise<"allowed" | "limited" | "unavailable"> {
  const secret = Deno.env.get("USERNAME_AUTH_RATE_LIMIT_SECRET");
  const ip = requestIp(req);
  if (!secret || secret.length < 32 || !ip) return "unavailable";

  const hmacKey = await crypto.subtle.importKey(
    "raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const budgets: Budget[] = kind === "register"
    ? [
        { scope: "register_ip", subject: ip, maximum: 10, seconds: 3600 },
        { scope: "register_invite", subject: identifier.toLowerCase(), maximum: 6, seconds: 3600 },
      ]
    : [
        { scope: "recover_ip", subject: ip, maximum: 12, seconds: 3600 },
        { scope: "recover_username", subject: identifier.toLowerCase(), maximum: 6, seconds: 86400 },
      ];

  for (const budget of budgets) {
    const signature = await crypto.subtle.sign(
      "HMAC", hmacKey, encoder.encode(`${budget.scope}:${budget.subject}`),
    );
    const keyHash = Array.from(new Uint8Array(signature), (byte) =>
      byte.toString(16).padStart(2, "0")).join("");
    const { data, error } = await consume({
      p_scope: budget.scope,
      p_key_hash: keyHash,
      p_limit: budget.maximum,
      p_window_seconds: budget.seconds,
    });
    if (error || typeof data !== "boolean") return "unavailable";
    if (!data) return "limited";
  }
  return "allowed";
}
