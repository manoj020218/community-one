# MCR Implementation Progress

Date: July 26, 2026
Current phase: Phase 9
Overall status: Backend core completed

## Phase status

- Phase 0 - Planning and repository inspection: Completed
- Phase 1 - Module skeleton and gating: Completed
- Phase 2 - Financial domain foundation: Completed
- Phase 3 - Manual collection workflow: Completed
- Phase 4 - Demand automation: Completed
- Phase 5 - Communication channels: Completed
- Phase 6 - UI delivery: Not started
- Phase 7 - Documents, reports, and verification: Completed
- Phase 8 - Payment gateway foundation: Completed
- Phase 9 - Hardening and release: In progress

## Phase 0 completed work

- Read the full MCR prompt from `2. MCR/MCR prompt.txt`.
- Inspected backend and frontend architecture.
- Identified existing auth, module registry, audit, notification, file, and worker patterns.
- Confirmed current routing is hard-wired in backend and frontend app entry points.
- Identified existing placeholder maintenance module naming conflict with final `MCR`.
- Recorded baseline test results.
- Created:
  - `MCR/IMPLEMENTATION_PLAN.md`
  - `MCR/ARCHITECTURE.md`
  - `MCR/IMPLEMENTATION_PROGRESS.md`

## Baseline verification

Recorded on July 25, 2026:

- Backend tests: `5/5` suites passed, `30/30` tests passed
- Frontend tests: `2/2` files passed, `6/6` tests passed

Known pre-existing warning:

- Mongoose duplicate schema index warning on `code`

## Phase 1 completed work

- Added canonical `MCR` module code and MCR permission constants.
- Replaced the placeholder maintenance module seed with an active `MCR` manifest-backed module registration.
- Added backend `mcr` module skeleton:
  - `backend/src/modules/mcr/mcr.manifest.ts`
  - `backend/src/modules/mcr/mcr.access.service.ts`
  - `backend/src/modules/mcr/mcr.controller.ts`
  - `backend/src/modules/mcr/mcr.routes.ts`
- Registered `/api/mcr/context` in the backend app.
- Added backend module-disabled enforcement tests in `backend/src/tests/mcr-module.test.ts`.
- Added frontend module hook and route shell:
  - `frontend/src/modules/moduleRegistry/useSocietyModules.ts`
  - `frontend/src/modules/mcr/mcr.permissions.ts`
  - `frontend/src/modules/mcr/McrPage.tsx`
- Registered `/mcr` in the frontend router.
- Added sidebar visibility for MCR only when the module is enabled and the user has MCR permissions.
- Prevented module toggles from showing in the module registry page for users without enable/disable permissions.
- Updated audit module filter options from `MAINTENANCE` to `MCR`.
- Added frontend disabled-state and shell tests in `frontend/tests/McrPage.test.tsx`.

## Post-change verification

Recorded on July 25, 2026:

- Backend tests: `6/6` suites passed, `34/34` tests passed
- Backend build: passed
- Frontend tests: `3/3` files passed, `9/9` tests passed
- Frontend build: passed

Known repo limitation:

- `frontend/npm run lint` fails because the repository currently has no ESLint configuration file for that script to use.

## Phase 2 foundation work completed

- Added reusable MCR validation helpers with zod-backed request parsing.
- Added MCR settings schema, model, service, and controller.
- Added charge head schema, model, service, and controller.
- Added billing plan schema, model, service, and controller.
- Added atomic sequence counter model and service for future demand and receipt numbering.
- Extended `backend/src/modules/mcr/mcr.routes.ts` with:
  - `GET /api/mcr/settings`
  - `PATCH /api/mcr/settings`
  - `GET /api/mcr/charge-heads`
  - `POST /api/mcr/charge-heads`
  - `GET /api/mcr/billing-plans`
  - `POST /api/mcr/billing-plans`
- Added backend fixture helper in `backend/src/tests/mcr.helpers.ts`.
- Added backend Phase 2 integration coverage in `backend/src/tests/mcr-foundation.test.ts`.
- Added initial demand and ledger domain pieces:
  - demand draft generation
  - demand publish flow
  - immutable ledger posting for published demands
- Extended `backend/src/modules/mcr/mcr.routes.ts` with:
  - `GET /api/mcr/demands`
  - `POST /api/mcr/demands/drafts`
  - `POST /api/mcr/demands/:demandId/publish`
- Added demand publish coverage in `backend/src/tests/mcr-demand.test.ts`.

## Phase 2 verification

Recorded on July 25, 2026:

- Backend tests: `8/8` suites passed, `41/41` tests passed
- Backend build: passed

Notes:

- Frontend was not changed in this slice, so frontend tests/build were not rerun.

## Phase 3 manual collection work completed so far

- Added MCR payment entry schemas, service, controller, and verification workflow.
- Added maker-checker enforcement using existing MCR settings.
- Added manual payment verification with:
  - selected or oldest-first allocation
  - tenant-scoped demand validation
  - demand paid/outstanding balance updates
  - immutable ledger credit posting
  - receipt issuance
- Added payment rejection workflow with audit events.
- Reused existing `fileAsset` validation for proof attachments and existing `audit` logging for record/verify/reject actions.
- Extended `backend/src/modules/mcr/mcr.routes.ts` with:
  - `GET /api/mcr/payments`
  - `POST /api/mcr/payments`
  - `POST /api/mcr/payments/:paymentId/verify`
  - `POST /api/mcr/payments/:paymentId/reject`
- Added manual collection coverage in `backend/src/tests/mcr-payment.test.ts`.
- Added lifecycle continuation for manual collection:
  - `POST /api/mcr/payments/:paymentId/cancel`
  - `POST /api/mcr/payments/:paymentId/bounce`
  - `GET /api/mcr/receipts`
  - `GET /api/mcr/receipts/:receiptId`
- Added verified-payment reversal handling:
  - demand balance rollback
  - allocation reversal metadata
  - receipt voiding
  - immutable ledger reversal entry
- Added Phase 3 lifecycle coverage in `backend/src/tests/mcr-payment-lifecycle.test.ts`.
- Added advance-credit handling for manual collections:
  - verified overpayments now create advance credit when enabled
  - fully advance payments now verify even without published dues
  - advance-disabled societies reject overpayment verification
- Added direct lifecycle query endpoints:
  - `GET /api/mcr/payments/:paymentId`
  - `GET /api/mcr/payments/:paymentId/receipt`
- Added advance-collection regression coverage in `backend/src/tests/mcr-payment-advance.test.ts`.
- Completed future-demand advance consumption:
  - published demands now consume prior verified advance balances oldest-first
  - advance application is recorded through `ADVANCE` payment allocations
  - bounced source payments now restore future demand outstanding balances correctly
- Added MCR operational reporting endpoints:
  - `GET /api/mcr/reports/summary`
  - `GET /api/mcr/reports/statement`
  - `GET /api/mcr/reports/collections`
- Added reminder orchestration and dispatch logging:
  - `POST /api/mcr/demands/:demandId/reminders`
  - `POST /api/mcr/reminders/run`
  - in-app reminder creation through the shared notification module
  - idempotent MCR reminder dispatch records in `McrNotificationDispatch`
- Added disabled-by-default interval worker support for MCR reminder batches:
  - `backend/src/modules/mcr/mcrReminder.worker.ts`
  - `MCR_REMINDER_WORKER_ENABLED`
  - `MCR_REMINDER_WORKER_INTERVAL_MS`
  - `MCR_REMINDER_BATCH_SIZE`
- Added backend coverage for:
  - future-demand advance application and bounce reversal
  - reminder dispatch idempotency
  - summary and statement report endpoints
- Added product-grade receipt backend flows:
  - authenticated receipt document and download endpoints
  - public receipt verification endpoint with signed token links
  - public receipt HTML document endpoint for shareable links
  - SVG poster/image endpoint for print-friendly receipt output
  - receipt share-link generation for issued receipts
  - receipt replacement workflow for verified payments
  - direct receipt void workflow for non-active-payment cases
  - receipt channel dispatch through:
    - in-app notifications
    - SMTP email when configured and enabled
    - WhatsApp when the society session is connected
    - auditable skip/failure records for unsupported channels
- Added backend receipt regression coverage in:
  - `backend/src/tests/mcr-receipt.test.ts`
- Completed demand automation:
  - billing-plan `billingDay` and `dueDay` are now applied by the backend
  - `POST /api/mcr/demands/automation/run`
  - disabled-by-default demand automation worker:
    - `backend/src/modules/mcr/mcrDemandAutomation.worker.ts`
    - `MCR_DEMAND_WORKER_ENABLED`
    - `MCR_DEMAND_WORKER_INTERVAL_MS`
    - `MCR_DEMAND_WORKER_CYCLE_LIMIT`
  - monthly backfill generation and auto-publish based on active billing plans
  - idempotent reruns against existing cycle drafts/published demands
- Completed late-fee automation:
  - grace-period aware overdue scanning
  - recurring late-fee cycle backfill per source demand
  - `POST /api/mcr/late-fees/run`
  - disabled-by-default late-fee worker support
- Extended reminder orchestration into provider-backed demand reminders:
  - in-app
  - SMTP email when configured
  - WhatsApp when connected
  - auditable skip/failure records for unsupported channels
- Added payment gateway foundation:
  - `GET /api/mcr/gateway/config`
  - `PATCH /api/mcr/gateway/config`
  - `POST /api/mcr/gateway/orders`
  - `POST /api/mcr/public/gateway/webhook/:provider`
  - webhook event persistence
  - mock provider order flow with optional auto-verification
- Added backend automation regression coverage in:
  - `backend/src/tests/mcr-demand-automation.test.ts`
  - `backend/src/tests/mcr-latefee.test.ts`
  - `backend/src/tests/mcr-gateway.test.ts`

## Current verification

Recorded on July 26, 2026:

- Backend tests: last fully executed DB-backed run remains the earlier `12/12` suites passed, `49/49` tests passed
- Backend build: passed

Notes:

- Frontend was unchanged in the latest backend-only slice, so frontend tests/build were not rerun after Phase 1.
- The pre-existing Mongoose duplicate schema index warning on `code` is still present.
- The latest backend slice passed backend TypeScript compilation through the direct `tsc` entrypoint after adding reminder/report/worker code.
- The latest receipt/document slice also passed backend TypeScript compilation after adding:
  - `mcrReceiptPublic.service.ts`
  - `mcrReceiptDocument.service.ts`
  - `mcrReceiptLifecycle.service.ts`
  - `mcrDispatch.service.ts`
- The latest backend automation slice also passed backend TypeScript compilation after adding:
  - `mcrBillingCycle.service.ts`
  - `mcrDemandAutomation.service.ts`
  - `mcrDemandAutomation.worker.ts`
- A missing `sama.routes.ts` file and a type-only `samaSource.service.ts` issue were also repaired because they blocked repository-wide backend compilation.
- A focused out-of-sandbox in-memory replay confirmed demand automation now generates and publishes three monthly cycles cleanly after tightening the late-fee uniqueness index to exclude regular demands.
- The latest database-backed Jest rerun is still not reliable end-to-end because the current SAMA route tree references controller files that are not present on disk, which breaks the Jest app bootstrap path even though the backend TypeScript build passes.

## Additional Phase 2 foundation hardening completed

- Added shared MCR numbering and money helpers:
  - `backend/src/modules/mcr/mcrNumbering.service.ts`
  - `backend/src/modules/mcr/mcr.money.ts`
  - `backend/src/modules/mcr/mcrDomain.types.ts`
- Added MCR-owned financial foundation models for:
  - payment records
  - payment allocations
  - receipts
  - notification dispatch logs
- Consolidated ledger enhancements into the active MCR ledger path instead of introducing a second ledger model.
- Updated demand publish flow to use the shared MCR numbering service.
- Added backend domain regression coverage in:
  - `backend/src/tests/mcr-domain.test.ts`
  - `backend/src/tests/mcr-tenant-keys.test.ts`
- Confirmed all MCR source files remain below the 200-line cap.

## Locked decisions

- Canonical module code: `MCR`
- Runtime code location:
  - `backend/src/modules/mcr`
  - `frontend/src/modules/mcr`
- Root `MCR/` folder purpose: planning and documentation
- Financial storage rule: paise integers only
- Ledger rule: immutable entries with reversal-based correction

## Next actions

1. Decide whether MCR should expose its own proof-upload convenience endpoint or continue reusing the shared `fileAsset` upload flow with `moduleCode=MCR`.
2. Extend demand reminders beyond the current in-app batch flow into the same provider-backed email and WhatsApp dispatch path used by receipts.
3. Add late-fee and grace-period charging flows beyond reminder-driven `OVERDUE` state handling.
4. Build payment gateway foundation and webhook storage/processing.
5. Decide whether receipt output should remain HTML-first or add a real PDF renderer dependency.
6. Keep legacy generic `payment` and `receipt` modules separate from MCR accounting truth.

## Deferred integrations

- Live payment gateway provider integrations are deferred to a later phase. Current backend scope keeps the mock provider foundation only.
- Real SMS delivery is deferred to a later phase. Current backend scope keeps SMS as an auditable unsupported/skip path.

## Remaining delivery scope

- Frontend UI and resident/admin screens remain pending.

## Open decisions to resolve during later phases

- Whether any current payment or receipt UI paths should be retained as non-MCR legacy features
- Whether receipt documents should be persisted as generated files or rendered on demand
- Whether to consolidate the active `demand.model.ts` and `ledger.model.ts` naming with the newer `mcr*` document naming set
