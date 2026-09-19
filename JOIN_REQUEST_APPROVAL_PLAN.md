# Join-by-Code + Admin-Approval Flow — Plan

## Problem

Members currently have no self-service path onto the platform — every login is provisioned by an admin (`residentService.grantLogin`). That's safe (no duplicate-society risk, no society directory exposed) but means a resident who hasn't been added yet has no way in except asking the admin directly. We're adding a self-service **request to join** flow that still keeps the admin in the loop for every new login — it does not touch or weaken the existing admin-provisioned pattern at all; it's purely additive.

## Design

1. Member enters their **society code** (the `Society.code` field that already exists — created at `onboard-society` time, e.g. `BLUEDIAMOND1234`) plus their name/mobile/email/claimed flat number.
2. Backend looks up the society by code only — never returns a list of societies, never exposes how many societies exist. Confirms the name back to the member ("Is this your society: Blue Diamond Heights?") before they submit.
3. On submit, backend checks for an existing active `Resident` in that society with a matching mobile that has no login yet (`userId` unset). Two outcomes, both go to a `JoinRequest` row (status `PENDING`) and notify all `SOCIETY_ADMIN`/`ACCOUNTANT` users of that society — nothing is auto-approved, since there's no phone/OTP verification in this app to prove the member actually owns that mobile number:
   - **Matched** — an existing Resident record already has this mobile. Admin review is a one-click "Approve & Grant Login" that's functionally identical to the existing Grant Login action (`residentService.grantLogin`), just reached from the join-request queue instead of the Residents table.
   - **Unmatched** — no existing Resident record. Admin picks a flat + member type during approval, which creates a new Resident (`residentService.create`) and immediately grants it a login — i.e. exactly "Add Resident" + "Grant Login" combined into one review action.
4. Rejecting a request just marks it `REJECTED` with an optional reason — no account, no resident record, nothing created.
5. Existing admin-provisioned pattern (`Add Resident` → `Grant Login` on the Residents page) is untouched — this is a second front door into the exact same underlying primitives, not a replacement.

## New backend module: `joinRequest`

- `JoinRequest` model: `societyId`, `name`, `mobile`, `email?`, `claimedFlatNo?`, `matchedResidentId?`, `status` (`PENDING`/`APPROVED`/`REJECTED`), `reviewedBy?`, `reviewedAt?`, `rejectionReason?`, `resultingResidentId?`, `resultingUserId?`.
- `POST /api/join-requests/lookup-society` — public, rate-limited (`authRateLimiter`). Body `{ code }` → `{ societyId, name }`. 404 if not found.
- `POST /api/join-requests` — public, rate-limited. Body `{ societyCode, name, mobile, email?, claimedFlatNo? }`. Rejects if a `User` already exists for that mobile (points them to Login instead), or if a `PENDING` request already exists for that mobile+society. Computes `matchedResidentId`, creates the row, notifies admins.
- `GET /api/join-requests/society/:societyId?status=PENDING` — admin, permission `resident.join.review`.
- `POST /api/join-requests/:id/approve` — admin, same permission. Body is `{ password }` if matched, `{ flatId, memberType, primaryContact?, password }` if not. Delegates to `residentService.create`/`residentService.grantLogin` — no duplicated business logic.
- `POST /api/join-requests/:id/reject` — admin, same permission. Body `{ reason? }`.

New permission `PERMISSIONS.RESIDENT_JOIN_REVIEW = 'resident.join.review'`, granted to `SOCIETY_ADMIN` and `ACCOUNTANT` in `seeds/permissions.seed.ts` — **`pnpm run seed` must be re-run in each environment (including the VPS) for existing roles to pick it up.**

## New frontend

- `modules/auth/JoinSocietyPage.tsx` at `/join` — public route, styled like `LoginPage` (not under `MarketingLayout`, since it needs to work correctly inside the Capacitor shell). Two-step form: code → confirm society name → details → "Request submitted, an admin will approve it" screen.
- `modules/resident/JoinRequestsPage.tsx` at `/join-requests` — admin queue, gated by `resident.join.review` permission, mirrors `ResidentPage`'s Grant Login modal for the approve flow and `ConfirmDialog` for reject.
- `LoginPage.tsx` gets a second link under the existing "Register your society" one: "Already a member? Join with your society code".
- Sidebar entry added under Society Setup, gated by the same permission.

## What this deliberately does not do

- No SMS/OTP verification (none exists in this codebase) — the admin approval step is the trust boundary instead, exactly like the existing Grant Login flow already relies on the admin, not the resident, to set the password.
- No auto-created logins under any circumstance, even on an exact mobile match — a match is a strong hint for the admin's review queue, not proof of identity.
