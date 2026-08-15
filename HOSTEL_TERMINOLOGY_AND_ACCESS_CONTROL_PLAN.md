# Close the remaining Hostel/Community terminology gaps; scope Room→Bed and Member Access Control as follow-on work

## Context

The nav-bar login CTA is already fixed and verified. The user's broader ask bundles several things:

1. A couple of leftover pages that still hardcode "Society" instead of using the existing `terminologyFor()`/`useTerminology()` system (`frontend/src/utils/terminology.ts`) that already drives Sidebar, FlatPage, TowerPage, FloorPage, ResidentPage, OnboardPage, LoginPage.
2. "Room" for Hostel — this **already exists** today: `terminology.ts`'s `HOSTEL_TERMS.unit = 'Room'` relabels the existing Flat unit wherever `useTerminology()` is wired in (FlatPage, etc.). No code needed — just confirmed by reading the file, will visually verify.
3. "Bed" — genuinely does not exist anywhere in the codebase (confirmed via full-repo grep — the only 3 hits are a decorative icon import, and two planning docs that explicitly call it out as future scope: `LEASE_MODULE_BACKEND_PLAN.md` says *"Per-bed sub-allocation... a separate, larger piece of work"*). `Flat.occupancyStatus` is a single whole-unit enum, not a per-bed capacity count. This is a real new data model, not a label swap.
4. "Member Access Control" — the module code `ACCESS_CONTROL` is **already reserved** in `backend/src/seeds/modules.seed.ts` (name: "Member Access Control", description: "Gym, spa, pool access management", `status: COMING_SOON`, no implementation folder exists). This is exactly the module the user is describing. Per their answer to my clarifying question, this should be **one module, multi-purpose**: any society (COMMUNITY or HOSTEL) can define named "zones" (Main Gate, Gym, Pool, Room-Block-A, etc.), each bound to a device, with per-resident/per-student access policies — not two separate module codes.

Items 3 and 4 are each substantial, multi-file, new-model features (10-15+ new files apiece touching backend models/services/routes, module registry, permissions, and frontend pages). Building both in the same pass as the small terminology fixes would produce a huge, hard-to-review diff. This plan executes the safe, scoped fixes (item 1, 2) now, and lays out the recommended shape of items 3 and 4 as a roadmap to greenlight next — not implemented in this pass.

## Phase A — Implement now

### A1. `frontend/src/modules/settings/SettingsPage.tsx`
Wire in `useTerminology()` (same import used elsewhere) and swap the 3 hardcoded "Society" spots:
- Card header (currently `"Society Settings"`) → `` `${terms.org} Settings` ``
- Save button (currently `"Save Society Settings"`) → `` `Save ${terms.org} Settings` ``
- Success toast (currently `"Society settings saved!"`) → `` `${terms.org} settings saved!` ``

### A2. `frontend/src/modules/society/SocietyFormPage.tsx` — add a vertical picker
This is the JENIX_SUPER_ADMIN-only internal tool (`POST/PATCH /societies`, gated by `SOCIETY_CREATE`/`SOCIETY_UPDATE` permissions) used by the IOT Soft team to manually provision a client society — distinct from the public self-serve `/onboard` flow. It currently has zero vertical awareness and always creates `COMMUNITY` (the Mongoose default), leaving the team to fix it later via the wizard.

- Add local `const [vertical, setVertical] = useState<'COMMUNITY'|'HOSTEL'>(society?.vertical ?? 'COMMUNITY')`, synced in the existing `useEffect` that populates `form` from the fetched `society` on edit.
- Add an inline picker reusing the **exact card pattern already built** in `frontend/src/modules/onboarding/OnboardingWizard.tsx` (lines ~90-103: `Building2`/`BedDouble` icon cards, `border-primary-500 bg-primary-50` selected state, `CheckCircle2` "Selected" badge) — same visual language, no new component needed, just copy the JSX block with `vertical`/`setVertical` swapped in for the wizard's own state.
- Drive the page title, submit button, and toast off `terminologyFor(vertical)` (import from `utils/terminology.ts`) instead of hardcoded "Society": `` `Create ${terms.org}` `` / `` `Update ${terms.org}` `` / `` `${terms.org} created!` `` etc. — same pattern as `OnboardPage.tsx` already uses.
- Include `vertical` in the submitted payload (`mutation.mutate({ ...form, vertical })`).

### A3. `backend/src/modules/society/society.types.ts`
`CreateSocietyDto` is currently missing `vertical` entirely (confirmed by reading the file — only `UpdateSocietyDto` has it, since only the post-login wizard's PATCH sets it today). Add `vertical?: SocietyVertical;` to `CreateSocietyDto`. No other backend change needed: `societyService.create()` (`society.service.ts:19`) already does `Society.create({ ...dto, ... })`, so the field flows straight through to the schema (which already has the field with a `COMMUNITY` default and enum validation) — this is a one-line type widening, not new logic.

### Verification (Phase A)
1. `pnpm exec tsc --noEmit` in `frontend/` and `backend/` — must be clean.
2. Live browser check (already-open authenticated tab): navigate to `/settings`, confirm headers read per current society's vertical; visit `/societies/new` as JENIX_SUPER_ADMIN, confirm the picker renders, toggling it live-updates the title/button text, and submitting actually creates a society with the chosen `vertical` (verify via Mongo or the societies list).
3. Also re-confirm "Room" already works: open `/flats` on a society with `vertical: HOSTEL` (e.g. flip one via the wizard or the new picker) and confirm the page already says "Room"/"Rooms" — no code change expected here, this step is just visual confirmation for the user's benefit.
4. Deploy: commit, push, `git pull` + `pnpm run build` on the VPS, copy `dist/*` to `/var/www/community/`, `curl` smoke-check.

## Phase B — `Bed` sub-unit (Hostel-only) — SHIPPED 2026-08-15

Built and deployed as designed: `backend/src/modules/bed/` (model/types/validator/service/controller/routes, LEASE-style layout), gated by vertical (not Module Registry) — hidden entirely for Community. Frontend: expand-in-place Beds panel on `FlatPage.tsx`'s Room rows (generate/assign/release/maintenance), `BedAssignModal.tsx`. Full backend test suite green (29/29 suites, 87/87 tests) after the change. Commit `0706007`.

## Phase C — `ACCESS_CONTROL` module ("Member Access Control") — SHIPPED 2026-08-15

Re-verified fresh (not from stale notes) that this is still just a placeholder: `modules.seed.ts` has the seed row (`status: COMING_SOON`), `MODULE_CODES.ACCESS_CONTROL` exists in `constants.ts`, but there is no backend folder, no `/api/access` mount in `app.ts`, and no frontend page anywhere. The user had seen SAMA's real "Access" tab (Access Policies/Credentials/Device Bindings/Events for staff via EdgeFolio) and the Module Registry's card for this placeholder (which looks like a normal module card, just with a small "Coming" badge and no toggle button) and reasonably mistook one or both for this being already built.

**Hardware-driven scope boundary:** the U5 terminal makes its own local unlock decision from faces enrolled directly on the device — there's no bidirectional channel for Jenix to approve/deny entry live (confirmed: the whole pipeline is a one-way pull, device → `DeviceEventLog`). So this module is a **policy + record-keeping layer** (same as SAMA's own access-control already is for staff), not a live turnstile gate.

**Key gap found:** `DeviceEventLog.parsedEvents[]` only carries a raw `deviceExternalUserId` string with no existing mapping to a `Resident` — this module has to build that mapping itself.

**Design decisions:**
1. Fresh model set, not a SAMA extension (SAMA's `subjectType` union is hard-coded in 4 places incl. a model-import dispatch scoped to staff/vendor; SAMA is independently plan-gated/versioned).
2. `AccessPolicy.subjectType` is just `RESIDENT`, not `RESIDENT | STUDENT` — confirmed no `Student` model exists anywhere; Hostel "students" are `Resident` docs, `Student` is a frontend-only label.
3. `AccessCredential` is a **plain unhashed mapping** `{deviceId, deviceExternalUserId} → residentId`, deliberately simpler than SAMA's hashed PIN/RFID credentials, since a device-internal face-enrollment index isn't a secret.
4. **No changes to the `device` module** — `pushEvent` has no hook/emitter mechanism and it isn't being added; `AccessEvent` sync is a lazy pull from `DeviceEventLog` (same pattern as Lease's `syncExpiredLeases`) plus a manual `POST /access/sync`, so the hardware-proven push/poller pipeline is untouched.
5. Gated by the **Module Registry** (unlike Bed) — `requiredPlan: ['PREMIUM','ENTERPRISE']` from the existing placeholder, standard `useXModule()` + Sidebar gating.
6. File layout mirrors **SAMA** (closest-sized precedent) — one model/service/controller per sub-resource under `backend/src/modules/access-control/`, one aggregating `access-control.routes.ts`.

**Models:** `Zone` (zoneType GATE|GYM|POOL|SPA|ROOM_BLOCK|OTHER, optional `linkedGateId` ref to the existing shared `Gate` — not repurposing `Gate` itself), `ZoneDeviceBinding` (zone↔device, sync cursor), `AccessCredential` (device↔resident mapping), `AccessPolicy` (resident + zones + schedule, mirrors SAMA's shape), `AccessEvent` (synced from `DeviceEventLog`, dedupe unique index).

**Routes:** `/zones`, `/zones/:id/bind-device`, `/bindings/:id/unbind`, `/credentials` (+`/revoke`), `/policies`, `/events` (lazy-syncs first), `/sync` (manual), `/events/:id/resolve`.

**Wiring:** `constants.ts` permissions (`ACCESS_ZONE_MANAGE`, `ACCESS_CREDENTIAL_MANAGE`, `ACCESS_POLICY_MANAGE`, `ACCESS_EVENT_VIEW`, `ACCESS_EVENT_RESOLVE`, `ACCESS_SYNC`) → `access-control.manifest.ts` (replaces the inline placeholder, `status: ACTIVE`) → `permissions.seed.ts` grant → `app.ts` mount at `/api/access` → re-run `pnpm run seed` on deploy. Frontend: `access-control.permissions.ts`, `useAccessControlModule.ts`, `AccessControlPage.tsx` (mirrors `SamaAccessTab.tsx`'s stacked-card layout), `/access` route in `App.tsx`, Sidebar/`sidebarNav.ts` moduleCode gating.

**Verification:** tsc clean (backend+frontend), frontend build clean, full jest suite green, live check (enable module → create zone → bind device → issue credential → sync → confirm resolved AccessEvent), then commit/push/VPS deploy (`pnpm run seed` included) + curl smoke-check `/api/access/zones` returns 401 unauthenticated.
