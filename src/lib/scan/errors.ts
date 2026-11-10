/** Safe, actionable errors. Never display raw provider responses or server secrets. */
export function friendlyScanError(code: string): string {
  switch (code) {
    case "AI_NOT_CONFIGURED":
    case "VISION_CONFIG":
    case "NOT_CONFIGURED":
      return "Photo scanning is unavailable because the service needs attention. You can still search or enter a food.";
    case "VISION_QUOTA":
      return "The AI photo provider has reached its usage limit. Try again later, or search for the food instead.";
    case "RATE_LIMIT":
      return "You've reached the photo-scan limit. Try again later or search for food instead.";
    case "VISION_MODEL":
      return "The configured AI photo model is unavailable. Search for food instead.";
    case "VISION_TIMEOUT":
      return "Photo analysis took too long. Try a smaller picture or search for food.";
    case "VISION_TEMPORARY":
      return "The photo-analysis provider is temporarily unavailable. Try again later or search for food.";
    case "VISION_REJECTED":
    case "INVALID_IMAGE":
      return "That photo couldn't be processed. Try another JPEG or PNG, or search for food.";
    case "VISION_EMPTY":
    case "LABEL_UNREADABLE":
      return "No usable nutrition information was detected. Try a clearer photo or enter it manually.";
    case "AUTH":
      return "Your session expired. Please sign in again before scanning.";
    case "NO_ACCESS":
      return "Your account does not have access to photo scanning.";
    case "SCAN_ENDPOINT_MISSING":
      return "Photo scanning has not been deployed to this app yet. Search for food instead.";
    case "SCAN_NETWORK":
      return "Can't reach the photo service. Check your connection and try again, or search for food.";
    case "SCAN_BAD_RESPONSE":
      return "The photo service returned an unexpected result. Please try again later or search for food.";
    case "BAD_REQUEST":
      return "The photo request could not be processed. Choose another photo or search for food.";
    default:
      return "Photo scanning failed. You can search for food while the service is unavailable.";
  }
}
const codes = new Set([
  "AI_NOT_CONFIGURED", "VISION_CONFIG", "NOT_CONFIGURED", "VISION_QUOTA",
  "RATE_LIMIT", "VISION_MODEL", "VISION_TIMEOUT", "VISION_TEMPORARY",
  "VISION_REJECTED", "INVALID_IMAGE", "VISION_EMPTY", "LABEL_UNREADABLE",
  "AUTH", "NO_ACCESS", "BAD_REQUEST", "AI_FAILED",
]);
export function scanErrorCodeFromHttp(errorCode: unknown, status: number | null): string {
  if (typeof errorCode === "string" && codes.has(errorCode)) return errorCode;
  if (status === 404) return "SCAN_ENDPOINT_MISSING";
  if (status === 401) return "AUTH";
  if (status === 403) return "NO_ACCESS";
  if (status === 429) return "RATE_LIMIT";
  if (status === 504) return "VISION_TIMEOUT";
  if (status === 500 || status === 502 || status === 503) return "VISION_TEMPORARY";
  return "SCAN_BAD_RESPONSE";
}
export function hasScanResponse(value: unknown): value is {
  items: unknown[]; overallConfidence: "low" | "medium" | "high";
} {
  if (!value || typeof value !== "object") return false;
  const body = value as Record<string, unknown>;
  return Array.isArray(body["items"]) &&
    ["low", "medium", "high"].includes(String(body["overallConfidence"])) &&
    body["items"].length <= 10;
}
