// Shared helpers for Macromint Edge Functions.

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

export function errorResponse(code: string, message: string, status: number): Response {
  return json({ error: code, message }, status);
}

export function preflight(req: Request): Response | null {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  return null;
}

export const SYSTEM_ADMIN_ID = "00000000-0000-0000-0000-000000000000";

/**
 * Decode a small JSON object without buffering an arbitrarily large body.
 * Public and privileged Edge endpoints must reject null, arrays and
 * oversized request streams before consulting service-role credentials.
 * AI vision uses a larger explicit budget for a base64 image.
 *
 * Returns null for malformed input. Never returns raw request text or secrets.
 */
export async function readJsonObject(
  req: Request,
  maxBytes = 16_384,
): Promise<Record<string, unknown> | null> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) return null;

  const lengthHeader = req.headers.get("content-length");
  if (lengthHeader !== null) {
    const length = Number(lengthHeader);
    if (!Number.isSafeInteger(length) || length < 0 || length > maxBytes) return null;
  }
  if (!req.body) return null;

  const reader = req.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let bytes = 0;
  let payload = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes) {
        await reader.cancel("JSON payload exceeds size limit");
        return null;
      }
      payload += decoder.decode(value, { stream: true });
    }
    payload += decoder.decode();
    const value: unknown = JSON.parse(payload);
    if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
}
