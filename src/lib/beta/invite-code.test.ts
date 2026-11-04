import { describe, expect, it } from "vitest";
import { isValidInviteCode } from "./invite-code";

describe("private beta invitation format", () => {
  it("accepts a 160-bit code with the same prefix and length as the Edge generator", () => {
    expect(isValidInviteCode("MM-" + "A".repeat(40))).toBe(true);
    expect(isValidInviteCode("mm-" + "b".repeat(40))).toBe(true);
  });
  it("rejects publicly reused sample codes, ambiguous symbols and truncation", () => {
    for (const sample of [
      "MINT-BETA-2026-START",
      "MM-" + "F".repeat(39),
      "MM-" + "F".repeat(41),
      "MM-" + "Z".repeat(40),
      "MM-" + "a".repeat(20) + "\n",
    ]) {
      expect(isValidInviteCode(sample)).toBe(false);
    }
  });
});
