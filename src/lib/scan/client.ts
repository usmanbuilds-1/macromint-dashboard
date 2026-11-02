// ── AI scan client ────────────────────────────────────────────────────────
// Endpoint resolution:
//   1. VITE_SCAN_ENDPOINT (explicit override)
//   2. Supabase Edge Function "ai-scan" (production)
//   3. /api/ai-scan local dev proxy (demo mode / local development)
// The response contract is identical everywhere.

import { getSupabase, IS_SUPABASE_CONFIGURED } from "@/lib/supabase";
import type { ScanResult } from "@/types";

export class ScanError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export interface ScanResponse {
  items: Array<ScanResult["items"][number] | Record<string, unknown>>;
  overallConfidence: ScanResult["overallConfidence"];
  notes?: string;
  attribution?: string | null;
  /** "client" = raw model items that need client-side grounding (demo mode). */
  grounding?: "client" | "server";
}

export function friendlyScanError(code: string): string {
  switch (code) {
    case "AI_NOT_CONFIGURED":
      return "AI scanning is not configured on the server yet. Set GEMINI_API_KEY or OPENAI_API_KEY in your Edge Function secrets (see docs/AI-SCANNING.md).";
    case "NO_ACCESS":
      return "Active access is required to use AI scanning.";
    case "RATE_LIMIT":
      return "Scan limit reached. Please try again later.";
    case "INVALID_IMAGE":
      return "That image could not be processed. Try a clearer JPEG or PNG.";
    default:
      return "The vision service could not analyse this photo. Please try again.";
  }
}

export async function scanImage(dataUrl: string, hints: string): Promise<ScanResponse> {
  const explicit = import.meta.env.VITE_SCAN_ENDPOINT;

  if (!explicit && IS_SUPABASE_CONFIGURED) {
    const { data, error } = await getSupabase().functions.invoke<ScanResponse & { error?: string; message?: string }>("ai-scan", {
      body: { image: dataUrl, hints },
    });
    if (error) {
      let code = "AI_FAILED";
      try {
        const ctx = (error as { context?: Response }).context;
        if (ctx) {
          const bodyErr = await ctx.clone().json();
          if (bodyErr?.error) code = bodyErr.error;
        }
      } catch {
        // non-JSON error body
      }
      throw new ScanError(code, friendlyScanError(code));
    }
    if (data?.error) throw new ScanError(data.error, friendlyScanError(data.error));
    return data as ScanResponse;
  }

  const endpoint = explicit ?? "/api/ai-scan";
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: dataUrl, hints }),
  });
  const payload = (await res.json().catch(() => null)) as (ScanResponse & { error?: string; message?: string }) | null;
  if (!res.ok || payload?.error) {
    const code = payload?.error ?? "AI_FAILED";
    throw new ScanError(code, friendlyScanError(code));
  }
  return payload as ScanResponse;
}

/** Downscale + re-encode an image file client-side before upload. */
export async function prepareImage(file: File, maxDim = 1280): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new ScanError("INVALID_IMAGE", "Canvas unavailable");
  ctx.drawImage(bitmap, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", 0.82);
}
