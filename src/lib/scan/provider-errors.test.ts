import { describe, expect, it } from "vitest";
import {
  classifyVisionHttpStatus, classifyVisionException,
  safeGeminiReason, publicVisionMessage, VisionProviderFailure,
} from "../../../supabase/functions/ai-scan/provider-errors";

describe("safe vision provider error classification", () => {
  it("distinguishes quota, authentication, missing models, overload and timeouts", () => {
    expect(classifyVisionHttpStatus("gemini",429).code).toBe("VISION_QUOTA");
    expect(classifyVisionHttpStatus("gemini",402).code).toBe("VISION_QUOTA");
    expect(classifyVisionHttpStatus("gemini",403).code).toBe("VISION_CONFIG");
    expect(classifyVisionHttpStatus("gemini",404).code).toBe("VISION_MODEL");
    expect(classifyVisionHttpStatus("gemini",503).code).toBe("VISION_TEMPORARY");
    expect(classifyVisionHttpStatus("gemini",504).code).toBe("VISION_TIMEOUT");
  });
  it("recognizes an invalid API key without exposing its error text", () => {
    const payload={error:{message:"API key is abc-secret",details:[{reason:"API_KEY_INVALID"}]}};
    const reason=safeGeminiReason(payload);
    expect(reason).toBe("API_KEY_INVALID");
    const failure=classifyVisionHttpStatus("gemini",400,reason);
    expect(failure.code).toBe("VISION_CONFIG");
    expect(publicVisionMessage(failure.code)).not.toContain("abc-secret");
  });
  it("does not expose untrusted provider error messages", () => {
    const bad=classifyVisionHttpStatus("openai",500);
    expect(bad.message).toBe("VISION_TEMPORARY");
    expect(bad.httpStatus).toBe(503);
    expect(publicVisionMessage(bad.code)).toContain("temporarily unavailable");
  });
  it("distinguishes network timeouts from general failures", () => {
    expect(classifyVisionException("gemini",{name:"TimeoutError"}).code).toBe("VISION_TIMEOUT");
    expect(classifyVisionException("gemini",new Error("example sensitive URL")).code).toBe("VISION_TEMPORARY");
  });
  it("preserves an already classified provider failure", () => {
    const failure = new VisionProviderFailure("VISION_QUOTA",429,"gemini",429);
    expect(classifyVisionException("gemini",failure)).toBe(failure);
  });
});
