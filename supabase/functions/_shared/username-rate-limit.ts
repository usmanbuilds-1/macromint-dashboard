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

/**
 * Read only the dedicated edge-proxy client-IP header. X-Forwarded-For is
 * caller-controlled on many proxy chains; its first element is not safe for
 * rate limiting. If the trusted header is absent or malformed, fail closed.
 *
 * DEPLOYMENT GATE: Do not enable USERNAME_*_RATE_LIMIT_VERIFIED until an
 * external spoofed-header probe confirms that this project's managed ingress
 * overwrites client-supplied CF-Connecting-IP and has no origin bypass.
 */
export function requestIp(req: Request): string | null {
  const raw = req.headers.get("cf-connecting-ip");
  if (!raw) return null;
  const ip = raw.trim().toLowerCase();
  if (ip.includes(",") || /\s/.test(ip)) return null;

  // Strict dotted-quad IPv4; reject invalid octets and ambiguous leading zeros.
  const v4 = ip.match(/^(0|[1-9]\d{0,2})\.(0|[1-9]\d{0,2})\.(0|[1-9]\d{0,2})\.(0|[1-9]\d{0,2})$/);
  if (v4) return v4.slice(1).every((octet) => Number(octet) <= 255) ? ip : null;

  // URL parsing rejects malformed IPv6 and provides one stable canonical form.
  // Unusual IPv4-mapped spellings fail closed instead of treating variants as
  // distinct rate-limit keys.
  if (!ip.includes(":") || !/^[0-9a-f:]+$/.test(ip)) return null;
  try {
    const hostname = new URL(`http://[${ip}]/`).hostname;
    return hostname.startsWith("[") && hostname.endsWith("]")
      ? hostname.slice(1, -1)
      : null;
  } catch {
    return null;
  }
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
