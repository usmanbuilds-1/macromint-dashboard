# Reactivation requests use an owner-only queue with no automatic grant

On 2026-11-05 the owner chose to receive tester reactivation requests inside Macro Mint's Admin panel rather than via external support, and to remain the exclusive initial authority for restoring product access. A request records the account and its reason/status but is **not** an entitlement or approval. Request submission, queue reads and owner decisions need server-enforced identity/role checks, privacy isolation, abuse limits and auditable state transitions. Restoring access uses the existing account and login credentials, not a fresh invitation or second trial.

This imposes additional backend workflow complexity but keeps decisions tied to authenticated accounts and avoids manual copying of private user details into email or chat. Existing admin audit and user-list endpoints are not a substitute for a dedicated request workflow.

**Status:** accepted architecture. Eligibility of revoked users to request restoration, duplicate-request handling, and when an approved extension begins are unresolved. No request queue has been implemented or deployed.
