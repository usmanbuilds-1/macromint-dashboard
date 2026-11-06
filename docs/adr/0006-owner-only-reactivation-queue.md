# Reactivation requests use an owner-only queue with no automatic grant

On 2026-11-05 the owner chose to receive tester reactivation requests inside Macro Mint's Admin panel rather than via external support, and to remain the exclusive initial authority for restoring product access. A request records the account and its reason/status but is **not** an entitlement or approval. Request submission, queue reads and owner decisions need server-enforced identity/role checks, privacy isolation, abuse limits and auditable state transitions. Restoring access uses the existing account and login credentials, not a fresh invitation or second trial.

This imposes additional backend workflow complexity but keeps decisions tied to authenticated accounts and avoids manual copying of private user details into email or chat. Existing admin audit and user-list endpoints are not a substitute for a dedicated request workflow.

The owner approved the following on 2026-11-05: expired, revoked and suspended accounts may submit an appeal; each account has at most **one pending request** and may see its own status; approving an extension takes effect **when the owner approves**, even for offline users, not on their next login. Owner approvals and denials require an audit reason; suspension and entitlement restoration require one as well. The reason must not be optional in the sensitive action's backend contract. No request may grant access by merely being created or read.

**Status:** accepted architecture; queue persistence/UI, server-side unique-pending constraint, decision endpoints, authorization and live tests are outstanding. Denial-message visibility, repeat requests after denial and approval duration choices remain open decisions.
