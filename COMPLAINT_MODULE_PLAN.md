# Complaint Management Module — Design Plan

## Status
Planning only — no code written yet. This is the design to review/approve before implementation begins. Slots into the existing `COMPLAINT` module registry entry (`backend/src/config/constants.ts` → `MODULE_CODES.COMPLAINT`, `backend/src/seeds/modules.seed.ts:15` — currently `status: 'COMING_SOON'`, `routePrefix: '/complaints'`, `apiPrefix: '/api/complaints'`, already reserved for all plan tiers).

## Goal
One complaint/ticketing system that works unmodified for both verticals:
- **Community**: a resident (owner/tenant/family member) raises a complaint about their flat or a common area.
- **Hostel**: a hostel member raises a complaint about their room, or their **parent** raises one on their behalf (parents get read/raise access to their linked ward's complaints — this is why the Parent role being built now matters here too).

The same categories, lifecycle, and routing logic apply to both — the only difference is who's allowed to raise/view (resident vs. resident-or-parent) and what a "location" means (flat vs. room/bed).

## How this is handled in real society/hostel/property management systems (research basis)
Every mature system in this space (residential society apps like MyGate/ADDA/NoBrokerHood, hostel/PG management platforms, and general property-management CMMS tools) converges on the same shape, because the underlying problem is identical — a **triage-and-route** workflow, not a generic support-ticket system:

1. **Structured category taxonomy**, not free text — categories map directly to *who* can fix it, so routing can be automatic.
2. **Auto-assignment by category → staff category**, with manual override always available. This maps directly onto SAMA's existing `StaffCategory` model (`backend/src/modules/sama/staffCategory.model.ts`) — e.g. a complaint tagged `ELECTRICAL` auto-routes to staff whose `StaffCategory.code` is `ELECTRICIAN`.
3. **SLA timers per category/priority**, with escalation to a human (admin/committee/warden) on breach — not silent failure.
4. **A visible status lifecycle** the raiser can track, not a black box.
5. **Photo evidence** attached at raise time — overwhelmingly the norm; "electrical socket sparking" is meaningless without a photo.
6. **Post-resolution feedback** (thumbs up/down or 1–5 rating) — the #1 mechanism these systems use to catch staff who mark things resolved without actually fixing them.
7. **A small number of categories get special handling**: safety/harassment-adjacent complaints (ragging, misconduct, security incidents) route directly to admin/warden, never to a staff category, and are hidden from the general complaint list/reports even from other admins where the platform supports it. This is the one place hostel management genuinely diverges from society management and deserves explicit design attention, not an afterthought.

## Category taxonomy

Two-level: a fixed top-level `category` (drives routing) and a free-text `subCategory`/description for specifics.

**Shared (both verticals) — routes to a StaffCategory:**
| Category | Typical StaffCategory.code |
|---|---|
| ELECTRICAL | ELECTRICIAN |
| PLUMBING | PLUMBER |
| CLEANING_HOUSEKEEPING | HOUSEKEEPING |
| SEWERAGE_DRAINAGE | PLUMBER or SANITATION |
| WATER_SUPPLY | PLUMBER |
| PEST_CONTROL | PEST_CONTROL |
| CARPENTRY | CARPENTER |
| PAINTING | PAINTER |
| LIFT_ELEVATOR | LIFT_TECHNICIAN (or external vendor — see below) |
| INTERNET_CABLE | FACILITY_MANAGER / external ISP vendor |
| CIVIL_STRUCTURAL | FACILITY_MANAGER (usually needs admin sign-off before assignment — structural work is costly) |
| PARKING | SECURITY_GUARD / FACILITY_MANAGER |
| NOISE_NUISANCE | COMMITTEE_MEMBER (interpersonal, not a repair job) |
| GARDEN_LANDSCAPING | GARDENER |
| OTHER | FACILITY_MANAGER (manual triage) |

**Hostel-only:**
| Category | Routing |
|---|---|
| MESS_FOOD_QUALITY | Mess in-charge staff category |
| LAUNDRY | HOUSEKEEPING |
| ROOMMATE_ROOM_ISSUE | Warden (SOCIETY_ADMIN-equivalent for hostel) — interpersonal, needs human judgment |
| WARDEN_CONDUCT | **Admin only, never the warden themselves** — see sensitive-category handling below |
| SAFETY_RAGGING_HARASSMENT | **Admin only, confidential** — see below |

**Sensitive-category handling (hostel-specific, important):** `WARDEN_CONDUCT` and `SAFETY_RAGGING_HARASSMENT` are flagged `isSensitive: true` on the category definition. Sensitive complaints:
- Are never auto-assigned to a staff category — always land directly with `SOCIETY_ADMIN`/`JENIX_SUPPORT`, never the resident's own warden even if the warden holds admin-equivalent permissions for that hostel (a warden shouldn't see complaints filed against themselves).
- Are excluded from the general complaint list/dashboard/reports that other staff or committee members can see — visible only to whoever they're assigned to plus the raiser.
- Optionally support anonymous raising (`raiserVisible: false` — store the real `raisedBy` for audit but never surface it in the UI to anyone except super admin).

An external vendor case (e.g. `LIFT_ELEVATOR` when no in-house lift technician exists) reuses SAMA's existing `ServiceProvider`/service-pool concept rather than inventing a second vendor model — needs confirming against `sama.manifest.ts`'s service-pool routes before implementation, flagged as an open question below.

## Status lifecycle
```
OPEN → ACKNOWLEDGED → ASSIGNED → IN_PROGRESS → RESOLVED → CLOSED
                                      ↓              ↓
                                  ON_HOLD        REOPENED → back to ASSIGNED
                                                     
(any state) → CANCELLED  (raiser withdraws, or admin rejects as invalid/duplicate)
```
- `OPEN`: raised, not yet acknowledged. SLA clock starts here.
- `ACKNOWLEDGED`: a human has seen it (auto-set the moment it's auto-assigned, or manually by admin for sensitive/OTHER categories).
- `ASSIGNED`: has an owner (staff member, staff category queue, or admin).
- `IN_PROGRESS` / `ON_HOLD`: staff-reported working state (`ON_HOLD` requires a reason — e.g. waiting on a part).
- `RESOLVED`: staff marks done → triggers a feedback prompt to the raiser.
- `CLOSED`: either auto-closed N days after `RESOLVED` with no reopen, or raiser explicitly confirms.
- `REOPENED`: raiser disputes the resolution within the reopen window → goes back to `ASSIGNED`, same complaint record (full history preserved), not a new ticket — this is what makes the resolution-quality signal meaningful in reporting.

## SLA & escalation
Per-category default SLA (admin-configurable per society): e.g. Electrical/Plumbing = 4 hours to acknowledge, 24 hours to resolve; Painting/Civil = 3 days. On breach of the acknowledge-SLA, auto-escalate: notify `SOCIETY_ADMIN`/warden via the same FCM+WhatsApp-fallback channel being built for guardian alerts — this is a second consumer of that same notification path, not a separate one.

## Visibility rules
| Role | Sees |
|---|---|
| Resident / Hostel member | Own complaints only |
| Parent | Their linked ward's complaints only (raise + view, not resolve) |
| Assigned staff (SAMA StaffProfile) | Complaints assigned to them |
| SOCIETY_ADMIN / Warden | All complaints for their society, except sensitive ones not assigned to them |
| COMMITTEE_MEMBER | Read + reports, no direct resolve action (matches existing SAMA pattern where committee gets `_VIEW`/`_APPROVE` but not the operational verbs) |
| JENIX_SUPER_ADMIN / SUPPORT | All, including sensitive (support escalation path) |

## Data model sketch
```
Complaint {
  societyId, vertical ('COMMUNITY'|'HOSTEL'),
  raisedByResidentId, raisedByParentId?,     // one of these two, not both
  onBehalfOfResidentId?,                      // set when a parent raises for their ward
  flatId,                                     // room, for hostel
  category, subCategory?, description, photoFileIds[],
  priority ('LOW'|'MEDIUM'|'HIGH'|'URGENT'),
  isSensitive, raiserVisible,
  status, statusHistory: [{status, at, byUserId, note?}],
  assignedToType ('STAFF'|'STAFF_CATEGORY'|'ADMIN'|'SERVICE_PROVIDER'),
  assignedToId?, assignedAt?,
  slaAcknowledgeDueAt, slaResolveDueAt, escalatedAt?,
  resolvedAt?, resolutionNote?,
  feedbackRating? (1-5), feedbackComment?,
  createdAt, updatedAt
}
ComplaintCategoryConfig {  // per-society override of the shared taxonomy defaults
  societyId, code, name, defaultStaffCategoryCode?, isSensitive, slaAcknowledgeHours, slaResolveHours
}
```

## API surface (under existing `/api/complaints` prefix)
- `POST /api/complaints` — raise (resident or parent-on-behalf)
- `GET /api/complaints` — list, scoped by role per visibility table above
- `GET /api/complaints/:id`
- `PATCH /api/complaints/:id/assign` — admin/warden manual (re)assignment
- `PATCH /api/complaints/:id/status` — staff/admin transitions (validates allowed transitions server-side, not client-trusted)
- `POST /api/complaints/:id/feedback` — raiser only, only when `RESOLVED`
- `GET /api/complaints/categories` — society's effective taxonomy (defaults + overrides)
- `PATCH /api/complaints/categories/:code` — admin overrides SLA/routing per category

## Permissions (new constants, following the existing `MODULE.action` naming convention)
`COMPLAINT_CREATE`, `COMPLAINT_VIEW_OWN`, `COMPLAINT_VIEW_SOCIETY`, `COMPLAINT_ASSIGN`, `COMPLAINT_UPDATE_STATUS`, `COMPLAINT_VIEW_SENSITIVE`, `COMPLAINT_CONFIGURE`, `COMPLAINT_VIEW_REPORTS`.

## Notifications (reuses the FCM-primary/WhatsApp-fallback path being built now)
Raise confirmation → raiser; new assignment → assignee; status change → raiser; SLA breach → admin/warden; resolution → raiser (with feedback prompt).

## Reporting
Complaint volume by category/time, average acknowledge/resolve time vs. SLA, reopen rate (resolution-quality proxy), staff-level resolution counts — feeds the existing report module rather than a bespoke one.

## Open questions before implementation
1. Does an external-vendor routing path (`ServiceProvider`) already exist cleanly enough in SAMA to reuse, or does `LIFT_ELEVATOR`-type external cases need their own lightweight vendor stub in v1?
2. Per-society category customization (admin adds a category not in the shared list) — in scope for v1 or deferred?
3. Anonymous sensitive-complaint raising — confirm this is wanted before building the visibility-hiding logic, since it changes the audit-trail design meaningfully.

## Suggested phasing
1. Core lifecycle + shared categories + auto-routing to StaffCategory (Community + Hostel, no sensitive-category special-casing yet).
2. Sensitive-category handling + parent raise-on-behalf (depends on the Parent role work landing first).
3. SLA/escalation + feedback rating.
4. Reporting dashboard.
