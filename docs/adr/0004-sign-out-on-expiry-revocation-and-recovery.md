# Sign users out when product access ends or a password is recovered

The owner decided on 2026-11-05 that **trial expiry and owner-driven access revocation sign affected users out**, rather than leaving them signed in at a gated screen. Password recovery should similarly terminate other sessions where supported and require fresh authentication. These are distinct events: expiry is time-based, revocation is an owner's decision, and recovery rotates credentials.

Product authorization must be checked server-side on protected operations at request time. Clearing browser storage or redirecting to `/login` is not a substitute for that check; terminating refresh sessions does not guarantee already-issued JWTs instantly become invalid. After a user's sign-out, their account and historical diary are not silently deleted. Exactly how expired or revoked users re-enter an account-only area for data export, deletion or restoration is a separate pending decision.

**Status:** accepted behavioral goal; implementation and revocation latency not yet verified.
