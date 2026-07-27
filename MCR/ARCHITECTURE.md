# MCR Architecture

Date: July 26, 2026
Status: Updated through backend completion pass

## 1. Placement strategy

The repository is not dynamically plugin-loaded. To keep MCR isolated while staying compatible with the current build setup:

- Documentation and planning live in `MCR/`.
- Backend runtime code will live in `backend/src/modules/mcr`.
- Frontend runtime code will live in `frontend/src/modules/mcr`.

This avoids TypeScript build refactors while preserving clear module ownership.

## 2. Minimal core integrations

MCR should only touch the core platform at the following points:

- Module code and permission constants
- Module seed registration
- Backend route registration
- Frontend route registration
- Sidebar and mobile navigation wiring
- Shared permission helpers if required

Everything else should remain MCR-owned.

## 3. Backend architecture

Planned folder shape:

```text
backend/src/modules/mcr/
  access/
  api/
  domain/
  services/
  repositories/
  workers/
  reports/
  notifications/
  gateway/
  validation/
  tests/
```

Backend design rules:

- Society-aware access service modeled after Visitor access.
- Zod DTO validation at API boundaries.
- Mongoose models with compound indexes including `societyId`.
- Sequence counters for demand and receipt numbering.
- Financial state transitions through services only.
- Immutable ledger entries with reversal-based correction.
- Audit logging on all meaningful events.

Current backend implementation status:

- Settings, charge heads, billing plans, demands, payments, receipts, ledger, and sequence counters are implemented under the MCR module namespace.
- Shared MCR money and numbering helpers now sit underneath both demand publication and payment flows.
- Billing-plan `billingDay` and `dueDay` now drive both manual draft creation and scheduled demand generation.
- Tenant-safe unique keys are enforced for draft demand identity, official numbering, and manual payment idempotency.
- Future published demands now consume previously created advance balances through explicit `ADVANCE` allocations tied back to the original verified payment.
- Reminder dispatch now reuses the shared notification module, supports in-app/email/WhatsApp delivery, writes MCR-owned dispatch logs, and can run through a disabled-by-default interval worker.
- Demand automation now backfills due billing cycles from active plans and can auto-publish them through a dedicated interval worker.
- Late-fee automation now generates recurring late-fee demands through a dedicated interval worker.
- MCR now exposes backend report/query endpoints for summary, flat statement, and collection register views.
- Receipt lifecycle now includes:
  - signed public verification links
  - shareable public receipt documents
  - authenticated receipt HTML document/download rendering
  - SVG poster/image rendering for print-friendly output
  - replacement-based correction instead of mutating issued receipts
  - auditable multi-channel receipt dispatch using shared communication services
- Payment gateway handling now includes:
  - per-society gateway configuration
  - order creation
  - webhook event persistence
  - mock-provider verification flow with optional auto-verification

## 4. Frontend architecture

Planned folder shape:

```text
frontend/src/modules/mcr/
  pages/
  components/
  hooks/
  services/
  routes/
  tests/
```

Frontend design rules:

- Reuse existing layout, cards, tables, modals, toasts, and skeletons.
- Reuse the existing Lucide icon library only.
- Gate screens by permission and enabled-module state.
- Do not expose routes or nav items when the module is disabled.
- Show explicit module-disabled states for deep links.

## 5. Core domain ownership

MCR will own these backend models:

- MCR society settings
- Charge heads
- Billing plans
- Demands
- Payment records
- Payment allocations
- Receipts
- Ledger entries
- Notification dispatch logs
- Sequence counters
- Gateway configuration
- Gateway webhook events

Existing generic `payment` and `receipt` modules remain platform history and should not become MCR's source of financial truth.

## 6. Reused platform services

MCR should reuse existing platform services for:

- Auth token context
- Society scoping helpers
- Audit log persistence
- File asset metadata and secure proof attachment
- In-app notifications
- FCM push provider abstraction

MCR should extend, not replace, these shared systems.

## 7. Worker and scheduling approach

The repo currently has an interval-based worker pattern, not a full queue framework.

MCR workers should therefore start with:

- Reminder scheduler
- Demand generation scheduler
- Retry failed dispatches worker
- Reconciliation dry-run worker

Current worker implementation status:

- Reminder scheduling is implemented through `mcrReminderWorker`, following the same interval pattern as the Visitor expiry worker.
- Demand automation is implemented through `mcrDemandAutomationWorker`.
- Late-fee automation is implemented through `mcrLateFeeWorker`.
- All MCR workers are disabled by default and controlled by environment flags so they do not disturb existing deployments.

Workers must:

- Skip disabled societies
- Be retry-safe
- Use idempotency controls
- Expose status for health and operations

## 8. Financial integrity rules

- Store all money in paise integers.
- Never trust client-side totals.
- Verify module entitlement and permission before every action.
- Post ledger entries only from controlled service methods.
- Use unique keys and versioning to prevent duplicate demand creation, duplicate receipt creation, and double verification.
- Correct mistakes through reversal or adjustment workflows, never destructive edits.

## 9. Early risks

- Existing placeholder `MAINTENANCE` naming can cause confusion during rollout.
- Hard-wired router and navigation mean "minimal disturbance" still requires a few manual core edits.
- Current generic payments and receipts are simpler than MCR requirements and must not be overextended into accounting truth.

## 10. Architecture decision summary

1. `MCR` is the canonical module code.
2. Runtime code stays under backend and frontend `src` trees.
3. Root `MCR/` is documentation-first.
4. MCR owns its own financial data model.
5. Shared platform systems are reused through thin integration points only.

## 11. Locked rendering decision

- Receipts stay HTML-first on the backend.
- Print/image export uses the SVG poster endpoint rather than introducing a server-side PDF renderer at this stage.
