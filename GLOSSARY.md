# Macro Mint — Identity and Access

Private-beta terminology for account enrollment, governance, recovery, and usage.

## Enrollment

**Private Beta**:
A restricted testing period in which new participants need an invitation to register. Being in the beta does not itself confer ongoing complimentary access.
_Avoid_: Free beta entitlement

**Invitation**:
A short-lived, limited-redemption credential permitting account creation. It is not a login credential or a subscription.
_Avoid_: Access pass, login code

**Tester**:
A person admitted into the private beta who uses an ordinary Macro Mint account subject to its access entitlement.
_Avoid_: Permanent free user

## Identity and governance

**Account**:
A distinct person's login identity and its own tracking data, access status, and recovery materials.
_Avoid_: Invitation, session

**Session**:
An authenticated connection between one signed-in device or browser and an account. A session is not proof of current product access.
_Avoid_: Entitlement

**Owner**:
The verified platform operator with exclusive initial authority to issue invitations and change other users' access.
_Avoid_: Any administrator

**Administrator**:
A privileged operator account. Administrative permissions are separate from ordinary user access and must be explicitly granted.
_Avoid_: Tester with access

**Entitlement**:
The recorded basis and duration of a user's permission to use protected product features, such as an active trial, paid access, complimentary grant, or revocation.
_Avoid_: Invitation

**Trial**:
Time-limited product access granted to a new account under the same policy for beta participants and future customers, unless a separately authorized override is made.
_Avoid_: Beta invitation

**Trial Expiry**:
The point when a trial no longer grants product access. The approved user-facing policy is to sign the tester out, not leave them in a locked app.
_Avoid_: Account deletion

**Access Revocation**:
An owner-imposed loss of product permission requiring that the affected user be signed out and protected operations denied.
_Avoid_: Deleting their data

**Restricted Account Access**:
A limited authenticated state for an expired or revoked account to export or delete its own data, and for eligible users to request reactivation, without access to paid tracking features.
_Avoid_: Active product access, complimentary access

**Access Restoration**:
An owner-authorized change that allows a previously blocked account to use the product again with its existing login credentials.
_Avoid_: New account registration

**Reactivation Request**:
A single pending appeal per account for owner reconsideration of expired, revoked or suspended product access. The requester can see its status; submitting a request never grants access.
_Avoid_: Automatic trial extension

**Reactivation Decision**:
An owner-issued approval or denial of an appeal, with a mandatory private audit reason. Approval affects entitlement at decision time, not next login.
_Avoid_: Silent access grant

**Data Export**:
A user-initiated download of the requesting account's own stored data; it does not grant access to product features.
_Avoid_: Automatic backup, subscription entitlement

## Recovery and scanning

**Recovery Code**:
A private, single-use backup credential that lets a username-only account reset its password without receiving email.
_Avoid_: Invitation, verification email

**AI Scan Attempt**:
A submitted food-photo analysis request that is counted toward the account's usage allowance, regardless of whether a provider returns a useful estimate.
_Avoid_: Guaranteed successful scan
