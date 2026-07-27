# SAMA EdgeFolio Reuse and Bridge Plan

Date: July 25, 2026
Status: Planning

## Source location

External project inspected:

- `D:\IOT Device\Salary_On\smart_salary\EdgeFolio`

Primary backend source:

- `EdgeFolio/EDGE/backend`

## Key finding

SAMA should not reimplement attendance, payroll, payslips, or machine communication first for societies that use EdgeFolio-backed devices.

SAMA should build a bridge and treat EdgeFolio as the source system for those domains.

## What EdgeFolio already has

Confirmed in the inspected source:

- employee routes
- attendance routes
- payroll routes
- leave routes
- payment routes
- shift routes
- machine routes
- M68 routes
- U5 routes
- APK attendance sync routes

Representative API groups from EdgeFolio:

- `/api/v1/employees`
- `/api/v1/attendance`
- `/api/v1/payroll`
- `/api/v1/leaves`
- `/api/v1/payments`
- `/api/v1/shifts`
- `/api/v1/machines`
- `/api/v1/m68`
- `/api/v1/u5`
- `/api/v1/apk`

## Reuse decision

### Reuse by bridging

Use EdgeFolio as the source of truth for:

- employee master records
- attendance events or attendance summaries
- leave records
- payroll runs
- payslips
- payroll payment/export status
- machine inventory and health summaries
- M68 and U5 device metadata

### Do not copy blindly

Do not directly copy large EdgeFolio code into Jenix unless a later step proves a very small, isolated utility is worth porting.

Preferred strategy:

- integrate by server-to-server bridge
- normalize data into Jenix SAMA records
- keep imported source identifiers for traceability

## Jenix-side bridge design

Existing Jenix extension point:

- `backend/src/modules/bridge`

SAMA should extend that pattern with an EdgeFolio connector layer.

Recommended Jenix bridge capabilities:

- register society EdgeFolio source
- store EdgeFolio base URL
- store encrypted EdgeFolio access token or bridge credential
- test connection
- pull employees
- pull attendance
- pull leaves
- pull payroll runs
- pull payslips
- pull machine status
- record sync audit logs
- keep sync checkpoints

## First-release sync direction

First release should be one-way:

- EdgeFolio -> Jenix

Jenix should not send machine commands or payroll mutations back into EdgeFolio in the first phase.

## Suggested mapping layers

EdgeFolio -> Jenix SAMA mapping:

- employee -> `StaffProfile` plus active `StaffEngagement`
- attendance record -> `AttendanceEvent` or imported `AttendanceDay`
- leave -> `LeaveRecord`
- payroll run -> imported `PayrollRun`
- payslip -> imported `PayrollEntry` or payslip snapshot
- machine device -> SAMA bridge device source mapping

## Data to exclude or restrict

Do not import into Jenix general APIs:

- raw biometric templates
- unrestricted face image archives
- secrets or device credentials
- full bank data unless explicitly required and permission-restricted

If face-related metadata is needed, import only safe status fields such as:

- enrolled yes/no
- verification state
- last sync status

## Security rules

- server-to-server only
- no browser direct calls to EdgeFolio
- no EdgeFolio tokens exposed to frontend clients
- society-specific connector config only
- audit all connector changes and manual syncs
- idempotent import keys for all bridged records

## Immediate implementation impact on SAMA

The existence of EdgeFolio changes SAMA priorities:

1. Build module skeleton
2. Build EdgeFolio source registration and bridge auth
3. Import employee, attendance, and payroll data
4. Add Jenix-specific overlays:
   - flat associations
   - resident approvals
   - society access rules
   - resident and guard views
5. Add reports and notifications

Native Jenix payroll or native machine ingestion should be deferred unless a society is not using EdgeFolio.
