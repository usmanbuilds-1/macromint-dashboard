# Reserve invitation and entitlement administration for the verified owner

The first private-beta release reserves invitation creation/revocation, access grants/revocations and platform-setting changes to the **verified owner account**, not merely anyone with an admin record. The owner agreed to this boundary on 2026-11-05, preferring explicit operator authorization over automatically granted or broad administrator privileges. Promotion happens only after verifying the actual account identity; it must never derive from a chosen username or invitation possession. Backend role enforcement is required independently of a hidden UI.

**Status:** accepted; implementation parity is outstanding. Existing `beta-invites` and `admin-action` handlers currently accept an `admin_users` row without requiring `role = owner`. This is a release security task, not evidence that owner-only policy is already enforced.
