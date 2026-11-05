# Use one-time offline codes for username-only account recovery

Macro Mint's username-only accounts use eight private, single-use recovery codes for automated password resets, rather than pretending synthetic internal email identifiers can receive mail. The owner accepted this model on 2026-11-05 and rejected an insecure administrative password-reset shortcut. Losing all unused codes does not grant an automatic reset; any future staff-assisted pathway must be separately designed with identity verification.

**Status:** accepted; whether a successful reset must invalidate existing sessions is an open decision and requires runtime verification.
