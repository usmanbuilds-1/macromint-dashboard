import { describe, expect, it } from "vitest";
import {
  canonicalUsername,
  identifierToAuthEmail,
  isValidUsername,
  publicAccountLabel,
  usernameFromAuthEmail,
  usernameToEmail,
} from "./username";

describe("username adapter (not a password recovery channel)", () => {
  it("normalises case and optional boundary whitespace without losing characters", () => {
    expect(canonicalUsername("  Alex_Mint ")).toBe("alex_mint");
    expect(usernameToEmail("  ALEX_MINT  ")).toBe("alex_mint@macromint.internal");
    expect(usernameToEmail("alex_mint")).toBe(usernameToEmail("ALEX_MINT"));
  });
  it("never silently strips punctuation into a different user's identity", () => {
    for (const invalid of ["a", "ab", "a".repeat(21), "alex-mint", "alex.mint", "al ex", "álêx", "tester@example.com", "abc\nxyz"]) {
      expect(isValidUsername(invalid)).toBe(false);
      expect(() => usernameToEmail(invalid)).toThrow(RangeError);
    }
  });
  it("allows strict 3–20-character ASCII alphanumeric underscores", () => {
    for (const name of ["abc", "Aa_12", "_abc", "a".repeat(20)]) {
      expect(isValidUsername(name)).toBe(true);
    }
  });
  it("keeps existing real email identities as email accounts", () => {
    expect(identifierToAuthEmail(" Admin@Example.com ")).toBe("admin@example.com");
    expect(identifierToAuthEmail("Jane_15")).toBe("jane_15@macromint.internal");
    expect(() => identifierToAuthEmail("not@@example.com")).toThrow(RangeError);
  });
  it("does not expose internal synthetic identity to the UI", () => {
    expect(usernameFromAuthEmail("TESS_7@MACROMINT.INTERNAL")).toBe("tess_7");
    expect(usernameFromAuthEmail("user@example.com")).toBeNull();
    expect(publicAccountLabel({ email: "alex_mint@macromint.internal", name: "Alex" })).toBe("@alex_mint");
    expect(publicAccountLabel({ username: "ALEX_MINT", email: "alex_mint@macromint.internal" })).toBe("@alex_mint");
    expect(publicAccountLabel({ email: "admin@example.com" })).toBe("admin@example.com");
    expect(publicAccountLabel({ name: "A person" })).toBe("A person");
  });
});
