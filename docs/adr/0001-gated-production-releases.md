# Gate live account and billing activation on provider evidence

Status: accepted for source release planning; operational activation remains unverified.

Macro Mint separates shipping tested frontend/source code from activating Cloud Auth, account privileges, financial collection, and rewarded account access. The repository's private beta docs record migrations, trusted ingress/IP checks, user-isolation tests, and backend feature flags as hard dependencies, while payment and ad providers are not configured. We choose to keep entitlement-affecting features fail-closed until server-authoritative live verification, rather than equating a green CI build or a published Lovable page with a secure release. This sacrifices immediate signup and monetization convenience in exchange for avoiding unrecoverable account and financial mistakes.
