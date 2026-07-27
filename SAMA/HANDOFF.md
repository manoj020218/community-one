# SAMA Handoff

Date: July 27, 2026
Status: Backend hardened; customer-specific EdgeFolio rollout pending demand

## Purpose

This document is the handoff point for SAMA work in Jenix Community One.

The current decision is:

- the SAMA backend foundation and hardening work are already done
- do not start customer-specific EdgeFolio rollout work until a real society/customer requests EdgeFolio-backed machine usage in Jenix

## Current delivery status

SAMA backend is already implemented to a strong bridge-first baseline under:

- `backend/src/modules/sama`

What already exists:

- SAMA module registration, permissions, and actor context
- EdgeFolio source configuration with encrypted token storage
- sync endpoints for:
  - employees
  - attendance
  - leaves
  - shifts
  - payroll
  - access events
- scheduled sync worker support
- EdgeFolio device discovery and Jenix device binding
- native SAMA records for:
  - staff profiles
  - staff engagements
  - household associations
  - staff categories
  - household rate cards
  - household payment records
  - service providers
  - work orders
  - access policies
  - access credentials
- staff lifecycle actions:
  - approve
  - suspend
  - reinstate
  - terminate
- work-order lifecycle actions:
  - reschedule
  - escalate
  - cancel
- sync hardening:
  - retry-limit configuration
  - stale-sync thresholds
  - sync health visibility
  - retry of failed sync runs
- access exception handling:
  - unmatched-device detection
  - unknown-event detection
  - manual resolve/ignore flow
- SAMA reporting and CSV export endpoints
- notifications for:
  - household payments
  - work-order lifecycle actions
  - sync attention alerts
  - access exception alerts

## Current validation baseline

As of July 27, 2026:

- backend TypeScript build: passed
- SAMA-targeted backend tests: `8/8` suites passed and `9/9` tests passed

Known unrelated repo status:

- repo-wide backend is not fully green because of separate MCR failures
- existing Mongoose duplicate `code` index warning is still present

## EdgeFolio bridge position

The bridge is not a zero-start task anymore.

Practical status:

- backend bridge is already built
- backend hardening baseline is already built
- remaining work is mostly customer-specific onboarding, live validation, frontend, and release operations

Working estimate if a real customer asks for EdgeFolio machine use:

- backend connection setup, live validation, and first society onboarding: about `1 to 3 working days`
- broader production rollout with frontend, monitoring, and customer-site validation: about `1 to 2 weeks`

## Hold decision

Do not start customer-specific rollout work until the trigger below is true.

Resume only when all of these are available:

- a real society/customer confirms they are using EdgeFolio-backed machines
- that customer wants Jenix SAMA to read data from EdgeFolio
- access details are available:
  - EdgeFolio base URL or reachable host
  - API token/credential
  - sample machine/device IDs
  - target society in Jenix

## What to do when demand arrives

1. Confirm the customer is actually using EdgeFolio machine integrations.
2. Collect the customer-specific connection details and test environment access.
3. Configure SAMA source settings for that society.
4. Run manual sync first for:
   - employees
   - attendance
   - leaves
   - shifts
   - payroll
   - access events
5. Bind EdgeFolio devices to Jenix devices.
6. Validate imported staff, attendance, payroll, and access data with the customer.
7. Only then enable scheduled sync.
8. After first live use, close any customer-specific gaps found during rollout.

## Remaining work when resumed

If rollout work is resumed for a real customer, the next work should focus on:

- customer-specific EdgeFolio endpoint and field validation
- live machine/device binding verification
- first-society reconciliation of staff, attendance, payroll, and access records
- rollout monitoring and alert tuning
- additional frontend/admin screens if the customer needs them immediately
- more tenant-isolation and idempotency tests if rollout uncovers edge cases

Optional later work, only if product scope needs it:

- webhook or push-style bridge additions
- richer device/person identity resolution
- more report/export filters
- native Jenix attendance/payroll only for non-EdgeFolio societies

## Files to start from

Primary SAMA backend runtime:

- `backend/src/modules/sama`

Primary SAMA docs:

- `SAMA/IMPLEMENTATION_PLAN.md`
- `SAMA/ARCHITECTURE.md`
- `SAMA/EDGEFOLIO_REUSE.md`
- `SAMA/IMPLEMENTATION_PROGRESS.md`
- `SAMA/HANDOFF.md`
- `SAMA/FRONTEND_HANDOFF.md`

External reference source:

- `D:\IOT Device\Salary_On\smart_salary\EdgeFolio`

## Final note

SAMA backend is in a strong stopping state for now.

The correct business decision is to wait for real customer demand before doing society-specific EdgeFolio rollout work. When a real society wants to use EdgeFolio-backed machines with Jenix, the team can resume from a hardened backend baseline instead of starting from scratch.

For frontend delivery, use:

- `SAMA/FRONTEND_HANDOFF.md`
