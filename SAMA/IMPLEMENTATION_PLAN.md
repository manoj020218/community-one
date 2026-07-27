# SAMA Implementation Plan

Date: July 25, 2026
Module code: `SAMA`
Display name: `Staff, Attendance, Management and Access`
Status: Planning

## Scope

SAMA will add a professional long-life staff and access module for:

- Society payroll staff
- Household staff
- Service-pool and temporary workers
- Attendance and access events
- Work orders and temporary access
- Payroll and household payment separation

## Repo-specific implementation decision

The prompt asks for a separate `SAMA/` folder. In this repository, runtime code cannot safely live only there because:

- `backend/tsconfig.json` compiles only `backend/src/**/*`
- `frontend/tsconfig.json` compiles only `frontend/src/**/*`

Therefore:

- Runtime backend code will live in `backend/src/modules/sama`
- Runtime frontend code will live in `frontend/src/modules/sama`
- Root `SAMA/` will hold planning and documentation

## Current repo extension points

Backend touchpoints:

- `backend/src/config/constants.ts`
- `backend/src/seeds/modules.seed.ts`
- `backend/src/seeds/permissions.seed.ts`
- `backend/src/app.ts`
- `backend/src/modules/moduleRegistry/*`
- `backend/src/modules/device/*`
- `backend/src/modules/audit/*`
- `backend/src/modules/fileAsset/*`
- `backend/src/modules/notification/*`
- `backend/src/modules/visitor/*`

Frontend touchpoints:

- `frontend/src/App.tsx`
- `frontend/src/components/layout/Sidebar.tsx`
- `frontend/src/modules/moduleRegistry/useSocietyModules.ts`

## Critical decisions

1. Canonical module code will be `SAMA`.
2. The existing placeholder `STAFF` seed entry should be migrated or replaced by `SAMA`, not kept as a competing module.
3. Society payroll must remain separate from household payment records.
4. SAMA must not reuse the current generic `payment` and `receipt` modules as accounting truth.
5. Shared device infrastructure must stay generic so future member access can reuse it.
6. All money values must use paise integers.
7. All files must stay below 200 lines.

## EdgeFolio integration decision

An external EdgeFolio source is now available at:

- `D:\IOT Device\Salary_On\smart_salary\EdgeFolio`

This changes the SAMA strategy:

- Do not reimplement proven EdgeFolio attendance, payroll, machine, or payslip flows inside Jenix first.
- Build a bridge so Jenix can ingest and normalize EdgeFolio data when a society uses EdgeFolio-backed machines.
- Keep Jenix SAMA focused on society integration, resident/flat association, approvals, access rules, reports, notifications, and tenant-safe visibility.

EdgeFolio components already present there:

- employee registry
- attendance APIs
- leave APIs
- payroll runs and payslips
- payment records
- machine/device routes
- M68 device management
- U5 device management
- APK/mobile attendance sync

Reuse and bridge details must be documented in `SAMA/EDGEFOLIO_REUSE.md`.

## Phased execution

### Phase 0 - Repository inspection and baseline

- Create SAMA planning docs
- Confirm module pattern, tenancy, permissions, device mapping, audit, notifications, file storage
- Inspect EdgeFolio backend and define bridge boundaries
- Run current backend/frontend tests and record baseline
- Record minimal core files to touch

### Phase 1 - Module skeleton

- Add `SAMA` manifest
- Add `SAMA_*` permissions
- Replace or migrate placeholder `STAFF` module seed
- Add backend `sama` access service and `/api/sama/context`
- Register backend route shell in `backend/src/app.ts`
- Add frontend `/sama` shell route and sidebar entry
- Add module-disabled backend/frontend tests

### Phase 2 - Staff and engagement master

- `StaffProfile`
- `StaffCategory`
- `StaffEngagement`
- `HouseholdStaffAssociation`
- `ServiceProviderProfile`
- onboarding and approval flows
- restricted profile access rules

### Phase 3 - Shared access and EdgeFolio bridge foundation

- `AccessCredential`
- `AccessPolicy`
- EdgeFolio source registration and credentials
- device mapping records
- EdgeFolio employee-to-staff identity mapping
- normalized bridge ingestion for staff, attendance, payroll, leaves, and machines
- replay and deduplication
- member-access integration boundary

### Phase 4 - Attendance

- bridge-first ingestion from EdgeFolio attendance APIs
- `AttendanceEvent`
- `AttendanceDay`
- `Shift`
- leave records
- missing-punch logic where SAMA must summarize imported data
- overtime rules
- attendance corrections policy for bridged vs native records

### Phase 5 - Society payroll

- import/mirror mode for EdgeFolio payroll runs and payslips
- optional future native Jenix payroll only if required later
- immutable imported payroll snapshots
- approval visibility, reconciliation, and payslip surfacing

### Phase 6 - Household rates and payment records

- `HouseholdRateCard`
- `HouseholdPaymentRecord`
- area/member/visit-based rate methods
- resident agreements
- strict reporting separation from society payroll

### Phase 7 - Service pool and work orders

- `WorkOrder`
- provider assignment
- temporary access windows
- completion proof
- ratings and feedback

### Phase 8 - UI, dashboards, reports, notifications

- admin screens
- resident screens
- guard screens
- staff self-service where enabled
- reports and exports
- notification events through existing platform channels

### Phase 9 - Hardening and release

- tenant isolation tests
- concurrency/idempotency tests
- access-denial auditing
- file privacy checks
- icon-integrity review
- full regression
- deployment, rollback, reconciliation docs

## Minimal core disturbance rule

Core changes should be limited to:

- module registration
- permission registration
- route registration
- sidebar/router registration
- shared device capability hooks
- shared notification hooks
- shared audit hooks

SAMA business logic stays inside the SAMA module.

## Bridge-first implementation order

The first SAMA delivery for machine-enabled societies should prefer:

1. EdgeFolio source registration
2. server-to-server bridge auth
3. employee/staff mapping
4. attendance and leave sync
5. payroll run and payslip sync
6. machine/device status sync
7. Jenix-only resident/flat/association overlays
8. reports and notifications

Only after that should native SAMA attendance or payroll engines be considered.

## Immediate next step

If implementation starts, begin with Phase 0 and create the runtime skeleton under:

- `backend/src/modules/sama`
- `frontend/src/modules/sama`
