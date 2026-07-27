# MCR Handoff

Date: July 26, 2026
Prepared for: next developer handoff
Current backend status: core product backend completed
Deferred integrations: live gateway provider, real SMS provider

## 1. Scope completed

The MCR module is implemented as a backend-first financial/accounting module under `backend/src/modules/mcr`, with only minimal shell wiring on the frontend.

Completed backend capability:

- module registration, permission gating, and society-aware access control
- MCR settings
- charge heads
- billing plans
- manual demand draft generation
- demand publish with immutable ledger posting
- advance credit creation and future demand consumption
- manual payment lifecycle:
  - create
  - verify
  - reject
  - cancel
  - bounce
- maker-checker enforcement
- receipt issuance
- receipt void and replacement workflows
- authenticated receipt HTML rendering
- public receipt verification/share links
- print-friendly receipt poster/image rendering through SVG
- demand reminders with dispatch logging
- demand automation worker
- late-fee automation worker
- reporting endpoints
- payment gateway foundation with mock order/webhook flow

## 2. Main locations

Backend runtime:

- `backend/src/modules/mcr`

Planning and docs:

- `MCR/IMPLEMENTATION_PLAN.md`
- `MCR/ARCHITECTURE.md`
- `MCR/IMPLEMENTATION_PROGRESS.md`
- `MCR/HANDOFF.md`

Frontend shell already present:

- `frontend/src/modules/mcr/McrPage.tsx`
- `frontend/src/modules/mcr/mcr.permissions.ts`
- `frontend/src/App.tsx`
- `frontend/src/components/layout/Sidebar.tsx`

## 3. Locked implementation decisions

- Canonical module code is `MCR`.
- MCR runtime stays inside existing backend/frontend `src` trees. Root `MCR/` is documentation only.
- Money is stored in paise integers only.
- Ledger is immutable. Corrections use reversal or replacement flows, not destructive edits.
- Receipts are HTML-first on the backend.
- Print-friendly receipt output is currently an SVG poster endpoint. There is no server-side PDF or JPEG renderer.
- Live gateway integration is deferred. Only mock gateway foundation is implemented.
- Real SMS integration is deferred. SMS currently records auditable skip/unsupported dispatches.

## 4. Key backend files

Core module and routing:

- `backend/src/modules/mcr/mcr.manifest.ts`
- `backend/src/modules/mcr/mcr.access.service.ts`
- `backend/src/modules/mcr/mcr.routes.ts`

Configuration and foundations:

- `backend/src/modules/mcr/mcrSettings.model.ts`
- `backend/src/modules/mcr/chargeHead.model.ts`
- `backend/src/modules/mcr/billingPlan.model.ts`
- `backend/src/modules/mcr/sequenceCounter.model.ts`
- `backend/src/modules/mcr/mcrNumbering.service.ts`
- `backend/src/modules/mcr/mcr.money.ts`
- `backend/src/modules/mcr/mcrDomain.types.ts`

Demands and automation:

- `backend/src/modules/mcr/demand.model.ts`
- `backend/src/modules/mcr/demandDraft.service.ts`
- `backend/src/modules/mcr/demandPublish.service.ts`
- `backend/src/modules/mcr/mcrBillingCycle.service.ts`
- `backend/src/modules/mcr/mcrDemandAutomation.service.ts`
- `backend/src/modules/mcr/mcrDemandAutomation.worker.ts`
- `backend/src/modules/mcr/mcrLateFee.service.ts`
- `backend/src/modules/mcr/mcrLateFee.worker.ts`

Payments, advances, receipts, ledger:

- `backend/src/modules/mcr/mcrPaymentRecord.model.ts`
- `backend/src/modules/mcr/mcrPaymentAllocation.model.ts`
- `backend/src/modules/mcr/mcrPayment.service.ts`
- `backend/src/modules/mcr/mcrPaymentVerification.service.ts`
- `backend/src/modules/mcr/mcrPaymentLifecycle.service.ts`
- `backend/src/modules/mcr/mcrAdvance.service.ts`
- `backend/src/modules/mcr/mcrReceipt.model.ts`
- `backend/src/modules/mcr/mcrReceipt.service.ts`
- `backend/src/modules/mcr/mcrReceiptDocument.service.ts`
- `backend/src/modules/mcr/mcrReceiptPublic.service.ts`
- `backend/src/modules/mcr/mcrReceiptPoster.service.ts`
- `backend/src/modules/mcr/mcrReceiptLifecycle.service.ts`
- `backend/src/modules/mcr/ledger.model.ts`
- `backend/src/modules/mcr/ledger.service.ts`

Reminders, dispatch, reporting, gateway:

- `backend/src/modules/mcr/mcrNotificationDispatch.model.ts`
- `backend/src/modules/mcr/mcrReminder.service.ts`
- `backend/src/modules/mcr/mcrReminder.worker.ts`
- `backend/src/modules/mcr/mcrDemandDispatch.service.ts`
- `backend/src/modules/mcr/mcrDispatch.service.ts`
- `backend/src/modules/mcr/mcrReport.service.ts`
- `backend/src/modules/mcr/mcrGateway.service.ts`
- `backend/src/modules/mcr/mcrGatewayConfig.model.ts`
- `backend/src/modules/mcr/mcrGatewayWebhookEvent.model.ts`

## 5. Route summary

Public routes:

- `POST /api/mcr/public/gateway/webhook/:provider`
- `GET /api/mcr/public/receipts/verify`
- `GET /api/mcr/public/receipts/document`
- `GET /api/mcr/public/receipts/poster`

Context and setup:

- `GET /api/mcr/context`
- `GET /api/mcr/settings`
- `PATCH /api/mcr/settings`
- `GET /api/mcr/charge-heads`
- `POST /api/mcr/charge-heads`
- `GET /api/mcr/billing-plans`
- `POST /api/mcr/billing-plans`

Demands and automation:

- `GET /api/mcr/demands`
- `POST /api/mcr/demands/drafts`
- `POST /api/mcr/demands/automation/run`
- `POST /api/mcr/demands/:demandId/publish`
- `POST /api/mcr/demands/:demandId/reminders`
- `POST /api/mcr/late-fees/run`
- `POST /api/mcr/reminders/run`

Payments:

- `GET /api/mcr/payments`
- `GET /api/mcr/payments/:paymentId`
- `POST /api/mcr/payments`
- `POST /api/mcr/payments/:paymentId/verify`
- `POST /api/mcr/payments/:paymentId/reject`
- `POST /api/mcr/payments/:paymentId/cancel`
- `POST /api/mcr/payments/:paymentId/bounce`

Receipts:

- `GET /api/mcr/receipts`
- `GET /api/mcr/payments/:paymentId/receipt`
- `GET /api/mcr/receipts/:receiptId`
- `GET /api/mcr/receipts/:receiptId/document`
- `GET /api/mcr/receipts/:receiptId/download`
- `GET /api/mcr/receipts/:receiptId/poster`
- `GET /api/mcr/receipts/:receiptId/share`
- `POST /api/mcr/receipts/:receiptId/void`
- `POST /api/mcr/receipts/:receiptId/replace`
- `POST /api/mcr/receipts/:receiptId/send`

Reports and gateway:

- `GET /api/mcr/reports/summary`
- `GET /api/mcr/reports/statement`
- `GET /api/mcr/reports/collections`
- `GET /api/mcr/gateway/config`
- `PATCH /api/mcr/gateway/config`
- `POST /api/mcr/gateway/orders`

## 6. Worker and env flags

All MCR workers are disabled by default and use interval-based scheduling.

Demand automation worker:

- `MCR_DEMAND_WORKER_ENABLED`
- `MCR_DEMAND_WORKER_INTERVAL_MS`
- `MCR_DEMAND_WORKER_CYCLE_LIMIT`

Reminder worker:

- `MCR_REMINDER_WORKER_ENABLED`
- `MCR_REMINDER_WORKER_INTERVAL_MS`
- `MCR_REMINDER_BATCH_SIZE`

Late-fee worker:

- `MCR_LATE_FEE_WORKER_ENABLED`
- `MCR_LATE_FEE_WORKER_INTERVAL_MS`
- `MCR_LATE_FEE_BATCH_SIZE`

Worker startup/shutdown wiring is in:

- `backend/src/server.ts`
- `backend/src/modules/health/health.controller.ts`

## 7. Important behavior notes

- Demand automation backfills due cycles from `effectiveFrom` up to `asOf`, using billing-plan frequency.
- `billingDay` and `dueDay` are now operational. Manual draft creation also respects billing-plan due dates.
- Future published demands consume verified advance balances oldest-first through `ADVANCE` allocations.
- Bouncing the source payment restores future-demand balances.
- Receipt correction is replacement-based for verified payments. Active verified payments must retain an active receipt.
- Public receipt verification uses a signed token plus stored token hash.
- The receipt poster route returns SVG. If frontend wants JPEG print/export later, it should rasterize client-side or introduce a separate renderer.
- Gateway provider currently supported is `MOCK` only.

## 8. Tests and verification

Relevant MCR tests currently in repo:

- `backend/src/tests/mcr-module.test.ts`
- `backend/src/tests/mcr-foundation.test.ts`
- `backend/src/tests/mcr-demand.test.ts`
- `backend/src/tests/mcr-demand-automation.test.ts`
- `backend/src/tests/mcr-payment.test.ts`
- `backend/src/tests/mcr-payment-lifecycle.test.ts`
- `backend/src/tests/mcr-payment-advance.test.ts`
- `backend/src/tests/mcr-receipt.test.ts`
- `backend/src/tests/mcr-reminder-report.test.ts`
- `backend/src/tests/mcr-latefee.test.ts`
- `backend/src/tests/mcr-gateway.test.ts`
- `backend/src/tests/mcr-domain.test.ts`
- `backend/src/tests/mcr-tenant-keys.test.ts`

Verification completed:

- backend TypeScript compile passed on July 26, 2026
- focused out-of-sandbox in-memory replay confirmed demand automation now generates and publishes monthly cycles cleanly

Verification caveat:

- the latest full DB-backed Jest rerun is not fully reliable because the current SAMA route tree references files that are missing on disk, which can break Jest app bootstrap even though the MCR backend compile is passing
- the current SAMA route issue is centered around imports in `backend/src/modules/sama/sama.routes.ts`

Known pre-existing warning:

- duplicate Mongoose index warning on `code`

## 9. Frontend status for the next coder

Frontend was intentionally left as a shell only.

What already exists:

- `/mcr` route registration
- sidebar visibility and module gating
- permission helper file
- placeholder `McrPage`

What does not exist yet:

- real admin screens
- resident screens
- API wiring for actual MCR workflows
- MCR frontend test coverage beyond the shell state

The frontend coder should build on the existing shell rather than create a parallel module path.

## 10. Deferred items

- live gateway provider integration
- real SMS provider integration

## 11. Recommendation for the next owner

If the next owner is frontend-only:

- keep backend contracts as the source of truth
- use existing `/api/mcr/*` endpoints
- preserve current module code, route path, and theme shell

If the next owner is backend again later:

- add a real gateway provider under the current gateway foundation rather than replacing it
- add an SMS adapter through the current dispatch logging path
- repair the SAMA Jest bootstrap issue before relying on full backend suite runs
