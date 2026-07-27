# SAMA Architecture

Date: July 25, 2026
Status: Draft

## Architecture intent

SAMA is an optional per-society plugin for staff identity, engagement, access, attendance, payroll, household staff tracking, and service-pool operations.

The architecture must preserve:

- tenant isolation
- access security
- payroll correctness
- shared device reuse
- minimal core disturbance

## Runtime placement

Backend runtime:

- `backend/src/modules/sama`

Frontend runtime:

- `frontend/src/modules/sama`

Planning/docs:

- `SAMA/`

## Core boundaries

### SAMA owns

- staff master data
- engagements
- household staff associations
- service providers
- work orders
- attendance events and summaries when natively created
- imported attendance snapshots when bridged from EdgeFolio
- shifts and leave visibility/mapping
- salary structures and payroll runs only where native operation is explicitly required later
- imported payroll snapshots where EdgeFolio is the source system
- access credentials and access policies
- SAMA reports and audit views

### Shared platform services SAMA reuses

- authentication and JWT context
- society-level tenancy resolution
- module registry
- device inventory
- file assets
- audit logging
- notifications
- role and permission engine

### External source system SAMA bridges

- EdgeFolio on-prem backend at `EdgeFolio/EDGE/backend`
- machine/device APIs exposed by EdgeFolio
- payroll and attendance APIs exposed by EdgeFolio

### SAMA must not own

- generic platform auth
- generic module registry
- generic device registration
- legacy generic payments/receipts as staff payroll truth
- future member-access authorization logic

## Domain split

SAMA will use explicit engagement/employer types rather than a single employee model.

Primary person and work domains:

- `StaffProfile`
- `StaffCategory`
- `StaffEngagement`
- `HouseholdStaffAssociation`
- `ServiceProviderProfile`
- `WorkOrder`
- `AttendanceEvent`
- `AttendanceDay`
- `Shift`
- `LeaveRecord`
- `SalaryStructure`
- `PayrollRun`
- `PayrollEntry`
- `HouseholdRateCard`
- `HouseholdPaymentRecord`
- `AccessCredential`
- `AccessPolicy`

## Device strategy

The current repo already has device inventory, but not a generic attendance/event layer.

For EdgeFolio-enabled societies, SAMA should not talk to machines first. It should talk to EdgeFolio, and treat EdgeFolio as the edge-source adapter.

SAMA should add a shared capability model on top of current device records, not a device subsystem replacement.

Target capability direction:

- `ATTENDANCE_EVENT_SOURCE`
- `ACCESS_DECISION_SOURCE`
- `ACCESS_CREDENTIAL_SYNC`
- `DOOR_CONTROLLER`
- `BIOMETRIC_TERMINAL`
- `RFID_READER`
- `UHF_READER`
- `FACE_TERMINAL`

Processing flow:

1. registered EdgeFolio source
2. server-to-server bridge call to EdgeFolio API
3. normalized import into Jenix SAMA records
4. identity resolver and staff/flat/engagement mapping
5. SAMA attendance/report/access overlays
6. future member-access routing boundary

## EdgeFolio bridge strategy

EdgeFolio is the source of truth for machine-driven societies for:

- employees
- attendance records
- leave
- payroll runs
- payslips
- machine inventory and status
- U5 and M68 device metadata

Jenix SAMA should add a bridge layer on top of the existing Jenix `bridge` pattern, not direct browser access.

Recommended bridge behavior:

- server-to-server only
- society-scoped connector configuration
- secure storage of EdgeFolio base URL and token/secret
- scheduled pull jobs plus manual sync actions
- idempotent import keys
- immutable imported payroll snapshots
- restricted import of biometric-related data

Bridge import scope for first release:

- employee master records
- attendance daily or raw event snapshots
- leaves
- shifts where exposed
- payroll runs
- payslips
- payroll payment/export status
- machine status summaries

Do not import in first release:

- raw biometric templates
- unrestricted face images
- direct machine command control from Jenix

## Access-control boundary

SAMA access decisions are for workers and service personnel only.

Future member access must reuse shared device/event contracts without:

- reading payroll data
- reading restricted staff profile fields
- sharing household payment data

## Security model

SAMA must enforce:

- `societyId` on every record
- field-level permission checks for restricted personal data
- no raw biometric exposure
- no unrestricted bank or salary detail exposure
- resident visibility limited to their own associations and requests
- audit records for restricted profile access and access overrides

Additional EdgeFolio bridge rules:

- never call EdgeFolio directly from frontend browsers
- never expose EdgeFolio tokens to residents or staff clients
- never treat EdgeFolio as cross-society shared state
- never import biometric templates into Jenix
- audit all manual bridge syncs and source configuration changes

## Numbering and idempotency

Atomic numbering will be required for:

- staff codes
- work-order numbers
- payroll numbers
- credential issuance references where needed

Idempotency will be required for:

- attendance event ingestion
- payroll calculation and posting
- access-event replay
- EdgeFolio bridge imports

## Known repo-fit risks

1. Placeholder `STAFF` module already exists in module seed and conflicts conceptually with `SAMA`.
2. Current device layer is inventory-oriented; event ingestion abstractions must be added carefully.
3. Current generic payment/receipt paths are too simple for long-lived payroll-grade finance.
4. EdgeFolio is JavaScript/SQLite/on-prem and must be bridged safely into the current multi-society TypeScript/Mongoose platform.
5. EdgeFolio docs and implementation must be treated carefully; bridge should rely on tested endpoints, not assumptions.

## First backend structure

Suggested initial runtime layout:

- `backend/src/modules/sama/sama.manifest.ts`
- `backend/src/modules/sama/sama.access.service.ts`
- `backend/src/modules/sama/sama.routes.ts`
- `backend/src/modules/sama/sama.controller.ts`
- `backend/src/modules/sama/staff/*`
- `backend/src/modules/sama/engagements/*`
- `backend/src/modules/sama/access/*`
- `backend/src/modules/sama/attendance/*`
- `backend/src/modules/sama/payroll/*`
- `backend/src/modules/sama/household/*`
- `backend/src/modules/sama/servicePool/*`
- `backend/src/modules/sama/workOrders/*`

## First frontend structure

- `frontend/src/modules/sama/SamaPage.tsx`
- `frontend/src/modules/sama/sama.permissions.ts`
- `frontend/src/modules/sama/staff/*`
- `frontend/src/modules/sama/attendance/*`
- `frontend/src/modules/sama/payroll/*`
- `frontend/src/modules/sama/household/*`
- `frontend/src/modules/sama/servicePool/*`
- `frontend/src/modules/sama/access/*`
- `frontend/src/modules/sama/reports/*`

## Recommended implementation order

1. module skeleton
2. EdgeFolio source registration and bridge auth
3. staff master and approvals
4. imported attendance and payroll foundation
5. access and credential overlays
6. household rates and records
7. service pool and work orders
8. dashboards and reports
