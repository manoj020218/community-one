# SAMA Frontend Handoff

Date: July 27, 2026
Scope: Frontend implementation handoff from completed backend baseline

## Status

As of July 27, 2026, the SAMA backend is effectively done for the planned bridge-first scope.

What is considered done:

- SAMA backend runtime under `backend/src/modules/sama`
- backend hardening for staff lifecycle, work-order lifecycle, sync health, and access exceptions
- SAMA-targeted backend validation:
  - `npm run build`: passed
  - `npm test -- sama`: `8/8` suites passed and `9/9` tests passed

What is intentionally not included in this handoff as completed work:

- final frontend polish, QA, and release
- live customer-specific EdgeFolio rollout and onboarding
- unrelated MCR regressions elsewhere in the repo

## Important observation

There is already a SAMA frontend implementation started in the repo under:

- `frontend/src/modules/sama`

Current files already present:

- `SamaPage.tsx`
- `SamaDashboardTab.tsx`
- `SamaMyHouseholdTab.tsx`
- `SamaStaffTab.tsx`
- `SamaCategoriesTab.tsx`
- `SamaHouseholdTab.tsx`
- `SamaProvidersTab.tsx`
- `SamaWorkOrdersTab.tsx`
- `SamaAccessTab.tsx`
- `SamaBridgeTab.tsx`
- `SamaReportsTab.tsx`
- `sama.permissions.ts`
- `sama.types.ts`
- `useSamaModule.ts`

Frontend work should continue from these files, not from a blank module.

## Existing frontend wiring

The route and sidebar wiring already exist:

- route in `frontend/src/App.tsx`
  - `/sama`
- nav item in `frontend/src/components/layout/Sidebar.tsx`
  - label: `Staff, Attendance & Access`
- module gate hook:
  - `frontend/src/modules/sama/useSamaModule.ts`
- permission helpers:
  - `frontend/src/modules/sama/sama.permissions.ts`

This means the frontend developer should treat the page shell as already mounted in the app and focus on correctness, completion, cleanup, and verification.

## Backend API surface available to frontend

### Context and module state

- `GET /api/sama/context`
- `GET /api/modules/society/:societyId`

### Staff and engagement

- `GET /api/sama/staff-profiles`
- `POST /api/sama/staff-profiles`
- `PATCH /api/sama/staff-profiles/:staffId`
- `POST /api/sama/staff-profiles/:staffId/approve`
- `POST /api/sama/staff-profiles/:staffId/suspend`
- `POST /api/sama/staff-profiles/:staffId/reinstate`
- `POST /api/sama/staff-profiles/:staffId/terminate`
- `GET /api/sama/engagements`
- `POST /api/sama/engagements`
- `GET /api/sama/staff-categories`
- `POST /api/sama/staff-categories`
- `PATCH /api/sama/staff-categories/:categoryId`

### Household operations

- `GET /api/sama/household-associations`
- `POST /api/sama/household-associations`
- `POST /api/sama/household-associations/:associationId/approve-resident`
- `POST /api/sama/household-associations/:associationId/approve-society`
- `GET /api/sama/household-rate-cards`
- `POST /api/sama/household-rate-cards`
- `PATCH /api/sama/household-rate-cards/:rateCardId`
- `GET /api/sama/household-payments`
- `POST /api/sama/household-payments`
- `PATCH /api/sama/household-payments/:paymentId`

### Service providers and work orders

- `GET /api/sama/service-providers`
- `POST /api/sama/service-providers`
- `PATCH /api/sama/service-providers/:providerId`
- `GET /api/sama/work-orders`
- `POST /api/sama/work-orders`
- `PATCH /api/sama/work-orders/:workOrderId/assign`
- `PATCH /api/sama/work-orders/:workOrderId/complete`
- `PATCH /api/sama/work-orders/:workOrderId/cancel`
- `PATCH /api/sama/work-orders/:workOrderId/reschedule`
- `PATCH /api/sama/work-orders/:workOrderId/escalate`
- `POST /api/sama/work-orders/:workOrderId/rate`

### Access control

- `GET /api/sama/access-policies`
- `POST /api/sama/access-policies`
- `PATCH /api/sama/access-policies/:policyId`
- `GET /api/sama/credentials`
- `POST /api/sama/credentials`
- `PATCH /api/sama/credentials/:credentialId/revoke`
- `GET /api/sama/external-devices`
- `GET /api/sama/device-bindings`
- `POST /api/sama/device-bindings`
- `PATCH /api/sama/device-bindings/:bindingId`
- `GET /api/sama/access-events`
- `PATCH /api/sama/access-events/:eventId/resolve`

### EdgeFolio bridge and sync

- `GET /api/sama/source`
- `PATCH /api/sama/source`
- `GET /api/sama/staff`
- `GET /api/sama/staff/:staffId`
- `GET /api/sama/attendance-events`
- `GET /api/sama/shifts`
- `GET /api/sama/leaves`
- `GET /api/sama/payroll-runs`
- `GET /api/sama/payroll-runs/:runId`
- `GET /api/sama/sync-runs`
- `GET /api/sama/sync-health`
- `POST /api/sama/sync/employees`
- `POST /api/sama/sync/attendance`
- `POST /api/sama/sync/leaves`
- `POST /api/sama/sync/shifts`
- `POST /api/sama/sync/payroll`
- `POST /api/sama/sync/access-events`
- `POST /api/sama/sync/run-due`
- `POST /api/sama/sync-runs/:runId/retry`

### Reporting

- `GET /api/sama/dashboard`
- `GET /api/sama/reports/staff`
- `GET /api/sama/reports/providers`
- `GET /api/sama/reports/household-payments`
- `GET /api/sama/reports/work-orders`
- `GET /api/sama/reports/sync-health`
- `GET /api/sama/reports/access-exceptions`
- `GET /api/sama/reports/export`

## Suggested frontend information architecture

The current tab split in `SamaPage.tsx` is reasonable and matches backend shape:

- `Dashboard`
- `My Household`
- `Staff`
- `Categories`
- `Household`
- `Providers`
- `Work Orders`
- `Access`
- `Bridge & Sync`
- `Reports`

Keep that structure unless product wants a different navigation model.

## Permissions the frontend should enforce

Use the existing helper file:

- `frontend/src/modules/sama/sama.permissions.ts`

Backend permission keys available:

- `sama.view_self`
- `sama.view_society`
- `sama.view_staff`
- `sama.create_staff`
- `sama.edit_staff`
- `sama.approve_staff`
- `sama.manage_household_associations`
- `sama.manage_staff_categories`
- `sama.manage_household_payments`
- `sama.manage_service_pool`
- `sama.create_work_order`
- `sama.assign_work_order`
- `sama.complete_work_order`
- `sama.manage_access`
- `sama.manage_credentials`
- `sama.configure`
- `sama.sync`
- `sama.view_reports`
- `sama.export_reports`
- `sama.view_audit`

Frontend guidance:

- hide tabs the user cannot access
- hide row actions the user cannot execute
- keep server-side authorization as the real enforcement layer
- show clear empty and forbidden states instead of broken controls

## Key backend states the UI should support

### Staff

- lifecycle:
  - `ACTIVE`
  - `SUSPENDED`
  - `TERMINATED`
- access status:
  - `ACTIVE`
  - `SUSPENDED`
  - `BLOCKED`
- verification status:
  - backend-backed values already exposed through API responses and `sama.types.ts`

### Household payments

- `DUE`
- `PARTIAL`
- `PAID`

### Work orders

UI should account for:

- newly created
- assigned
- completed
- cancelled
- escalated
- rescheduled
- rated
- SLA breach indicators
- optional proof file IDs on completion

### Sync and bridge

UI should account for:

- source configured vs not configured
- token present vs token absent
- scheduled sync enabled vs disabled
- sync run status:
  - `SUCCESS`
  - `FAILED`
  - `RUNNING` or other in-progress backend status if returned
- stale sync / attention state from `GET /api/sama/sync-health`

### Access exceptions

UI should account for:

- normal imported events
- unmatched-device exceptions
- unknown-event exceptions
- resolved/ignored exceptions

## Frontend developer priorities

1. Review the existing `frontend/src/modules/sama` files and decide whether they are production-usable as-is or need consolidation.
2. Align `sama.types.ts` with real backend payloads from `backend/src/modules/sama`.
3. Verify all current tab components call real backend endpoints and send required params such as `societyId`.
4. Finish missing mutation flows:
   - staff lifecycle actions
   - work-order lifecycle actions
   - sync retry
   - access exception resolve
5. Add frontend loading, empty, optimistic, and error states consistently across all tabs.
6. Add frontend tests for route gating, module-disabled state, and the main permission-based tab visibility.
7. Run and fix:
   - `frontend` build
   - `frontend` tests

## Explicit out-of-scope work for this frontend pass

Do not treat these as blockers for frontend completion:

- live customer onboarding against a real EdgeFolio environment
- customer-specific device binding validation
- production rollout operations
- non-SAMA MCR regressions elsewhere in the repo

## Recommended first verification pass

The frontend developer should verify, in order:

1. `/sama` route renders correctly for an enabled society.
2. module-disabled state renders correctly for a society where `SAMA` is off.
3. tab visibility changes correctly by permission set.
4. read-only tabs load without console errors.
5. create/update lifecycle actions succeed against the current backend.
6. bridge and report screens behave sensibly with empty data.

## File references

Frontend runtime starting points:

- `frontend/src/modules/sama/SamaPage.tsx`
- `frontend/src/modules/sama/sama.permissions.ts`
- `frontend/src/modules/sama/sama.types.ts`
- `frontend/src/modules/sama/useSamaModule.ts`
- `frontend/src/App.tsx`
- `frontend/src/components/layout/Sidebar.tsx`

Backend reference source:

- `backend/src/modules/sama`

Backend/phase status docs:

- `SAMA/IMPLEMENTATION_PROGRESS.md`
- `SAMA/HANDOFF.md`
- `SAMA/ARCHITECTURE.md`

## Bottom line

Yes: except for frontend completion and real EdgeFolio rollout, the planned SAMA backend scope is done enough for frontend implementation to proceed now.

The frontend developer should not start from scratch. There is already a substantial SAMA frontend folder on disk, and the correct next move is to validate, complete, and stabilize that existing implementation against the current backend.
