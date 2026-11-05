# Use one-time offline codes for username-only account recovery

Macro Mint's username-only accounts use eight private, single-use recovery codes for automated password resets, rather than pretending synthetic internal email identifiers can receive mail. The owner accepted this model on 2026-11-05 and rejected an insecure administrative password-reset shortcut. Losing all unused codes does not grant an automatic reset; any future staff-assisted pathway must be separately designed with identity verification.

The owner additionally agreed that successful password recovery should **invalidate other active sessions where supported and require fresh sign-in**. This requires provider-aware revocation testing: a valid access JWT might remain cryptographically valid until expiry even after refresh tokens are revoked. Protected server routes must not falsely rely on a browser-only logout.

**Status:** accepted; server/session revocation mechanism and real-world timing require implementation and live proof.
