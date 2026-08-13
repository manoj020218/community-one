# Lease / Rent Management — Backend Implementation Plan

## Status

Frontend is **already built** and lives at `frontend/src/modules/lease/` (`LeasePage.tsx`, `LeaseFormModal.tsx`,
`LeasePaymentModal.tsx`, `LeaseLifecycleModal.tsx`, `useLeaseModule.ts`, `lease.permissions.ts`), wired into
`App.tsx` (`/lease` route) and `Sidebar.tsx` (nav group gated on module code `LEASE`). It calls the API contract
below. **Nothing in this document is optional or renegotiable on the frontend side without a frontend change** —
match the contract exactly and the UI works with zero further frontend work.

This is the backend counterpart. No existing collection, model, or route is modified except the four additive
edits listed in [Existing Files Touched](#existing-files-touched) — everything else is a new, isolated module.

## Why this shape (context for whoever picks this up)

The platform already runs multi-tenant, multi-admin: many Societies, each with their own admin/owner user
(`society.model.ts`, `SOCIETY_ADMIN` role, `Society.createdBy`). A landlord or hostel owner uses this platform
exactly the same way a society admin does today — they create one `Society` record per property they manage
(the label in the UI still says "Society"; that's a copy-only concern, not a data-model one — see
[Naming note](#naming-note)). Multiple owners, each with multiple properties, is already solved — do not build
new tenancy/ownership plumbing for that.

A rented flat is still a `Flat`. A tenant is still a `Resident` with `memberType: 'TENANT'` (already a valid
enum value in `resident.model.ts`). `Flat.occupancyStatus` already has `TENANT_OCCUPIED` / `VACANT`
(`flat.model.ts`) — Lease create/terminate should just flip that field, not invent a parallel occupancy concept.
`PaymentRecord` already carries a `moduleCode` field defaulting to `'CORE'` (`payment.model.ts`) specifically so
other modules can tag their payments without a schema change — Lease payments use `moduleCode: 'LEASE'` on the
**existing** `POST /api/payments` endpoint. **No changes to `Flat`, `Resident`, or `PaymentRecord` are needed.**

The only genuinely new concept is the **Lease** itself: the commercial terms of a tenancy (rent, deposit, term,
notice period) that sit on top of the Flat + Resident pairing that already exists. That's the entire scope of
the new module.

### Explicitly out of scope for this phase (do not build)

- **Recurring rent-due generation / auto-billing.** The frontend's "Record Payment" flow posts a `RECEIVED`
  payment directly (rent collected in the moment, like the existing PaymentPage flow) — there is no PENDING-dues
  concept yet. Do not wire this into the MCR billing-plan engine (`modules/mcr/*`): MCR's `BillingPlan` applies
  one uniform `amountPaise` per charge line to *every* flat in the society (see `demandDraft.service.ts`), which
  doesn't fit per-lease custom rent amounts without a real extension to that engine. That extension (plus the
  WhatsApp/UPI reminder pipeline in `mcrReminder.*`, which is hard-wired to `MaintenanceDemand`, not generic
  payments) is a legitimate Phase 2, not part of this ticket.
- **Per-bed sub-allocation.** That's the Hostel vertical's `Bed` concept, a separate, larger piece of work. Rent
  module works at the Flat/Room level only.
- Renaming `societyId` → `organisationId` or `Tower/Flat` → generic `Building/Unit` anywhere. Out of scope here.

## Data Model

New file: `backend/src/modules/lease/lease.model.ts`

```ts
export type LeaseStatus = 'ACTIVE' | 'EXPIRED' | 'TERMINATED' | 'RENEWED';

interface ILeaseDocument {
  societyId: string;          // ref Society
  flatId: string;             // ref Flat
  residentId: string;         // ref Resident — must have memberType 'TENANT'
  rentAmount: number;         // INR, plain number — matches PaymentRecord.amount convention (NOT paise; that's MCR's convention, not this module's)
  depositAmount: number;      // default 0
  depositRefundAmount?: number;
  depositRefundedAt?: Date;
  billingDay: number;         // 1-28, day of month rent is due (informational in Phase 1, used by Phase 2 auto-billing)
  startDate: Date;
  endDate: Date;
  noticePeriodDays: number;   // default 30
  status: LeaseStatus;        // default 'ACTIVE'
  terminationDate?: Date;
  terminationReason?: string;
  remarks?: string;
  createdBy: string;          // ref User
  isActive: boolean;
  createdAt, updatedAt: Date;
}
```

Indexes: `{ societyId: 1, status: 1 }`, `{ flatId: 1 }`, `{ residentId: 1 }`.

Validation rule worth enforcing in the service layer: reject creating a second `ACTIVE` lease on a `flatId` that
already has one (a flat can't have two concurrent active tenancies under this model).

## Module Files (all new, follow the existing `flat`/`resident` module shape — keep each file under ~200 lines)

```
backend/src/modules/lease/
  lease.model.ts
  lease.types.ts
  lease.validator.ts     (zod schemas — mirror flat/resident's validation style)
  lease.service.ts
  lease.controller.ts
  lease.routes.ts
```

### Service responsibilities

- `create(dto)`: validate no existing ACTIVE lease on `flatId`; create Lease; set
  `Flat.occupancyStatus = 'TENANT_OCCUPIED'` on the linked flat.
- `renew(id, { newEndDate, newRentAmount? })`: update `endDate` (and `rentAmount` if provided), set
  `status: 'ACTIVE'` (in case it had lapsed to `EXPIRED`).
- `terminate(id, { terminationDate, reason, depositRefundAmount? })`: set `status: 'TERMINATED'`,
  `terminationDate`, `terminationReason`, `depositRefundAmount`, `depositRefundedAt: now`; then check whether the
  flat has any other `ACTIVE` lease — if not, set `Flat.occupancyStatus = 'VACANT'`.
- `listBySociety(societyId, status?)`: paginated, populate `flatId` (flatNo) and `residentId` (name, mobile) —
  the frontend reads `lease.flatId.flatNo` and `lease.residentId.name` directly off the response, so these must
  be populated documents, not bare ObjectId strings.

## API Contract (must match exactly — this is what the frontend already calls)

```
GET   /api/leases/society/:societyId?status=&page=&limit=
      → { success: true, data: { items: Lease[], total, page, limit, totalPages } }
      (Lease.flatId and Lease.residentId populated)

POST  /api/leases
      body: { societyId, flatId, residentId, rentAmount, depositAmount, billingDay,
               startDate, endDate, noticePeriodDays, remarks }
      → { success: true, data: Lease }

POST  /api/leases/:id/renew
      body: { newEndDate, newRentAmount? }
      → { success: true, data: Lease }

POST  /api/leases/:id/terminate
      body: { terminationDate, reason, depositRefundAmount? }
      → { success: true, data: Lease }

GET   /api/leases/:id
      → { success: true, data: Lease }

PATCH /api/leases/:id
      (general field updates — remarks, billingDay, etc.)
```

Standard response envelope (`{ success, data }` / `{ success: false, error: { code, message } }`) — same as
every other module via the existing `errorHandler`/response helpers. No new envelope convention.

Payments and tenant creation reuse existing endpoints as-is — **do not add anything for these**:
- `POST /api/residents` with `{ societyId, flatId, name, mobile, memberType: 'TENANT', createdBy }` — used by
  the frontend's "+ Add new tenant" inline flow inside the lease form.
- `GET /api/residents/flat/:flatId` — used to list existing tenants for a flat when creating a lease.
- `POST /api/payments` with `{ societyId, flatId, memberId: residentId, amount, paymentPurpose: 'Rent - <period>', moduleCode: 'LEASE', paymentMode, paymentStatus: 'RECEIVED' }` —
  used by "Record Payment". Rent payment history can be queried later with the existing
  `GET /api/payments/society/:societyId` and filtering client-side on `moduleCode === 'LEASE'`.

## Permissions

Add to `backend/src/config/constants.ts` `PERMISSIONS`:

```ts
LEASE_CREATE: 'lease.create',
LEASE_READ: 'lease.read',
LEASE_UPDATE: 'lease.update',
LEASE_RENEW: 'lease.renew',
LEASE_TERMINATE: 'lease.terminate',
```

Wire `requirePermission(PERMISSIONS.LEASE_*)` into `lease.routes.ts` exactly like `flat.routes.ts` does.

## Existing Files Touched

Four small, purely-additive edits — nothing removed or restructured:

1. **`backend/src/config/constants.ts`** — add the 5 `LEASE_*` permission keys above.
2. **`backend/src/seeds/permissions.seed.ts`** — add those 5 keys to the `SOCIETY_ADMIN` array (JENIX_SUPER_ADMIN
   already inherits everything via `ALL_PERMISSIONS`).
3. **`backend/src/seeds/modules.seed.ts`** — add one entry to `MODULES_SEED`:
   ```ts
   { code: 'LEASE', name: 'Rent & Lease Management', description: 'Tenancy terms, rent collection and deposit tracking',
     version: '1.0.0', status: 'COMING_SOON', icon: 'FileText', routePrefix: '/lease', apiPrefix: '/api/leases',
     requiredPlan: ['BASIC','STANDARD','PREMIUM','ENTERPRISE'], defaultEnabled: false,
     permissions: ['lease.create','lease.read','lease.update','lease.renew','lease.terminate'] }
   ```
   Leave `status: 'COMING_SOON'` until this ships, then flip to `'ACTIVE'` in the same PR that finishes the
   module — an admin still has to explicitly enable it per-society from the existing Modules page
   (`ModuleRegistryPage.tsx`), same as MCR/SAMA today.
4. **`backend/src/app.ts`** — two lines:
   ```ts
   import leaseRoutes from './modules/lease/lease.routes';
   // ...
   app.use('/api/leases', leaseRoutes);
   ```

That's the complete footprint. No migration is needed since `Lease` is a brand-new collection, and the
`Flat.occupancyStatus` values written by this module (`TENANT_OCCUPIED`, `VACANT`) already exist in that enum.

## Naming note

Nothing here requires renaming `Society`/`Tower`/`Flat` in the schema. If a rent-only or hostel-only customer
finds the "Society/Tower" wording confusing in shared screens (Societies list, Towers page), that's a copy-level
fix (configurable terminology per organisation, as in the platform-vertical discussion), not something this
module should attempt — keep this ticket scoped to Lease.

## Suggested Build Order

1. `lease.model.ts` + `lease.types.ts`
2. `lease.service.ts` (create/renew/terminate/list/getById, with the Flat.occupancyStatus side effects)
3. `lease.validator.ts` + `lease.controller.ts` + `lease.routes.ts`
4. The four existing-file edits above
5. Manual test against the already-built frontend: enable `LEASE` for a test society via the Modules page, then
   run through Create Lease → Record Payment → Renew → Terminate end to end.
6. Unit tests: service-level (no double-ACTIVE-lease on one flat, occupancy flips correctly) + permission tests
   (a `TENANT`-role user must not be able to read other tenants' leases — scope by `societyId` the same way
   every other module does; no new scoping mechanism needed).
