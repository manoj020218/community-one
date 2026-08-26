# Jenix Community One — Developer Handoff

**Product:** Jenix Community One — Multi-tenant Society Management SaaS  
**Live URL:** https://community.iotsoft.in  
**Backend URL:** https://community.backend.iotsoft.in  
**GitHub:** https://github.com/manoj020218/community-one  
**VPS:** 154.61.69.200 (root access via PuTTY stored credentials)

---

## Recent Activity Log

*(Newest entry first — append new entries here rather than editing old ones.)*

### 2026-08-26 (cont'd 2) — nginx never sent Cache-Control on index.html (root cause of "mobile app still shows old"); MCR reminders never actually requested WhatsApp

**Root cause of persistent staleness in the native (Capacitor) app, unrelated to the service
worker fixes earlier today.** The native app deliberately does NOT register a service worker
(`pwaRegister.ts` unregisters any existing one on native launch), so the SW denylist fix below
could never have applied there. Found instead: nginx was serving `index.html` with **no
Cache-Control header at all** (`curl -sI https://community.iotsoft.in/` confirmed), so the
Android WebView (and any browser) was free to cache it indefinitely under its own heuristics —
permanently pinning the app to old hashed JS/CSS filenames no matter how many redeploys
followed. This affected every client, every platform, since the site went live — not just the
native app, just most visible there since a WebView's cache is stickier than a browser tab's.
Fixed at the nginx layer (config only — not in this git repo):
`/etc/nginx/sites-available/community` on the VPS now has `location /assets/ { add_header
Cache-Control "public, max-age=31536000, immutable"; }` (content-hashed, safe to cache forever)
and both `location = /index.html` and the fallback `location /` send `Cache-Control: no-cache,
no-store, must-revalidate`. Verified via curl post-reload. **This does not retroactively evict
what's already cached in an already-installed app instance** — if a user's app still looks
stale after this, they need to force-close it and clear the app's storage cache once (Android
Settings → Apps → Jenix Community → Storage → Clear Cache, not Clear Data) — after that, every
future deploy picks up correctly with no user action needed. The earlier "WhatsApp number not
showing" report from today was very likely the same symptom (the phone number rendering code
was already correct), not a separate bug.

**MCR "Remind" button / bulk "Send Reminders" never sent WhatsApp (or Email) reminders.**
`McrDemandsTab.tsx` hardcoded `channels: ['IN_APP']` on both the per-demand reminder mutation
and the bulk run action — so a manual reminder could never reach WhatsApp regardless of
whether the linked WhatsApp session was connected. Only the automated background worker
(`mcrReminderWorker`, already correctly requesting `['IN_APP','EMAIL','WHATSAPP']`) ever sent
WhatsApp reminders. Fixed by requesting all three channels from both frontend actions, and
replaced the generic "Reminder sent" toast with one that reflects the real per-channel
sent/skipped result (e.g. surfaces "WhatsApp: WhatsApp is not connected" instead of silently
reporting success). Also added disconnect-code/reason logging to `whatsapp.service.ts`'s
`connection.update` handler — PM2 logs showed the Baileys session flapping (disconnect/
reconnect roughly every 90–165s) with no reason ever logged, so this was previously
undiagnosable; next time it flaps the actual Boom code/message will be in the logs. The
flapping itself is still unresolved — worth a closer look if WhatsApp deliveries keep getting
skipped even with this fix.

### 2026-08-26 (cont'd) — My Home's Payments tile showed the admin screen; residents couldn't see their own society/flat; Old Dues quick action

Found via live testing of "My Home" (Dheeraj Jain): the resident dashboard's "Payments" tile
always pointed at the legacy `/payments` page, which renders by *permission*, not by view
context — an admin-linked account (full `PAYMENT_CREATE`/`PAYMENT_READ`) landed on the full
admin payments screen instead of a resident-scoped view, exactly the gap flagged (but not yet
fixed) when "My Home" was originally built. Fixed by pointing to MCR's `/mcr?tab=mine` when
MCR is enabled and the account has resident self-service access (same destination a real
Owner/Tenant already gets) — falls back to `/payments` for societies not yet on MCR.

**Residents had no way to see which society/block/flat they belong to.** Root cause:
`FLAT_READ` is deliberately admin-only (browsing any flat), so a real Owner/Tenant/Family
Member account got a 403 on the one lookup that would show their own flat. New
`GET /flats/me` — scoped strictly to the caller's own `flatId` from the JWT, so no permission
check needed (can only ever return their own data). Wired into `ResidentDashboard.tsx`'s
welcome card (now shows society name + block + flat) and `ProfilePage.tsx` (added Society/
Block/Flat to the info grid) — the society name was already free via `user.societyName` from
login, only the flat lookup was missing.

**New: "Add Old Dues" quick action on the MCR Demands tab** — reuses the existing Opening
Balance bulk-dues endpoint (`POST /mcr/opening-balance/bulk-dues`) scoped to a single flat,
surfaced right on the Demands toolbar instead of requiring the separate wizard. Deliberately
kept as its own `OPENING_BALANCE` demand rather than merging into a regular bill (considered
and explicitly rejected — see conversation: would blur "this month" vs "arrears" inside one
receipt, and needs a real backend change today's draft editor doesn't support) — a flat's
Total Outstanding already sums both, so the resident still sees one net amount owed.

### 2026-08-26 — Uploaded-file links swallowed by the SW (again); raw Mongo IDs in report CSVs; Society.shortId

**Same bug class as the earlier APK-download fix, different path.** The PWA service worker's
`navigateFallbackDenylist` only excluded `/downloads/` — a click on an MCR expense proof, a
file in `/files`, or a receipt PDF link (all served from `/uploads/`, per
`fileAsset.service.ts`'s `url = /uploads/${filename}`) got intercepted and served `index.html`
instead, which the router bounced to `/`. Broadened the denylist to
`[/^\/downloads\//, /^\/uploads\//]`. Same caveat as before: anyone who loaded the site before
this deploy needs one hard refresh to pick up the corrected service worker.

**Report CSV export bug**: `ReportsPage.tsx`'s `flattenForCsv` only recognized populated refs
shaped `{flatNo}` or `{name}` — a populated `floorId` (`{floorNumber}`) fell through to
`JSON.stringify()`, dumping the raw `_id` alongside the floor number into the cell. Fixed with
an explicit `!== undefined` check per field (matters because `floorNumber` can legitimately be
`0` for Ground Floor — the old `||` chain would have treated that as "missing" too).

**New: `Society.shortId`** — every per-society report (Flat/Resident/Vehicle/Pet/Payment/
Receipt List) was exposing the raw internal `societyId` ObjectId as a column. Added a 4-char
alphanumeric short ID (ambiguous characters excluded, collision-checked at generation) and
populated it in place of the raw id in those reports. Wired into both places a Society gets
created — `society.service.ts` (admin-created) and `bridge.service.ts` (self-onboarding via
the billing platform) — plus a `backfillShortIds()` call added to the seed script for
pre-existing societies (backfilled 8 on this run, safe to re-run for any future gap).

### 2026-08-25 (cont'd 4) — First native APK rebuild this session (Guard Patrolling permissions live in the installed app)

Rebuilt and redistributed the signed release APK so the *installed* app (not just the mobile-browser
path) gets the Guard Patrolling camera/GPS/vibrate permissions added earlier. Pure Capacitor —
no Kotlin/Java authored, just `npx cap sync android` (copies the same web `dist/` into the
existing Capacitor-generated Android project) + a Gradle release build using the existing
signing config, so it installs as a normal update over the current app (same package
`in.iotsoft.community`, same signing cert).

**Working toolchain, for next time:** the system JDK on this machine is 17
(`C:\Program Files\Eclipse Adoptium\jdk-17...`), but Capacitor 7's Android template
(`android/app/capacitor.build.gradle`) requires Java 21 — building with JDK 17 fails with
`error: invalid source release: 21`. Fix: point `JAVA_HOME` at Android Studio's bundled JBR
(`C:\Program Files\Android Studio\jbr` — confirmed exactly JDK 21.0.8) for the Gradle
invocation:
```
cd frontend/android
JAVA_HOME="/c/Program Files/Android Studio/jbr" ./gradlew assembleRelease --no-daemon
```
`--no-daemon` avoided a second issue — a stale daemon left over from the first (failed, wrong-JDK)
attempt held a Windows file lock that made AAPT resource linking fail (`R.txt ... The data is
invalid. (13)`); `./gradlew --stop` clears stale daemons if this recurs.

Release keystore already exists and is correctly wired into `android/app/build.gradle`'s
`signingConfigs.release` — nothing to set up there, it just works. Verified the output with
`apksigner verify --print-certs` (exit 0, cert DN matches the existing "Jenix Community One /
IOT Soft" signing identity) and `aapt dump permissions` (confirmed CAMERA/
ACCESS_FINE_LOCATION/ACCESS_COARSE_LOCATION/VIBRATE all present) before uploading over
`/var/www/community/downloads/jenix-community.apk` on the VPS via `pscp_git.bat`.

### 2026-08-25 (cont'd 3) — Marketing site updated for Guard Patrolling; Video Intercom & Chat registered as Coming Soon

Guard Patrolling (shipped earlier this session) was missing from all marketing copy. Added as
a **Live** module to `LandingPage.tsx`'s module grid, a new workflow-section callout (cyan,
matching the SAMA callout's style — a 4th full workflow card would've broken the 3-column
grid, so a callout banner was the right fit instead), the `<Seo description>` prop, and the
JSON-LD `SOFTWARE_APPLICATION_SCHEMA` description; same for `HostelLandingPage.tsx`'s feature
grid (hostel guards patrol too). Bumped the "X modules live" footer count 15→16. Added SEO
keywords (`guard patrol software`, `GPS guard patrol verification`, etc.) to
`seoContent.ts`. Also fixed a stale `AboutPage.tsx` sentence still listing Visitor Management
and MCR as "future modules" despite both being live for a long time.

Also registered **Video Intercom & Chat** (video call from gate to a flat before entry, plus
in-app chat between residents) as a new `COMING_SOON` module — `MODULE_CODES.VIDEO_INTERCOM`
+ an inline stub in `modules.seed.ts` (same pattern as `BOOKING`/`ANNOUNCEMENT` — no actual
module built yet, just a registry placeholder) — and added it to both marketing pages'
feature grids as Coming Soon.

### 2026-08-25 (cont'd 2) — Guard Patrolling Module (Phase 1), shipped

New independent, toggleable module (`GUARD_PATROL`, same Module Registry pattern as MCR/SAMA
— `guardPatrol.manifest.ts` / `guardPatrol.access.service.ts` mirror `mcr.manifest.ts` /
`mcr.access.service.ts`). Admin defines checkpoints (QR sticker — printable via the existing
`qrcode`/`mcrReceiptPoster.service.ts` pattern; NFC data model in place via
`PatrolCheckpoint.method` but tag *scanning* deferred to Phase 2), builds ordered routes,
assigns guards. Guard's phone scans each checkpoint at `/patrol-kiosk` (mirrors `/guard-kiosk`'s
bespoke full-screen layout, linked from its header) with GPS **required** on every scan
(rejected client-side without a fix — basic anti-spoofing); if too long passes since the last
scan, the phone vibrates and plays an alert tone. Admin dashboard shows live in-progress
rounds and each guard's Hit/Late/Missed counts + Hit Rate; monthly CSV export follows the
MCR/SAMA hand-rolled pattern, not the unused generic report system.

**Turned out simpler than planned — no native plugins needed for Phase 1.** The plan assumed
`@capacitor-mlkit/barcode-scanning` + `@capacitor/geolocation` + `@capacitor/haptics` would be
required (implying an APK rebuild before any of this worked). Built it with plain Web APIs
instead: `jsQR` (small pure-JS package, `pnpm add jsqr`, camera frames decoded via
`getUserMedia` + canvas) for scanning, raw `navigator.geolocation`/`navigator.vibrate()` for
GPS/vibrate, and a Web Audio oscillator for the alert tone (`guardPatrol/alertSounds.ts` —
no bundled mp3 files, tones generated on the fly). Result: **the entire guard-facing flow is
a normal web deploy** — works immediately via mobile browser, no APK rebuild required to use
it. `AndroidManifest.xml` (camera/location/vibrate permissions) was updated locally so the
*installed* app would also support it once rebuilt — but `frontend/android/` is gitignored
(not committed) and no native build has been attempted yet. Android SDK + Java 17 + gradlew
were confirmed present on the dev machine if that becomes worth doing later.

Explicitly deferred (Phase 2/3, not built): NFC tag scanning (native plugin, phone
hardware-dependent), locked-screen/background alerting (needs a native foreground service —
foreground-only for now), GPS breadcrumb trail map, anti-spoofing hardening (mock-location
detection, rotating QR tokens).

### 2026-08-25 (cont'd) — Critical: Resident↔User login link was never populated in production; PIN login, password reset, Google linking

**The bug:** `visitor.action.service.ts`'s `resolveHostUserIds` (decides who gets notified of a new guard-raised visitor request) and `samaNotification.service.ts` both require `Resident.userId` to be set to find anyone to notify. Nothing in the real application ever set that field — only test fixtures did. Live DB check confirmed it: 66 residents flagged `loginAllowed:true`, only 2 had `userId` linked (both QA accounts, not real data). Practical effect: a guard raising a visitor request for any real occupied flat should have been hitting `ValidationError('No eligible resident login found for the selected flat')` and failing outright — visitor notifications weren't reaching *any* resident phone, not just failing to reach all of them.

**Root cause:** login accounts for residents were created via the generic Add User form (`MembersManagementPanel.tsx`), which only creates a `User` document — it never touches the `Resident` directory record at all, so the reverse link (`Resident.userId`) was permanently unset no matter how many logins got created that way.

**Fix:** moved resident login creation to a new **"Grant Login"** action directly on the Residents page — `POST /residents/:id/grant-login` (`resident.service.ts`) creates the `User` *and* sets `Resident.userId` + `loginAllowed:true` in one step, so the link can no longer go missing. Add User no longer offers OWNER/TENANT/FAMILY_MEMBER roles (staff roles only — SOCIETY_ADMIN, COMMITTEE_MEMBER, ACCOUNTANT, FACILITY_MANAGER, SECURITY_GUARD). `Resident.disable()` now also deactivates the linked `User`, so the existing confirm-dialog copy ("removes them and revokes their app login") is actually true. This one fix simultaneously repairs both Visitor host-notification and SAMA reminder delivery.

**Also this session** (same investigation, bundled in): residents log in with their mobile number (already worked — `POST /auth/login`'s `identifier` already accepted mobile or email) plus a short **admin-set 4-6 digit PIN** instead of a full password — mobile-number-as-password was the original ask, rejected as a real security hole since mobile numbers circulate too widely within a society to double as a secret. New `validateCredentialStrength()` (`backend/src/common/utils/password.ts`) enforces the PIN rule for OWNER/TENANT/FAMILY_MEMBER and — as a side effect — finally activates the previously-*dead* `validatePasswordStrength` (8+ chars, mixed case, digit) for every other role, which had zero server-side enforcement before this. New admin **"Reset Password"** action (both Users and Residents pages, feeding into the existing `ShareCredentialsModal`) and a working self-service change on `/profile` (which also fixed a pre-existing bug: `ProfilePage.tsx`'s "Save Name" was calling a `PATCH /users/:id` route that never existed — 404ing silently — now correctly calls `PATCH /users/me`). New **Google account linking** (`POST /auth/google/link` / `/unlink`, `User.linkedGoogleEmail`) lets a resident whose primary login is a synthetic identifier still sign in with Gmail going forward, without changing what they log in with day-to-day.

### 2026-08-25 — Guard Kiosk: flat picker was capped at 30, added voice search

`TowerFlatPicker.tsx` (the flat-selection grid guards tap through when raising a visitor request) hardcoded `FLATS_PAGE_SIZE = 30` with no pagination UI — guards at any block with more than 30 flats (i.e. most real blocks — LIG BLOCK alone runs ~128) could only ever see and search the first 30, sorted by flat number. The backend endpoint (`visitor.directory.service.ts`) already supported up to 500 per page (`parsePagination`'s cap) — the frontend just never asked for more. Bumped to 500.

Also added voice search for that same flat picker: guards often have limited literacy, and the kiosk already had a full hold-to-speak voice input system built for the guest-name/purpose/mobile steps (`VoiceHoldButton.tsx`, Web Speech API, `hi-IN`/`en-IN`). Added a `compact` variant of that same component (small inline mic icon instead of the big 128px hold button) next to the flat search box, so a guard can speak a flat number instead of typing it — replacing the search text on transcript rather than appending, since search doesn't build up a sentence.

### 2026-08-23 (cont'd 2) — "My Home": admin accounts that are also residents

**Fixed the APK download** (marketing page and both new Share modals were silently broken): the app's PWA service worker (`vite-plugin-pwa`, generateSW mode) had no `navigateFallbackDenylist`, so it intercepted a plain link click to `/downloads/jenix-community.apk` as an SPA navigation and served `index.html` instead of the file — invisible to a `curl` check (which bypasses the service worker entirely) but broken for every real browser. Fixed with `navigateFallbackDenylist: [/^\/downloads\//]` in `frontend/vite.config.ts`, plus a `download` attribute on the marketing CTA. Anyone who visited before this fix needs one hard refresh to pick up the corrected service worker.

**New: "My Home" for admin accounts that are also residents.** Real problem raised: at least one Society Admin is nearly always also personally a resident, but `email` is a *globally unique* index on `User` (`backend/src/modules/user/user.model.ts:34`) — one person literally cannot hold two separate login accounts (Admin + Owner) under the same email, and two logins under different emails is worse UX anyway. Rejected a login-time "As Resident / As Management" picker in favor of one identity, one login:
- New `PATCH /users/:id/link-flat` (`USER_UPDATE` permission, same-society validated) ties an existing admin-rank account (SOCIETY_ADMIN/COMMITTEE_MEMBER/ACCOUNTANT/FACILITY_MANAGER) to their own flat — exposed as a "Link Flat" action per eligible row on the Users page (`MembersManagementPanel.tsx`), reusing the pattern of populating `flatId` with `flatNo`+`towerId.name` for display.
- Granted `mcr.view_self`, `mcr.submit_payment`, `visitor.request.respond_own_flat` to those four admin-rank roles in `permissions.seed.ts` — these only actually surface anything once that specific account's `flatId` is set (a harmless empty state otherwise), since `McrMyMaintenanceTab.tsx` and the visitor own-flat views already key off `user.flatId` directly, not `roleCode` — confirmed this by reading the existing resident-facing components before building, which meant no changes were needed there at all.
- A "My Home" pill appears in the top bar (`TopBar.tsx`) whenever `user.flatId` is set on one of those four roles, linking to a new `/my-home` route that reuses `ResidentDashboard` verbatim (zero modification — it was already driven by `user`/`hasPermission`, never gated on `roleCode`).
- **Caveat:** `flatId` is baked into the JWT at login (`common/utils/jwt.ts`), so an admin whose account is freshly linked needs to log out and back in before "My Home" appears — same class of staleness as the earlier permissions-refresh issue.
- Deliberately scoped to "admin who is also a resident of *this* society" — does not address one person administering multiple societies, which would need real multi-account/session switching.

### 2026-08-23 (cont'd) — APK distribution: Share App on Dashboard + Share Credentials on user creation

Until the app is on the Play Store, admins hand out the APK directly. Two additions, both using a new shared `getApkUrl()` helper (`frontend/src/utils/apkShare.ts`) pointing at the already-hosted `/downloads/jenix-community.apk`:
- **"Share App" on the Society Admin Dashboard** (`ShareAppModal.tsx`) — copyable direct link, a scannable QR (client-side via the `qrcode` npm package, newly added to the frontend), and a WhatsApp share button with install steps pre-filled. For handing the link to anyone generically.
- **"Share Login Credentials" right after creating a user** (`ShareCredentialsModal.tsx`, wired into `MembersManagementPanel.tsx`'s Add User flow) — since the admin types the password themselves at creation (no auto-generation in this flow), the moment right after `POST /users` succeeds is the only time both the identifier and password are known together. The modal shows them, and a WhatsApp share pre-fills the new user's own mobile number as the recipient (parsed to `91XXXXXXXXXX`) with a message containing mobile+password+APK link+install steps — one tap from admin to the new guard/resident/staff member's WhatsApp.

Deliberately did **not** touch the Resident creation flow — residents-as-login-users (OWNER/TENANT roles) are created through this same Users/MembersManagementPanel, not a separate resident-specific form, so one integration point covers both.

### 2026-08-23 — MCR Fund Balance (opening dues + expenses), draft-demand editing, guard roster & gate assignment UI

**New: MCR Fund Balance feature** — built for onboarding existing societies with real accounting history (e.g. "society running 5 years, admin just joined the platform this month, has ₹50,000 in hand and pending dues on old flats — how do we get an accurate starting point without re-entering years of history?"):
- **Opening Balance** (`mcrOpeningBalance.model/service/controller.ts`) — one-time per-society entry of starting Cash + Bank balance as of a chosen date, plus an optional bulk wizard (`OpeningBalanceWizard.tsx`) to enter each flat's pre-platform pending dues in one screen. Each flat's opening due becomes a real, immediately-published `MaintenanceDemand` with `demandType: 'OPENING_BALANCE'` (backed by an auto-created hidden `ChargeHead`/`BillingPlan`), so it flows through the exact same payment/receipt/outstanding pipeline as any other demand — no parallel ledger. Idempotent: re-running the bulk wizard skips flats that already have one.
- **Expenses** (`expense.model/service/controller.ts`, new MCR tab `McrExpensesTab.tsx`) — record/cancel expenses with category, amount, payment mode (Cash/Bank), payee, date, and optional proof file upload. Category dropdown supports **"+ Create Category"** inline (`mcrExpenseCategory.model/service.ts`) so admins aren't boxed into a fixed built-in list.
- **Fund Balance card** (MCR Dashboard) and **Income & Expenditure Statement** (MCR Reports, date-range picker) — both computed **live** from source records every time (opening balance + verified payments by method − expenses by mode), never a stored running total that could drift out of sync — same principle already learned the hard way from the `Tower.totalFlats` staleness bug in the 08-22 entry below.
- New permissions `mcr.manage_expense`, `mcr.manage_opening_balance` (granted to SOCIETY_ADMIN; `mcr.manage_expense` also to ACCOUNTANT).

**Draft demand editing** — the `MCR_EDIT_DRAFT_DEMAND` permission existed but had no UI wired to it. `McrDemandsTab.tsx` now shows an Edit button on DRAFT-status rows (per-charge-line amount + due-date edit, `PATCH /mcr/demands/:demandId`, `demandDraft.service.ts` `updateDraft`) — lets an admin correct or backdate a draft before publishing instead of only being able to delete/regenerate it.

**Dropdown truncation bug (11 files)** — flat/resident/payment dropdowns were hardcoded to `?limit=200`, even though the backend cap had already been raised to 500 earlier. Large blocks (e.g. a 128-flat tower placed after another in list order) silently vanished past item #200 in every "Select Flat" style dropdown. Bumped to `limit=500` across `AccessControlPage`, `LeaseFormModal`, `McrPaymentsTab`, `McrReportsTab`, `ParentLinksAdminPage`, `PaymentPage`, `PetPage`, `ReceiptPage`, `ResidentPage`, `SamaStaffTab`, `VehiclePage`. Add Resident's flat picker also now pre-scopes to the currently-selected block/tower segment instead of showing the whole society's flats.

**New: Guard Roster & Gate Assignment UI** (Visitor Monitoring) — the backend for gate↔block mapping and guard↔gate assignment (`Gate.towerIds`, `GuardAssignment.gateIds`, and visitor-list scoping by a guard's assigned gates) already existed and worked, but had **no admin UI anywhere** — a new `SECURITY_GUARD` user had no way to be assigned a gate except calling the API directly. New `frontend/src/modules/visitor/GuardsAndGatesPanel.tsx`, rendered in `AdminVisitorView.tsx` below the existing grid (gated on `gate.read`): a Gates list+CRUD (name, code, entry type, multi-select of covered blocks — one gate can serve one or several blocks) and a Guard Roster (one card per `SECURITY_GUARD` user showing assigned gates/blocks, an amber "not assigned — won't see any visitors" state if none, and an Assign/Edit modal for gates + optional shift times/validity dates). No backend changes needed.

**Other:** WhatsApp linked-number display (from 08-22) confirmed working for Dheeraj Jain's society. Report catalog/`SOCIETY_LIST` scoping fix (08-22) re-verified.

**Deploy note:** this day's frontend build succeeded on the first try without needing the temporary-swapfile workaround (see "Builds OOM-killing?" below) — box memory pressure varies day to day depending on the other ~18 tenants, always try a plain build first.

---

### 2026-08-22 — MCR billing-accuracy fixes, configurable vacant/unsold flat policy, block-wise dashboards

**MCR bug fixes (all found via live production reports, all deployed same-day):**
- **Dashboard summary went stale after any payment/demand action** — `McrPaymentsTab`/`McrDemandsTab` only invalidated their own list's query cache, never `mcr-summary`/`mcr-statement`, so Outstanding/Overdue kept showing pre-change totals until the 5-minute query `staleTime` expired.
- **Payments couldn't be recorded after the first one per society** — the `idempotencyKey` unique index used `sparse: true`, but sparse only excludes a document from a *compound* index when **all** of its fields are missing. Since `societyId` is always present, every payment missing `idempotencyKey` (i.e. every manually-recorded one) got indexed as `{societyId, idempotencyKey: null}` — so only the *first* such payment per society could ever insert; every later one failed as a false "duplicate submission" 409. Fixed with a `partialFilterExpression: {idempotencyKey: {$exists: true}}` index instead of `sparse`. Root-caused via a live mongo-shell reproduction, not just log-reading — the generic duplicate-key error message gave no field detail, so `errorHandler.ts` and `mcrPayment.service.ts` now log `keyPattern`/`keyValue` on any `code === 11000`.
- **Payments couldn't be applied against OVERDUE demands** — allocation logic only accepted `PUBLISHED`/`PARTIALLY_PAID` demands as payable. OVERDUE is not a resolved state (it's just published-and-past-due, and `applyAllocations` itself routinely leaves a demand in that status after a partial payment) — excluding it meant once *any* bill went overdue, no payment against that flat could ever reduce Outstanding again; the money silently became stranded "advance" instead. Fixed in `mcrPaymentVerification.service.ts` (`PAYABLE_DEMAND_STATUSES` now includes `OVERDUE`). Two already-stranded payments for one live society were manually reconciled (proper `McrPaymentAllocation` records + demand `paidPaise`/`outstandingPaise` update, matching what the fixed code does) after a read-only audit confirmed no other society was affected.
- **Receipts tab showed the raw flat ObjectId** instead of flat number — `mcrReceiptQuery.service.ts` never populated `flatId`.
- **Society List report leaked every society to non-super admins** — `runReport('SOCIETY_LIST', ...)` ignored the `societyId` scope entirely and always returned every active society platform-wide. Report catalog now hides platform-wide reports from non-super roles; the report itself also scopes to the caller's own society as defense in depth.

**New: configurable Vacant/Builder-Unsold flat billing policy** (MCR → Settings):
- New `BUILDER_UNSOLD` occupancy status, distinct from `VACANT` (builder inventory not yet handed over vs. an owner's flat nobody currently lives in — most society bylaws still hold the owner liable for the latter).
- Per-society policy setting, independently for Vacant and Builder-Unsold: **Bill Full / Bill at Reduced % / Exempt**. Exempt never skips generation outright — a demand is still created every cycle (`billingHold: true` on `MaintenanceDemand`) so there's a clean accrual trail, just withheld from auto-publish until an admin manually publishes it or the flat's occupancy changes.
- When a resident is added to a previously Vacant/Builder-Unsold flat, any held demand for it is now auto-published (`demandPublishService.releaseHeldDemandsForFlat`, wired into `resident.service.ts` create/update).
- A society's very first "Generate Drafts" click is gated on an explicit one-time policy confirmation modal (`vacantFlatPolicyConfirmed` on `McrSettings`) instead of silently running on unreviewed defaults.
- A policy change only affects demands generated *after* the change — existing demands (published or held) keep their original amount forever, matching how billing-plan edits already work elsewhere in this system.

**Tower/block-wise MCR planning:** extracted the segmented tower/block tab bar (3 tabs + overflow menu, first built for Residents) into a shared `frontend/src/components/common/TowerTabBar.tsx`, applied to MCR Demands/Payments/Receipts (filter by block, Block column, search/sort) and a new block-wise billing breakdown on the MCR Dashboard (`GET /mcr/reports/summary-by-tower`).

**Other fixes:** `Tower.numberOfFloors`/`totalFlats` were write-once-at-creation denormalized counters nothing ever resynced — deleting a floor or generating flats left stale badges (e.g. "10F" after deleting down to 8, "0 flats generated" with 128 real flats). Now resynced on every floor/flat create or delete; existing data backfilled society-wide. WhatsApp linked number + a recharge-reminder note now shown on both `/settings` and `/dashboard`, not just Settings.

**Deploy note:** the VPS is memory-constrained enough that `tsc` builds now routinely OOM-kill (swap sits near-full from other tenants on the shared box) — several deploys this day needed a temporary 1GB swapfile (`fallocate -l 1G /swapfile2 && mkswap /swapfile2 && swapon /swapfile2`, removed with `swapoff`/`rm` after the build) to get a clean `pnpm run build`. See Section 11.

### 2026-08-21 — Cross-tenant security sweep, structure CRUD, multi-tower flat-numbering fix

**Security (found via a real cross-tenant leak report — one society admin could see another society's data):**
- `requireSocietyAccess` middleware existed but was applied on almost no routes — systematically added across all 31 route files (residents, flats, floors, towers, vehicles, pets, users, audit, files, module registry, payments, receipts, reports, devices, gates, guard assignments).
- New `requireResourceSocietyAccess(model, paramName)` middleware for single-resource `:id` routes, which have no `societyId` in the URL/body to check against — looks up just that document's `societyId` and blocks a mismatched caller, added to every `GET/PATCH/DELETE /:id` route across the same modules.
- Root cause of the original leak: `Zustand`'s `authStore` didn't clear `societyStore` on login/logout, so a stale `currentSociety` from a previous session leaked into the new one's requests. Fixed both client-side (`clearSociety()` wired into `setAuth`/`logout`) and server-side (the middleware sweep above), since either alone left a gap.

**Multi-tower flat-numbering collision (data-modeling bug):** the unique index on `Flat` was `{societyId, flatNo}` — but flat numbers like "G01"/"101" are generated from floor prefix alone, so two towers with identical floor structures legitimately produce identical flat numbers. The second tower's flats silently failed to generate (the generator's own "already exists" check matched the *first* tower's flats). Fixed by rescoping the unique index to `{towerId, flatNo}` and the generator's existence check to match — required a live index migration on the VPS, plus disambiguating 7 frontend flat-picker dropdowns (`"Tower A - 101"`) since flat number is no longer globally unique per society.

**Structure & resident management:** Edit/Delete for Residents/Towers/Floors/Flats with cascade guards (can't delete a tower with active floors, a floor with active flats, a flat with residents/vehicles/pets/active leases/unpaid demands). Soft-deleted tower/floor/flat codes are now immediately reusable (`partialFilterExpression: {isActive: true}` on the relevant unique indexes) instead of permanently reserved. Ground/basement-aware floor-number generation (Ground Floor = 0, basements negative, never silently swallowed by a plain "N floors" answer). Auto-maintained flat `occupancyStatus` — adding/removing a resident now flips Vacant ⇄ Owner/Tenant-Occupied automatically instead of relying on a manually-maintained field (which was both hiding true occupancy on the Flats page and, once demand generation started skipping Vacant flats, silently under-billing occupied units with stale data).

**Residents page:** sortable columns (default: real building order — tower, then floor, then flat — not alphabetical, which had been pushing Ground Floor off page 1), search by flat number and member type, and a Tower→Floor→Flat cascading picker in Add/Edit Resident (a flat flat-number dropdown was unusable once a society had 100+ units).

**MCR billing-accuracy chain** (surfaced by a real "why doesn't my Total Billed match" report): stale/cancelled demands kept inflating Total Billed forever (report aggregation only excluded `DRAFT`, not `CANCELLED`); an unpaid demand for a since-deleted flat had no way to be resolved (flat `delete()` now blocks if unpaid demands exist; added a `cancel` action for demands generated against flats deleted before this guard existed); the pagination cap (`Math.min(100, ...)`) was silently truncating dropdowns and demand lists for large societies (raised to 500); billing-plan charge lines now auto-fill their amount from the linked charge head instead of requiring manual re-entry; record-payment now auto-fills payer name/mobile from the flat's primary resident.

---

### 2026-08-10 — SEO foundation (sitemap, meta tags, structured data) + full deploy

- Added `frontend/public/sitemap.xml` and `frontend/public/robots.txt` — sitemap lists the 5 public marketing routes only (`/`, `/about`, `/onboard`, `/privacy`, `/terms`); robots.txt explicitly disallows all authenticated app routes.
- Added a runtime `Seo` component (`frontend/src/components/seo/Seo.tsx`, zero dependencies). Since this is a client-rendered Vite SPA sharing one static `index.html`, per-route `<title>`, meta description/keywords, canonical URL, Open Graph, Twitter Card, and JSON-LD are now set on mount per page instead of being identical across every route.
- Wired `Seo` into all 5 public marketing pages with page-specific copy and keyword sets — see `frontend/src/components/seo/seoContent.ts` (keywords grouped by resident/committee audience, gate-hardware sellers/installers, and category-level — non-trademark — competitive terms). Landing and About page copy also picked up small natural mentions of boom barriers / gate hardware installers.
- Added `Organization` + `SoftwareApplication` JSON-LD structured data on the homepage.
- Fixed `frontend/index.html`'s static fallback `<title>` (was "Jenix Society One" — didn't match actual product branding) and added default OG/Twitter/`geo.region` meta as the pre-hydration fallback.
- Deployed to VPS: pulled latest `master` (this SEO work, 2 commits, plus 5 previously-unpushed-to-VPS commits — voice-first Guard Kiosk, per-society automated MCR reminder scheduling, WhatsApp payment reminders, manual UPI payment submission, tenant-isolation/nav fixes), rebuilt backend + frontend (`pnpm install --ignore-workspace && pnpm build` in both), restarted `community-api` via PM2, copied `frontend/dist/*` to `/var/www/community/`. Verified: backend health check green, MongoDB connected, `mcrReminderWorker` running with `sentCount: 0` (automation is opt-in per society, default off — no surprise WhatsApp sends from the deploy).
- Submitted `sitemap.xml` in Google Search Console — status: **Success**. Requested manual indexing (URL Inspection → Request Indexing) for all 5 public URLs.

---

## 1. What This Product Does

A SaaS platform that lets housing societies (apartments, gated communities) manage residents, flats, vehicles, pets, payments, visitors, staff, and IoT devices — all under one login.

Each society is a completely isolated tenant. All data is scoped by `societyId`. One VPS instance serves all societies simultaneously.

Societies self-register at `/onboard`, get 6 months free trial, then enter a billing cycle managed by a separate **Billing Platform** (`/var/www/billing-platform` on same VPS).

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, TailwindCSS, TanStack Query v5, React Router v6, Zustand |
| Backend | Node.js, Express, TypeScript, Mongoose 8 |
| Database | MongoDB 4.4 (local on VPS, auth enabled) |
| Process Manager | PM2 (process: `community-api`, id: 18 — PM2 ids on this shared box can shift on process restarts; re-check with `pm2 list` if a command targeting the numeric id fails) |
| Web Server | Nginx (reverse proxy + static frontend) |
| Package Manager | **pnpm** — always use pnpm, never npm or yarn |

---

## 3. Repository Structure

```
community-one/
├── backend/
│   ├── src/
│   │   ├── app.ts                  # Express app, all route mounts
│   │   ├── server.ts               # HTTP server + MongoDB connect
│   │   ├── config/
│   │   │   ├── constants.ts        # ROLES, PERMISSIONS, MODULE_CODES, ROLE_RANK
│   │   │   ├── env.ts              # Zod-validated env schema
│   │   │   └── database.ts         # Mongoose connect
│   │   ├── common/
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts         # authenticate, requirePermission, requireRole, requireSocietyAccess
│   │   │   │   ├── errorHandler.ts
│   │   │   │   └── rateLimiter.ts
│   │   │   ├── errors/AppError.ts  # AppError, AuthenticationError, AuthorizationError, ConflictError, etc.
│   │   │   └── utils/
│   │   │       ├── response.ts     # sendSuccess, sendCreated, sendError
│   │   │       ├── jwt.ts          # signAccessToken, signRefreshToken, verifyAccessToken
│   │   │       └── password.ts     # hashPassword, comparePassword (bcrypt)
│   │   ├── modules/                # One folder per domain (see Section 5)
│   │   └── seeds/
│   │       ├── index.ts            # Run once: seeds roles, modules, reports, super admin
│   │       ├── permissions.seed.ts # ROLE_PERMISSIONS map
│   │       ├── modules.seed.ts     # Module registry (CORE, PARKING, VISITOR, etc.)
│   │       └── reports.seed.ts
│   ├── .env                        # NOT in git — see Section 8
│   └── package.json
└── frontend/
    ├── src/
    │   ├── App.tsx                 # Route declarations (marketing + protected)
    │   ├── store/authStore.ts      # Zustand auth state (user, tokens, societyId)
    │   ├── services/api.ts         # Axios instance + token interceptor + extractData()
    │   ├── types/index.ts          # Shared TypeScript interfaces
    │   ├── components/
    │   │   ├── layout/             # AppLayout, Sidebar, TopBar, MobileNav
    │   │   └── common/             # Modal, PageHeader, StatCard, EmptyState, etc.
    │   └── modules/                # One folder per page/feature
    │       ├── auth/LoginPage.tsx
    │       ├── marketing/          # LandingPage, OnboardPage, AboutPage, PrivacyPage, TermsPage, MarketingLayout
    │       ├── dashboard/          # SuperAdminDashboard, SocietyAdminDashboard, ResidentDashboard
    │       ├── society/            # SocietyListPage, SocietyFormPage
    │       ├── tower/ floor/ flat/ # Structure management
    │       ├── resident/           # ResidentPage with KYC tracking
    │       ├── users/              # UsersPage with role-rank creation
    │       ├── vehicle/ pet/       # Asset tracking
    │       ├── roles/              # RolesPage
    │       ├── audit/              # AuditPage
    │       ├── payment/ receipt/   # Finance
    │       └── ... (notification, reports, files, device, health, profile, settings)
    └── package.json
```

---

## 4. Multi-Tenancy — The Core Rule

**Every MongoDB document that belongs to a society MUST have a `societyId` field.**

Every query MUST filter by `societyId`. Never return data across societies.

```typescript
// CORRECT
const flats = await Flat.find({ societyId: req.user!.societyId });

// WRONG — leaks all society data
const flats = await Flat.find({});
```

The `societyId` comes from `req.user.societyId` (set in JWT during login).  
Super admin (`JENIX_SUPER_ADMIN`) and Jenix Support (`JENIX_SUPPORT`) can access all societies.

---

## 5. Backend Module Pattern

Every domain follows the same 4-file pattern. Example: `resident`

```
modules/resident/
├── resident.model.ts       # Mongoose schema + IResidentDocument interface
├── resident.types.ts       # DTOs (CreateResidentDto, UpdateResidentDto, etc.)
├── resident.service.ts     # Business logic — only place that touches the DB
├── resident.controller.ts  # HTTP handlers — calls service, calls auditService
└── resident.routes.ts      # Express router — middleware + controller bindings
```

### Adding a new module (e.g. `complaint`)

1. Create `backend/src/modules/complaint/` with the 4 files above.
2. Import and mount the router in `backend/src/app.ts`:
   ```typescript
   import complaintRoutes from './modules/complaint/complaint.routes';
   app.use('/api/complaints', complaintRoutes);
   ```
3. Add relevant permissions to `backend/src/config/constants.ts` → `PERMISSIONS`.
4. Update `backend/src/seeds/permissions.seed.ts` → `ROLE_PERMISSIONS` for each role that needs access.
5. Add the module code to `MODULE_CODES` in `constants.ts` if it is a licensable module.
6. Run seed on VPS (only needed for new permissions/roles — existing data is safe):
   ```bash
   cd /root/projects/community/backend && node dist/seeds/index.js
   ```

### Controller pattern

```typescript
export class ComplaintController {
  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await complaintService.create(req.body, req.user!.societyId!, req.user!.userId);
      await auditService.log({ actorUserId: req.user!.userId, action: 'CREATE', entityType: 'Complaint', ... });
      sendCreated(res, result, 'Complaint raised');
    } catch (error) { next(error); }
  }
}
```

### Route pattern

```typescript
router.post('/', authenticate, requirePermission(PERMISSIONS.COMPLAINT_CREATE), controller.create.bind(controller));
router.get('/', authenticate, requirePermission(PERMISSIONS.COMPLAINT_READ), controller.findAll.bind(controller));
```

---

## 6. Role System

### Role Hierarchy (lower rank number = higher authority)

| Role | Rank | Description |
|------|------|-------------|
| JENIX_SUPER_ADMIN | 1 | IOT Soft internal — full access all societies |
| JENIX_SUPPORT | 2 | IOT Soft support — read-only all societies |
| SOCIETY_ADMIN | 10 | Society committee head — full society access |
| COMMITTEE_MEMBER | 20 | Committee read + reports |
| ACCOUNTANT | 21 | Finance only |
| FACILITY_MANAGER | 22 | Devices + maintenance |
| SECURITY_GUARD | 30 | Gate — resident/vehicle read |
| OWNER | 40 | Flat owner — own data |
| TENANT | 41 | Tenant — own data |
| FAMILY_MEMBER | 50 | Family of owner/tenant |
| VENDOR | 51 | External vendor |
| STAFF | 52 | Society staff (maid, etc.) |

**Rule:** A user can only create users with a rank strictly higher (numerically larger) than their own rank. Enforced in `user.controller.ts` using `ROLE_RANK` from `constants.ts`.

### Permission check in routes

```typescript
requirePermission(PERMISSIONS.RESIDENT_CREATE)   // checks JWT payload .permissions[]
requireRole('SOCIETY_ADMIN', 'JENIX_SUPER_ADMIN') // role-based check
requireSocietyAccess                               // ensures user belongs to the requested society
```

---

## 7. Authentication Flow

1. `POST /api/auth/login` → returns `{ accessToken, refreshToken, user }`
2. `accessToken` expires in 7 days, `refreshToken` in 30 days.
3. Frontend stores both in Zustand (`authStore`). Axios interceptor attaches `Authorization: Bearer <token>` to every request.
4. On 401 → interceptor auto-calls `POST /api/auth/refresh` → gets new `accessToken` → retries original request.
5. JWT payload contains: `userId, email, mobile, roleCode, permissions[], societyId, flatId`

### Society Self-Onboarding

`POST /api/auth/onboard-society` (public, rate-limited):
- Creates Society + SOCIETY_ADMIN user atomically.
- Generates readable password (e.g. `BlueTiger@4821`).
- Fires non-blocking webhook to Billing Platform at `BILLING_SERVER_URL/webhooks/community-onboard`.
- Returns `{ societyName, societyCode, email, password, trialEndsAt }`.

---

## 8. Environment Variables (backend `.env`)

```env
NODE_ENV=production
PORT=5100
MONGODB_URI=mongodb://community_app:<password>@127.0.0.1:27017/jenix-community-one?authSource=admin
JWT_SECRET=<secret>
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=<secret>
JWT_REFRESH_EXPIRES_IN=30d
APP_NAME=Jenix Society One
APP_VERSION=1.0.0
FRONTEND_URL=https://community.iotsoft.in
UPLOAD_DIR=uploads
MAX_FILE_SIZE=10485760
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
SUPER_ADMIN_EMAIL=admin@iotsoft.in
SUPER_ADMIN_MOBILE=9999999999
SUPER_ADMIN_PASSWORD=<see internal credentials doc>
BILLING_SERVER_URL=<billing platform URL>
BILLING_WEBHOOK_SECRET=<secret>
```

> `.env` is gitignored. Never commit it. On VPS it lives at `/root/projects/community/backend/.env`.

---

## 9. Data Models — Key Relationships

```
Society
  └── Tower (societyId)
       └── Floor (societyId, towerId)
            └── Flat (societyId, towerId, floorId)
                 └── Resident (societyId, flatId)  → memberType: OWNER|TENANT|FAMILY_MEMBER|STAFF|VENDOR
                      ├── Vehicle (societyId, flatId, residentId)
                      └── Pet (societyId, flatId, residentId)

User (societyId, roleCode, permissions[])
AuditLog (societyId, actorUserId, action, entityType, entityId)
Notification (societyId)
Payment (societyId, flatId)
Receipt (societyId, paymentId)
FileAsset (societyId)
Device (societyId) — IoT hardware
ModuleRegistry — global (no societyId) — lists all available modules
```

### KYC on Residents

No digital documents are stored. KYC is tracked as a physical file location reference:
- `kycStatus`: PENDING | SUBMITTED | VERIFIED | REJECTED
- `kycPhysicalLocation`: e.g. "Almira 1, File 3, Admin Office"
- `kycVerifiedBy`: userId of staff who marked it done
- `kycVerifiedAt`: timestamp
- `kycNotes`: optional notes

Mark via: `PATCH /api/residents/:id/kyc`

---

## 10. Frontend Conventions

### API calls

```typescript
import { api, extractData } from '../../services/api';

// With extractData (unwraps { success, data } envelope):
const residents = await extractData<Resident[]>(api.get('/residents'));

// Without extractData (for manual control, e.g. onboard):
const res = await api.post('/auth/onboard-society', payload);
const data = res.data.data; // { societyName, societyCode, email, password, trialEndsAt }
```

### TanStack Query pattern

```typescript
const { data, isLoading } = useQuery({
  queryKey: ['residents', societyId],       // always include societyId to avoid cache bleed
  queryFn: () => extractData<Resident[]>(api.get('/residents')),
});

const mutation = useMutation({
  mutationFn: (dto) => extractData(api.post('/residents', dto)),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['residents', societyId] }),
});
```

### Route layout structure

```tsx
<Routes>
  {/* Public marketing — MarketingLayout (navbar + footer) */}
  <Route element={<MarketingLayout />}>
    <Route path="/" element={<SmartHome />} />   // redirects auth users to /dashboard
    <Route path="/about" element={<AboutPage />} />
    <Route path="/privacy" element={<PrivacyPage />} />
    <Route path="/terms" element={<TermsPage />} />
    <Route path="/onboard" element={<OnboardPage />} />
  </Route>

  {/* Auth */}
  <Route path="/login" element={<LoginPage />} />

  {/* Protected app — AppLayout (sidebar + topbar) */}
  <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
    <Route path="/dashboard" element={<DashboardRoute />} />
    {/* ... all app pages with absolute paths */}
  </Route>
</Routes>
```

### Adding a new page

1. Create `frontend/src/modules/<feature>/<Feature>Page.tsx`.
2. Import it in `App.tsx` and add `<Route path="/<feature>" element={<FeaturePage />} />` inside the protected block.
3. Add a nav item in `frontend/src/components/layout/Sidebar.tsx`:
   ```typescript
   { to: '/feature', icon: SomeLucideIcon, label: 'Feature Name', roles: ['SOCIETY_ADMIN', ...] }
   ```
4. The `roles` array controls which roles see the nav item. Wrap with `<RequireSociety>` if the page needs an active society context.

---

## 11. VPS Deployment

### SSH Access

Always use `D:\plink_git.bat` (Windows). This bat file embeds PuTTY credentials for `root@154.61.69.200`.

```powershell
& "D:\plink_git.bat" "root@154.61.69.200" "your command here"
```

### Full Deploy Steps (after pushing to GitHub)

```bash
# 1. Pull code
cd /root/projects/community && git pull origin master

# 2. Build backend
cd backend && pnpm install --ignore-workspace && pnpm build

# 3. Build frontend
cd ../frontend && pnpm install --ignore-workspace && pnpm build

# 4. Copy frontend to Nginx web root
cp -r dist/* /var/www/community/

# 5. Restart backend
pm2 restart community-api

# 6. Check it's running
pm2 logs community-api --lines 20 --nostream
```

### VPS Paths

| What | Path |
|------|------|
| Project code | `/root/projects/community/` |
| Frontend static files | `/var/www/community/` |
| Backend dist | `/root/projects/community/backend/dist/` |
| PM2 process name | `community-api` (id: 18 — PM2 ids on this shared box can shift on process restarts; re-check with `pm2 list` if a command targeting the numeric id fails) |
| PM2 error log | `/root/.pm2/logs/community-api-error.log` |
| PM2 out log | `/root/.pm2/logs/community-api-out.log` |
| Backend `.env` | `/root/projects/community/backend/.env` |
| Nginx config | `/etc/nginx/sites-available/community.iotsoft.in` |

### If you change .env on VPS

```bash
pm2 restart community-api --update-env
```

### Builds OOM-killing? (as of 2026-08-22)

The VPS is a shared box running ~18 other PM2 processes for unrelated projects — total RAM is 1.9GB and swap frequently sits near-full from that other traffic, not from this project. `NODE_OPTIONS='--max-old-space-size=768' pnpm run build` (backend or frontend `tsc`) can OOM-kill (exit 137) or hit a JS heap limit (exit 134) under that pressure, sometimes needing 2-3 retries to land in a moment of headroom. If it keeps failing, add temporary swap for the build and remove it after:

```bash
fallocate -l 1G /swapfile2 && chmod 600 /swapfile2 && mkswap /swapfile2 && swapon /swapfile2
# ... run the build ...
swapoff /swapfile2 && rm -f /swapfile2
```

Don't leave `/swapfile2` mounted permanently — it's a build-time crutch, not a fix for the underlying box being memory-tight. Check `free -h` before a build if you've seen recent OOM kills.

---

## 12. Database Access

| | |
|--|--|
| Host | `127.0.0.1:27017` (localhost only, not exposed externally) |
| Admin user | `mongoAdmin` (authDB: admin) — password: *ask project owner, or see VPS `.env`* |
| App user | `community_app` (authDB: admin, DB: jenix-community-one) — password: *ask project owner, or see VPS `.env`* |

```bash
# Connect from VPS shell (fill in the actual password — never commit it)
mongosh "mongodb://community_app:<url-encoded-password>@127.0.0.1:27017/jenix-community-one?authSource=admin"
```

**URL encoding rules for special chars in MongoDB URIs:** `@` → `%40`, `#` → `%23`

### Seed script (run once per new environment)

```bash
cd /root/projects/community/backend
node dist/seeds/index.js
```

Seeds: all roles, all module registry entries, all report definitions, super admin user.  
Safe to re-run — uses upserts. Only creates super admin if it doesn't already exist.

---

## 13. Module Registry (Available Modules)

| Code | Name | Status |
|------|------|--------|
| CORE | Core Platform | Live |
| PARKING | Parking & Boom Barrier | Coming Soon |
| VISITOR | Visitor Management | Coming Soon |
| MAINTENANCE | Maintenance Collection | Coming Soon |
| BOOKING | Facility Booking | Coming Soon |
| ACCESS_CONTROL | Member Access Control | Coming Soon |
| ANNOUNCEMENT | Announcements & Events | Coming Soon |
| FUND_AUDIT | Fund & Audit | Coming Soon |
| COMPLAINT | Complaint Management | Coming Soon |
| STAFF | Staff Management | Coming Soon |
| DELIVERY | Delivery Management | Coming Soon |
| EMERGENCY | Emergency & SOS | Coming Soon |
| POLLING | Polling & Voting | Coming Soon |
| DOCUMENT | Document Management | Coming Soon |
| ASSET_AMC | Asset & AMC | Coming Soon |
| IOT_HEALTH | IoT Device Health | Coming Soon |

To activate a module for a society, add its code to `society.enabledModules[]`. The `ModuleRegistryPage` in the frontend manages this.

---

## 14. Super Admin Login

| | |
|--|--|
| URL | https://community.iotsoft.in/login |
| Email | `admin@iotsoft.in` |
| Password | *(stored in VPS .env as SUPER_ADMIN_PASSWORD — ask project owner)* |
| Role | JENIX_SUPER_ADMIN — sees all societies |

---

## 15. Common Error Classes

```typescript
throw new ValidationError('Field X is required');      // 400
throw new AuthenticationError('Invalid token');         // 401
throw new AuthorizationError('Insufficient role');      // 403
throw new NotFoundError('Resident not found');          // 404
throw new ConflictError('Society already registered'); // 409
throw new AppError('Something failed', 500);            // 500
```

All errors are caught by `errorHandler` middleware and returned as:
```json
{ "success": false, "error": { "message": "...", "code": "...", "statusCode": 400 } }
```

---

## 16. Audit Logging

Every create/update/delete must log to audit:

```typescript
await auditService.log({
  actorUserId: req.user!.userId,
  actorRole: req.user!.roleCode,
  societyId: req.user!.societyId,
  moduleCode: 'CORE',
  action: 'CREATE',           // CREATE | UPDATE | DELETE | LOGIN | LOGOUT | KYC_VERIFIED
  entityType: 'Complaint',
  entityId: result._id.toString(),
  changes: { before: {}, after: dto },
  ipAddress: req.ip || '',
  userAgent: req.headers['user-agent'] || '',
});
```

---

## 17. Related Projects on Same VPS

| PM2 Name | Description | Path |
|----------|-------------|------|
| `billing-platform` | IOT Soft billing — manages subscriptions, receives onboard webhooks | `/var/www/billing-platform` |
| `jenix-api` | Older Jenix product API | — |
| `feeflow` | Fee collection SaaS | — |
| `hotelqr-api` | Hotel QR ordering | — |
| `whatsapp-service` | WhatsApp messaging gateway | `/var/www/whatsapp-service` |

The Billing Platform receives a webhook on every society self-onboard (`POST /webhooks/community-onboard`) and is responsible for sending credentials via email/WhatsApp to the new society admin.

---

## 18. Quick Reference — Key Files

| Task | File |
|------|------|
| Add a permission | `backend/src/config/constants.ts` → PERMISSIONS |
| Assign permission to a role | `backend/src/seeds/permissions.seed.ts` → ROLE_PERMISSIONS |
| Add an env variable | `backend/src/config/env.ts` → envSchema |
| Add a nav item | `frontend/src/components/layout/Sidebar.tsx` |
| Add a route | `frontend/src/App.tsx` |
| Register a new API router | `backend/src/app.ts` |
| Change module registry | `backend/src/seeds/modules.seed.ts` + re-run seed |
| Role rank order | `backend/src/config/constants.ts` → ROLE_RANK |
