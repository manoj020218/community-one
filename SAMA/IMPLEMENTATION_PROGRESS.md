# SAMA Implementation Progress

Date: July 27, 2026
Current phase: Phase 9
Overall status: In progress

## Current delivery note

- Backend hardening resumed and was extended on July 27, 2026.
- The SAMA backend bridge and hardening baseline are now implemented.
- What remains on hold is customer-specific live EdgeFolio rollout, not the backend foundation.
- Handoff reference:
  - `SAMA/HANDOFF.md`
  - `SAMA/FRONTEND_HANDOFF.md`

## Phase status

- Phase 0 - Repository and EdgeFolio inspection: Completed
- Phase 1 - Module skeleton and bridge foundation: Completed
- Phase 2 - Staff and engagement master: Backend completed
- Phase 3 - Shared access and device integration: Backend completed
- Phase 4 - Attendance: Bridge backend completed
- Phase 5 - Society payroll: Bridge backend completed
- Phase 6 - Household staff rates and payment records: Backend completed
- Phase 7 - Service pool: Backend completed
- Phase 8 - Notifications and dashboards: Backend completed
- Phase 9 - Hardening: Backend completed, broader release work pending

## Phase 0 completed so far

- Read `4. MACA/SAMA prompt.txt`.
- Inspected current backend and frontend module extension points.
- Confirmed existing module registry, permission system, audit service, file asset service, and device inventory patterns.
- Confirmed current build layout requires runtime code under:
  - `backend/src`
  - `frontend/src`
- Identified that root `SAMA/` should be used for planning/docs, not standalone runtime code.
- Identified an existing placeholder `STAFF` module seed that conflicts with the requested `SAMA` naming.
- Inspected external EdgeFolio project at:
  - `D:\IOT Device\Salary_On\smart_salary\EdgeFolio`
- Confirmed EdgeFolio already contains:
  - employee APIs
  - attendance APIs
  - leave APIs
  - payroll runs and payslips
  - payment records
  - machine/device routes
  - M68 and U5 device integrations
- Shifted SAMA strategy from rewrite-first to bridge-first for machine-enabled societies.
- Created:
  - `SAMA/IMPLEMENTATION_PLAN.md`
  - `SAMA/ARCHITECTURE.md`
  - `SAMA/IMPLEMENTATION_PROGRESS.md`
  - `SAMA/EDGEFOLIO_REUSE.md`

## Current repo observations

- Existing optional module pattern already works society-wise.
- Current device layer is inventory-focused and will need event/capability expansion for SAMA.
- Current generic `payment` and `receipt` modules are not sufficient as payroll-grade truth.
- Visitor module patterns are currently the best reference for:
  - module entitlement
  - actor context
  - gate/device-related access flow
- Current Jenix `bridge` module already uses server-to-server secret auth and is the right extension point for an EdgeFolio connector.
- EdgeFolio should be treated as the source system for attendance/payroll/device data where those machines are deployed.

## Phase 1 completed so far

- Replaced the placeholder runtime module registration direction from `STAFF` to canonical `SAMA`.
- Added `SAMA` permissions and module manifest in the backend seed/constants layer.
- Registered `/api/sama` in the backend app router.
- Added backend runtime files under `backend/src/modules/sama` for:
  - module access and context
  - EdgeFolio source configuration
  - encrypted source token storage
  - EdgeFolio client wrapper
  - employee sync import
  - attendance sync import
- Added first backend endpoints:
  - `GET /api/sama/context`
  - `GET /api/sama/source`
  - `PATCH /api/sama/source`
  - `POST /api/sama/sync/employees`
  - `POST /api/sama/sync/attendance`
- Added backend tests:
  - `backend/src/tests/sama-module.test.ts`
  - `backend/src/tests/sama-bridge.test.ts`
- Confirmed all new SAMA source/test files remain under the requested 200-line limit.

## Additional backend bridge work completed

- Added imported snapshot models for:
  - shifts
  - leaves
  - payroll runs
  - payroll entries / payslip snapshots
  - sync-run tracking
- Extended the EdgeFolio client for:
  - shift list
  - leave list
  - payroll run list
  - payroll run detail with payslips
- Added new backend sync endpoints:
  - `POST /api/sama/sync/leaves`
  - `POST /api/sama/sync/shifts`
  - `POST /api/sama/sync/payroll`
- Added backend read/query endpoints:
  - `GET /api/sama/staff`
  - `GET /api/sama/staff/:staffId`
  - `GET /api/sama/attendance-events`
  - `GET /api/sama/shifts`
  - `GET /api/sama/leaves`
  - `GET /api/sama/payroll-runs`
  - `GET /api/sama/payroll-runs/:runId`
  - `GET /api/sama/sync-runs`
- Added audit logging for:
  - source configuration changes
  - manual sync success and failure events
- Added sync-run persistence so manual bridge actions now retain:
  - sync type
  - filters
  - counts
  - status
  - timestamps
  - triggering user

## Native backend work completed

- Added native SAMA backend models for:
  - `StaffProfile`
  - `StaffEngagement`
  - `HouseholdAssociation`
  - `SamaSequence` for atomic staff-code generation
- Added atomic native staff codes using the pattern:
  - `SAMA-STF/<year>/<sequence>`
- Added native backend endpoints:
  - `GET /api/sama/staff-profiles`
  - `POST /api/sama/staff-profiles`
  - `PATCH /api/sama/staff-profiles/:staffId`
  - `GET /api/sama/engagements`
  - `POST /api/sama/engagements`
  - `GET /api/sama/household-associations`
  - `POST /api/sama/household-associations`
  - `POST /api/sama/household-associations/:associationId/approve-resident`
  - `POST /api/sama/household-associations/:associationId/approve-society`
- Added multi-step native household approval behavior:
  - resident flat approval
  - society approval
  - active status only after both sides complete
- Added flat isolation for resident-side approval and association listing.
- Extended SAMA permissions for native management actions:
  - view staff
  - create staff
  - edit staff
  - approve staff
  - manage household associations
- Added backend test coverage in:
  - `backend/src/tests/sama-native-staff.test.ts`

## Backend service operations completed

- Added native SAMA backend models for:
  - `ServiceProviderProfile`
  - `WorkOrder`
  - `AccessPolicy`
  - `AccessCredential`
- Extended native SAMA numbering for:
  - `SAMA-SP/<year>/<sequence>`
  - `SAMA-WO/<year>/<sequence>`
- Added backend endpoints:
  - `GET /api/sama/service-providers`
  - `POST /api/sama/service-providers`
  - `PATCH /api/sama/service-providers/:providerId`
  - `GET /api/sama/work-orders`
  - `POST /api/sama/work-orders`
  - `PATCH /api/sama/work-orders/:workOrderId/assign`
  - `PATCH /api/sama/work-orders/:workOrderId/complete`
  - `GET /api/sama/access-policies`
  - `POST /api/sama/access-policies`
  - `PATCH /api/sama/access-policies/:policyId`
  - `GET /api/sama/credentials`
  - `POST /api/sama/credentials`
  - `PATCH /api/sama/credentials/:credentialId/revoke`
- Added first backend service-pool behavior for:
  - provider profile registration
  - provider activation state
  - work-order creation and assignment
  - work-order completion
  - work-order-linked temporary access policies
  - hashed credential issuance and revocation
- Extended SAMA permissions for:
  - service-pool management
  - work-order create/assign/complete actions
  - access-policy management
  - credential management
- Added backend test coverage in:
  - `backend/src/tests/sama-service-ops.test.ts`

## Backend sync and access bridge completed

- Extended `SamaSource` backend configuration with:
  - scheduled sync enable/disable
  - scheduled sync interval in minutes
  - selected scheduled sync types
  - last access-event sync timestamp
  - last scheduled-sync timestamp
- Added scheduled SAMA backend processing:
  - `SamaScheduledSyncService`
  - `SamaScheduledSyncWorker`
  - worker startup/shutdown wiring in the backend server
  - worker health visibility in the health endpoint
- Added backend sync support for:
  - `POST /api/sama/sync/access-events`
  - `POST /api/sama/sync/run-due`
- Added native SAMA backend bridge models for:
  - `SamaDeviceBinding`
  - `SamaAccessEvent`
- Added backend endpoints for machine/device bridge foundations:
  - `GET /api/sama/external-devices`
  - `GET /api/sama/device-bindings`
  - `POST /api/sama/device-bindings`
  - `PATCH /api/sama/device-bindings/:bindingId`
  - `GET /api/sama/access-events`
- Added first EdgeFolio access-bridge behavior for:
  - external M68 and U5 device discovery
  - Jenix device to EdgeFolio device binding
  - M68 event import and normalization
  - binding resolution from external device IDs to Jenix devices
  - scheduled per-society access-event sync execution
- Extended sync-run persistence for:
  - manual vs scheduled trigger mode
  - scheduled sync execution history
- Added backend test coverage in:
  - `backend/src/tests/sama-scheduled-access.test.ts`

## Backend reporting and household operations completed

- Added native SAMA backend models for:
  - `StaffCategory`
  - `HouseholdRateCard`
  - `HouseholdPaymentRecord`
- Added backend endpoints:
  - `GET /api/sama/staff-categories`
  - `POST /api/sama/staff-categories`
  - `PATCH /api/sama/staff-categories/:categoryId`
  - `GET /api/sama/household-rate-cards`
  - `POST /api/sama/household-rate-cards`
  - `PATCH /api/sama/household-rate-cards/:rateCardId`
  - `GET /api/sama/household-payments`
  - `POST /api/sama/household-payments`
  - `PATCH /api/sama/household-payments/:paymentId`
  - `POST /api/sama/work-orders/:workOrderId/rate`
  - `GET /api/sama/dashboard`
  - `GET /api/sama/reports/staff`
  - `GET /api/sama/reports/providers`
  - `GET /api/sama/reports/household-payments`
  - `GET /api/sama/reports/export`
- Added native backend category and household behavior for:
  - society-scoped staff category master
  - household rate-card setup tied to approved household associations
  - household payment recording and update flow
  - resident-side flat isolation for household rate-card and payment reads
  - household payment status transitions:
    - `DUE`
    - `PARTIAL`
    - `PAID`
- Extended service-pool behavior for:
  - work-order SLA target capture
  - SLA due-at calculation
  - SLA breach tracking at completion
  - completion proof file ID capture
  - resident ratings and feedback on completed work orders
- Added SAMA notification support for:
  - household payment create/update alerts to flat residents
  - work-order assign/completion/rating alerts
- Added reporting/export behavior for:
  - staff status/category summaries
  - provider assignment, completion, SLA breach, and rating summaries
  - household payment totals and outstanding balances
  - CSV export for staff, provider, and household payment reports
- Extended SAMA permissions for:
  - staff category management
  - household payment management
  - report viewing
  - report export
- Added backend test coverage in:
  - `backend/src/tests/sama-reporting-household.test.ts`

## Additional backend hardening completed

- Extended native staff lifecycle behavior for:
  - category-to-profile validation
  - category compatibility by staff type
  - approval-gated categories
  - staff lifecycle states:
    - `ACTIVE`
    - `SUSPENDED`
    - `TERMINATED`
- Added backend staff lifecycle endpoints:
  - `POST /api/sama/staff-profiles/:staffId/approve`
  - `POST /api/sama/staff-profiles/:staffId/suspend`
  - `POST /api/sama/staff-profiles/:staffId/reinstate`
  - `POST /api/sama/staff-profiles/:staffId/terminate`
- Extended work-order lifecycle behavior for:
  - proof-file validation against real file assets
  - reschedule tracking
  - escalation tracking
  - cancellation tracking
- Added backend work-order lifecycle endpoints:
  - `PATCH /api/sama/work-orders/:workOrderId/reschedule`
  - `PATCH /api/sama/work-orders/:workOrderId/escalate`
  - `PATCH /api/sama/work-orders/:workOrderId/cancel`
- Extended EdgeFolio bridge hardening for:
  - source retry-limit configuration
  - stale-sync threshold configuration
  - failure counters and last-success timestamps
  - sync health evaluation
  - scheduled retry attempts
  - manual retry of failed sync runs
- Added backend sync hardening endpoints:
  - `GET /api/sama/sync-health`
  - `POST /api/sama/sync-runs/:runId/retry`
- Extended access-event exception handling for:
  - unmatched-device classification
  - unknown-event classification
  - manual resolution
  - ignore flow
- Added backend access exception endpoint:
  - `PATCH /api/sama/access-events/:eventId/resolve`
- Extended reporting/export behavior for:
  - work-order report
  - sync-health report
  - access-exception report
  - CSV export for:
    - `WORK_ORDERS`
    - `SYNC_HEALTH`
    - `ACCESS_EXCEPTIONS`
- Added operational notifications for:
  - work-order reschedule
  - work-order escalation
  - work-order cancellation
  - scheduled sync attention alerts
  - access-event exception alerts
- Added backend test coverage in:
  - `backend/src/tests/sama-advanced-hardening.test.ts`
  - `backend/src/tests/sama-sync-hardening.test.ts`

## Validation

- SAMA targeted tests on July 27, 2026: `8/8` suites passed and `9/9` tests passed
- Backend TypeScript build on July 27, 2026: passed
- Repo-wide backend tests on July 25, 2026: `16/21` suites passed and `56/64` tests passed
- Current repo-wide failures remain outside SAMA in:
  - `src/tests/mcr-demand.test.ts`
  - `src/tests/mcr-receipt.test.ts`
  - `src/tests/mcr-payment.test.ts`
  - `src/tests/mcr-demand-automation.test.ts`
  - `src/tests/mcr-gateway.test.ts`
- Existing Mongoose duplicate-index warning on `code` is still present and unchanged

## Open decisions

- Exact first-release bridge mode:
  - scheduled pull only
  - manual sync only
  - or pull plus later webhook/device push
- Whether any current staff-facing or guard-facing UI work already exists in another branch or folder.
- Whether EdgeFolio token rotation should stay manual in Phase 1 or move to a managed credential refresh path in Phase 2.

## Next actions

1. Build the SAMA frontend if this module needs end-to-end release in the current repo.
2. Use the existing SAMA backend bridge for real-customer EdgeFolio onboarding only when live demand exists.
3. Add customer-specific rollout validation, monitoring, and field-mapping checks during first live deployment.
4. Investigate the unrelated MCR regressions before claiming a fully green repo-wide backend baseline.
