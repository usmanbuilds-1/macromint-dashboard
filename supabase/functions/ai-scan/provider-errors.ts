/**
 * Classification of vision-provider failures without exposing provider payloads,
 * photo data, user notes, credentials or potentially identifying request URLs.
 */
export type VisionFailureCode =
  | "VISION_QUOTA" | "VISION_CONFIG" | "VISION_MODEL"
  | "VISION_TEMPORARY" | "VISION_TIMEOUT" | "VISION_REJECTED"
  | "VISION_EMPTY" | "AI_FAILED";

export class VisionProviderFailure extends Error {
  constructor(
    public readonly code: VisionFailureCode,
    public readonly httpStatus: number,
    public readonly provider: "gemini" | "openai" | "lovable",
    public readonly providerStatus: number | null,
  ) {
    super(code);
    this.name = "VisionProviderFailure";
  }
}

export function classifyVisionHttpStatus(
  provider: VisionProviderFailure["provider"],
  httpStatus: number,
  reason: string | null = null,
): VisionProviderFailure {
  const code: VisionFailureCode =
    reason === "API_KEY_INVALID" || reason === "FAILED_PRECONDITION"
      ? "VISION_CONFIG"
      : httpStatus === 402 || httpStatus === 429
        ? "VISION_QUOTA"
        : httpStatus === 401 || httpStatus === 403
          ? "VISION_CONFIG"
          : httpStatus === 404
            ? "VISION_MODEL"
            : httpStatus === 408 || httpStatus === 504
              ? "VISION_TIMEOUT"
              : [500, 502, 503].includes(httpStatus)
                ? "VISION_TEMPORARY"
                : httpStatus === 400 || httpStatus === 422
                  ? "VISION_REJECTED"
                  : "AI_FAILED";
  const publicStatus = code === "VISION_QUOTA" ? 429
    : code === "VISION_TIMEOUT" ? 504
    : code === "VISION_REJECTED" ? 502
    : code === "AI_FAILED" ? 502 : 503;
  return new VisionProviderFailure(code, publicStatus, provider, httpStatus);
}

export function safeGeminiReason(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const err = (payload as Record<string, unknown>)["error"];
  if (!err || typeof err !== "object") return null;
  const e = err as Record<string, unknown>;
  const details = Array.isArray(e["details"]) ? e["details"].slice(0, 5) : [];
  const reasons = [
    e["status"],
    ...details.map((d) => d && typeof d === "object"
      ? (d as Record<string, unknown>)["reason"] : null),
  ];
  const allow = new Set(["API_KEY_INVALID", "FAILED_PRECONDITION"]);
  return reasons.find((r): r is string => typeof r === "string" && allow.has(r)) ?? null;
}

export function classifyVisionException(
  provider: VisionProviderFailure["provider"],
  error: unknown,
): VisionProviderFailure {
  if (error instanceof VisionProviderFailure) return error;
  const name = error && typeof error === "object" && "name" in error
    ? String((error as { name: unknown }).name) : "";
  if (name === "TimeoutError" || name === "AbortError") {
    return new VisionProviderFailure("VISION_TIMEOUT", 504, provider, null);
  }
  return new VisionProviderFailure("VISION_TEMPORARY", 503, provider, null);
}

export function publicVisionMessage(code: VisionFailureCode): string {
  switch (code) {
    case "VISION_QUOTA": return "Photo analysis is at its AI-provider limit. Try again later or search for food.";
    case "VISION_CONFIG": return "Photo analysis is unavailable due to a server configuration issue. Search for food instead.";
    case "VISION_MODEL": return "The configured photo model is unavailable. Search for food instead.";
    case "VISION_TEMPORARY": return "The photo service is temporarily unavailable. Try again later or search for food.";
    case "VISION_TIMEOUT": return "Photo analysis took too long. Try a smaller picture or search for food.";
    case "VISION_REJECTED": return "The photo service could not process this request. Try another photo or search for food.";
    case "VISION_EMPTY": return "The photo service returned no usable results. Try a clearer picture or search for food.";
    default: return "Photo analysis failed. Search for food or try again later.";
  }
}
