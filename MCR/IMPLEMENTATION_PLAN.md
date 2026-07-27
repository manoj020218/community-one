# MCR Implementation Plan

Date: July 25, 2026
Status: Phase 0 planning complete
Scope: Repository-specific execution plan for the MCR module

## 1. Objective

Implement a new `MCR` module for maintenance collection and receipt management with:

- Minimal disturbance to the existing platform.
- Strict tenant isolation and permission enforcement.
- Financial correctness, auditability, and idempotency.
- Reuse of existing auth, module gating, audit, file, and notification infrastructure.

This plan is based on the actual repository structure, not only the product prompt.

## 2. Phase 0 findings

### 2.1 Current platform shape

- Backend: Express + Mongoose + TypeScript in `backend/src`.
- Frontend: React + Vite + TypeScript in `frontend/src`.
- Existing feature modules already live under:
  - `backend/src/modules/*`
  - `frontend/src/modules/*`
- Routing is hard-wired today:
  - Backend route registration: `backend/src/app.ts`
  - Frontend route registration: `frontend/src/App.tsx`

### 2.2 Existing reusable systems

- Society module enable/disable:
  - `backend/src/modules/moduleRegistry/*`
- Auth and permission middleware:
  - `backend/src/common/middleware/auth.ts`
  - `backend/src/common/utils/authScope.ts`
- Audit logging:
  - `backend/src/modules/audit/*`
- File storage and upload metadata:
  - `backend/src/modules/fileAsset/*`
- Notifications and push provider abstraction:
  - `backend/src/modules/notification/*`
- Background interval worker pattern:
  - `backend/src/common/scheduler/intervalScheduler.ts`
  - `backend/src/modules/visitor/visitor.expiry.worker.ts`
- Module-gated access pattern already exists in Visitor:
  - `backend/src/modules/visitor/visitor.access.service.ts`
  - `backend/src/modules/visitor/visitor.settings.service.ts`

### 2.3 Existing repo constraints

- The repo is not plugin-loaded at runtime; module registration is manual.
- A placeholder maintenance module already exists in seeds as `MAINTENANCE`:
  - `backend/src/seeds/modules.seed.ts`
- Shared constants also already define `MAINTENANCE`:
  - `backend/src/config/constants.ts`
- Existing generic `payment` and `receipt` modules are not sufficient as MCR's accounting backbone because they currently use plain numeric amounts and do not support ledger-grade financial workflows.
- TypeScript build roots are limited to:
  - `backend/src/**/*`
  - `frontend/src/**/*`
- A root `MCR/` folder is suitable for documentation and planning now, but runtime code must live under backend/frontend source roots unless the build system is refactored.

### 2.4 Baseline test results

Recorded on July 25, 2026:

- Backend: `5/5` suites passed, `30/30` tests passed.
- Frontend: `2/2` test files passed, `6/6` tests passed.

Observed existing warning:

- Mongoose duplicate index warning for `code` on an existing schema.
- This warning predates MCR and should not be confused with an MCR regression.

## 3. Non-negotiable implementation decisions

1. Canonical module code will be `MCR`.
2. Existing placeholder `MAINTENANCE` references will be migrated or aliased in a controlled way.
3. MCR runtime code will be implemented under:
   - `backend/src/modules/mcr`
   - `frontend/src/modules/mcr`
4. Root `MCR/` will hold planning and operational documentation only.
5. All MCR money values will be stored in paise integers only.
6. MCR will use its own financial domain models and must not piggyback on the current generic `payment` and `receipt` collections for ledger truth.
7. All read and write paths must be society-aware and must never rely on document ID alone.

## 4. Minimal core changes allowed

Core changes must be limited to small integration points in existing platform files:

- `backend/src/config/constants.ts`
- `backend/src/seeds/modules.seed.ts`
- `backend/src/seeds/permissions.seed.ts`
- `backend/src/app.ts`
- `frontend/src/App.tsx`
- `frontend/src/components/layout/Sidebar.tsx`
- `frontend/src/components/layout/MobileNav.tsx`
- Any small shared UI permission helpers if needed

All business logic, DTOs, services, routes, reports, workers, and tests for MCR should remain inside dedicated MCR folders.

## 5. Execution phases

### Phase 0: Planning and architecture lock

Deliverables:

- `MCR/IMPLEMENTATION_PLAN.md`
- `MCR/IMPLEMENTATION_PROGRESS.md`
- `MCR/ARCHITECTURE.md`

Actions:

- Freeze naming strategy for `MCR` vs existing `MAINTENANCE`.
- Define MCR folder boundaries.
- Map the exact backend and frontend integration points.
- Record baseline tests and repo constraints.

### Phase 1: Module skeleton and gating

Backend:

- Add `MCR` module code and permissions to constants and seeds.
- Register MCR in module registry seeds.
- Create `backend/src/modules/mcr` skeleton.
- Add `mcrAccessService` modeled after Visitor access control.
- Add a basic health/context endpoint for MCR.
- Add module-disabled enforcement tests.

Frontend:

- Add route shell for `/mcr`.
- Add sidebar visibility based on permission and module enablement.
- Add deep-link module-disabled state.

### Phase 2: Financial domain foundation

Create MCR-specific backend models and services for:

- Society settings
- Charge heads
- Billing plans
- Sequence counters
- Demands
- Payment records
- Payment allocations
- Receipts
- Ledger entries
- Notification dispatch logs

Rules:

- Paise-only storage
- Compound indexes with `societyId`
- Strict DTO validation with zod
- Immutable ledger posting model
- Atomic sequence generation

### Phase 3: Manual collection workflow

Implement:

- Manual payment entry
- Proof attachment via existing file asset system
- Maker-checker verification
- Allocation against one or many demands
- Ledger posting on verification
- Receipt issuance
- Audit events for every transition

### Phase 4: Demand automation

Implement:

- Charge-head configuration
- Billing plans
- Demand preview
- Draft generation
- Publish flow
- Duplicate prevention
- Opening balance and advance adjustment
- Grace period and late-fee logic
- Scheduler-based generation/reminder runners

### Phase 5: Communication channels

Implement:

- MCR notification orchestration service
- In-app notifications using the existing notification module
- FCM push using existing push provider wiring
- Provider-neutral email adapter
- Provider-neutral WhatsApp adapter
- IoT SMS gateway contract
- Dispatch logging and retry policy

### Phase 6: UI delivery

Resident screens:

- Dashboard
- Demand detail
- Payment history
- Receipt list/viewer
- Account statement
- Payment submission form if enabled

Admin screens:

- Dashboard
- Charge heads
- Billing plans
- Demand generation
- Verification queue
- Receipts
- Adjustments
- Reminders
- Delivery logs
- Ledger
- Reports
- Settings

### Phase 7: Documents, reports, and verification

Implement:

- Receipt PDF generation
- Statement PDF generation
- Download and print flows
- Public receipt verification with signed or tokenized links
- Flat-wise, tower-wise, and society-wise reports
- Export support
- Dashboard metrics with server-side aggregation

### Phase 8: Payment gateway foundation

Implement foundation only:

- Provider interface
- Provider registry
- Encrypted gateway credentials
- Webhook event store
- Idempotent webhook processing
- Mock provider for tests

Do not enable live gateway collection by default.

### Phase 9: Hardening and release

Run and fix:

- Unit tests
- Integration tests
- End-to-end flows
- Cross-society isolation tests
- Concurrency tests
- Permission visibility tests
- Module-disabled tests
- Accessibility and responsive checks
- Icon integrity checks
- Full backend and frontend regression suites

## 6. Validation gate after each phase

After each phase:

1. Run relevant tests.
2. Run backend build and frontend build.
3. Keep source files under the 200-line limit.
4. Recheck society scoping and permission enforcement.
5. Recheck idempotency for financial writes.
6. Recheck sidebar, mobile nav, and route visibility.
7. Update `MCR/IMPLEMENTATION_PROGRESS.md`.

## 7. Immediate follow-up work

Next execution steps:

1. Create `MCR/ARCHITECTURE.md` and `MCR/IMPLEMENTATION_PROGRESS.md`.
2. Add `MCR` constants, seed entry, and permission set.
3. Build `backend/src/modules/mcr` skeleton with access/context wiring.
4. Add initial backend and frontend module-disabled tests before broad implementation.

## 8. Primary risks to control

- Confusion between `MAINTENANCE` placeholder naming and final `MCR` module code.
- Scope creep from trying to retrofit current generic payments into true MCR accounting.
- Route and navigation sprawl because the repo is not dynamically plugin-loaded.
- Financial bugs if ledger and demand logic are implemented before idempotency and sequence controls are in place.
- Tenant leaks if any query uses `_id` without `societyId`.

## 9. Definition of done for execution planning

This planning phase is complete when:

- The repo-specific module strategy is documented.
- The exact minimal core touchpoints are named.
- Baseline tests are recorded.
- Execution phases are ordered by dependency.
- Major architectural risks are identified before coding starts.
