import { describe, expect, it } from "vitest";
import { friendlyScanError, scanErrorCodeFromHttp, hasScanResponse } from "./errors";

describe("photo scan errors with actionable and secret-safe messaging", () => {
  it("distinguishes provider exhausted quota and account scan limits", () => {
    expect(friendlyScanError("VISION_QUOTA")).toMatch(/provider.*usage limit/i);
    expect(friendlyScanError("RATE_LIMIT")).toMatch(/photo-scan limit/i);
  });
  it("doesn't expose API key or internal secret variable names", () => {
    for (const code of ["VISION_CONFIG","AI_NOT_CONFIGURED","NOT_CONFIGURED","AI_FAILED"]) {
      const message = friendlyScanError(code);
      expect(message).not.toMatch(/GEMINI_API_KEY|OPENAI_API_KEY|LOVABLE_API_KEY|secret|Bearer/i);
    }
  });
  it("handles Supabase HTTP failures with or without structured JSON", () => {
    expect(scanErrorCodeFromHttp("VISION_QUOTA",429)).toBe("VISION_QUOTA");
    expect(scanErrorCodeFromHttp(undefined,404)).toBe("SCAN_ENDPOINT_MISSING");
    expect(scanErrorCodeFromHttp("untrusted_secret",503)).toBe("VISION_TEMPORARY");
    expect(scanErrorCodeFromHttp("another",504)).toBe("VISION_TIMEOUT");
  });
  it("rejects broken backend success payloads rather than claiming recognition", () => {
    expect(hasScanResponse({items:[],overallConfidence:"low"})).toBe(true);
    expect(hasScanResponse({message:"hello"})).toBe(false);
    expect(hasScanResponse({items:[],overallConfidence:"very high"})).toBe(false);
    expect(hasScanResponse(null)).toBe(false);
  });
});
