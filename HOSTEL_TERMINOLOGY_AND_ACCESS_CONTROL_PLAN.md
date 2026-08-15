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

## Roadmap — present to user as next-step options, not built in this pass

### Phase B — `Bed` sub-unit (Hostel-only)
New Mongoose model `backend/src/modules/bed/bed.model.ts`: `societyId`, `flatId` (ref Flat/Room), `bedNumber`, `status: VACANT|OCCUPIED|MAINTENANCE|RESERVED`, `assignedResidentId?` (ref Resident), timestamps — full CRUD scaffold following the **LEASE module's file layout exactly** (`bed.types.ts`, `bed.validator.ts` (zod), `bed.service.ts`, `bed.controller.ts`, `bed.routes.ts`), since LEASE is the cleanest recent reference (confirmed structure via research: model → types → validator → service → controller → routes, no separate manifest file, permission constants inlined in `constants.ts`, module entry inlined in `modules.seed.ts`).

Recommendation: gate Bed's visibility by **vertical** (hidden entirely for COMMUNITY, same as the "Room" label swap), not by a new toggleable Module Registry entry — a hostel doesn't opt in/out of having beds, it's core to how the vertical works, similar to how Tower/Floor/Flat aren't optional either. Frontend surface: a "Beds" section inside each Room's detail view (not a new top-level Sidebar item), since beds are only meaningful in the context of one room.

### Phase C — `ACCESS_CONTROL` module ("Member Access Control")
New module folder `backend/src/modules/access-control/`, activating the already-reserved `ACCESS_CONTROL` module code (currently `COMING_SOON` placeholder in `modules.seed.ts`).

Key design decision from research: **build a fresh, parallel model set — do not widen SAMA's `AccessPolicy`/`AccessCredential`.** SAMA's `subjectType` union (`STAFF_PROFILE`/`SERVICE_PROVIDER`/`WORK_ORDER`) is duplicated across 4 files including a hard-coded dispatch in `samaSubject.service.ts` that imports staff/vendor models directly; SAMA is also its own independently-versioned, independently plan-gated module (`STANDARD+`) with an EdgeFolio-specific pull-sync pipeline. Coupling a resident/student amenity-access feature to that machinery risks migrations/rollbacks bleeding between two otherwise-independent modules for no real benefit (the query patterns are already fully segregated by subject anyway).

New models (copy the *pattern*, not the code): `Zone` (`zoneType: GATE|GYM|POOL|SPA|ROOM_BLOCK|OTHER`, optional `linkedGateId` ref to the existing shared `Gate` model — do **not** repurpose `Gate` itself, it's load-bearing for Visitor Management and Guard Assignment), `AccessPolicy` (`subjectType: RESIDENT|STUDENT`, `zoneIds[]`, schedule fields — mirrors SAMA's shape), `AccessCredential` (same hashed-identifier pattern as SAMA's), `AccessZoneDeviceBinding` (binds a zone to a Jenix `Device`).

Integration win found during research: unlike SAMA (which pulls from an external EdgeFolio API), our own U5/ESP32-gateway pipeline **already writes normalized events into `backend/src/modules/device/deviceEventLog.model.ts`** via the existing `device.service.ts` `pushEvent` path. So ACCESS_CONTROL's event consumption can just query `DeviceEventLog` directly (already in our own DB) instead of building any external sync — genuinely simpler than SAMA's integration, not harder.

Full end-to-end wiring checklist (traced from LEASE): backend model/service/controller/routes → permission constants in `constants.ts` → manifest replacing the `ACCESS_CONTROL` placeholder in `modules.seed.ts` (flip `status` to `ACTIVE`, fill in real `permissions`) → `useAccessControlModule.ts` hook (mirrors `useLeaseModule.ts`) → `access-control.permissions.ts` (mirrors `lease.permissions.ts`) → frontend page(s) → Sidebar/`sidebarNav.ts` moduleCode gating → `App.tsx` route registration at `/access` (matching the manifest's existing `routePrefix`).

### Recommended sequencing
Ship Phase A now. Then ask which of Bed (smaller, unlocks correct hostel occupancy modeling) or Access Control (larger, delivers the actual gate/gym-access feature the marketing page already promises as "Coming Soon") to build next — they're independent of each other, so either order works, but Access Control is the bigger lift and probably deserves its own focused planning pass once Bed (if wanted first) is out of the way, since Bed-level granularity may end up being a field on `AccessPolicy`'s subject resolution for HOSTEL (a policy scoped to a bed, not just a room) — building Bed first avoids re-touching Access Control's subject model twice.
