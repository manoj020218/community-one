# Play Store Release — Plan & Audit

Status as of 2026-09-19: **NOT ready for public release.** The app builds and installs, but nothing has been prepared for actual Play Store submission (no store listing, no AAB, no data-safety form, no testing track). Treat this folder as the single place to track that remaining work — update the checkboxes below as items close instead of re-deriving this audit from scratch next session.

## Where the APK is right now

`frontend/android/app/build/outputs/apk/release/app-release.apk` (5.2 MB, built 2026-08-25, signed with the release keystore, versionCode 1 / versionName "1.0").

**This file cannot be uploaded to Play Console as-is.** Google has required the Android App Bundle (`.aab`) format for all new app submissions since August 2021 — Play Console will reject a raw `.apk` upload for a new app. Nothing in this repo has produced an `.aab` yet (`android/app/build/outputs` has no `bundle/` directory). The fix is one command, not a code change:

```
cd frontend/android
./gradlew bundleRelease
```

Output lands at `frontend/android/app/build/outputs/bundle/release/app-release.aab` — that's the file to upload.

## Audit findings

| Area | Status | Notes |
|---|---|---|
| App identity | OK | `applicationId in.iotsoft.community`, matches `google-services.json` package name exactly. |
| Signing config | OK, but fragile | Release keystore + password are hardcoded in `android/app/build.gradle`. That file is inside the gitignored `android/` folder, so **it is not committed** — good, no leaked secret. But it also means the keystore and its password exist in exactly one place: `D:\IOT Device\Society\google\jenix-community-release.keystore` (+ `keystore-password.txt` next to it). See "Keystore backup" below — this is the single biggest risk in the whole release. |
| Target/min SDK | OK | `compileSdk`/`targetSdk` 35, `minSdk` 23 (Android 6.0+). Meets Play's current target-API-level policy. Re-check Play Console's minimum required target API at actual submission time — Google raises it roughly every August and this plan may be stale by the time you submit. |
| App icon | OK | Custom branded adaptive icon present (not the Capacitor placeholder) — purple background, white "J" mark, in all mipmap densities. |
| Splash screen | OK | Custom `splash.png` present for all densities/orientations, configured in `capacitor.config.ts`. |
| Permissions | OK, all justified | `INTERNET`, `CAMERA` + `ACCESS_FINE/COARSE_LOCATION` (guard-patrol QR checkpoint scanning + GPS-verified scans), `RECORD_AUDIO`/`MODIFY_AUDIO_SETTINGS` (voice input fields, guard kiosk voice hold button — Web Speech API), `POST_NOTIFICATIONS` (FCM push), `VIBRATE` (patrol alerts). No unexplained/unused dangerous permissions — good, this avoids a common Play review rejection reason. **But none of this is declared anywhere yet** — see Data Safety section below. |
| Firebase Auth (Google Sign-In) | NEEDS VERIFICATION | `google-services.json` has exactly one SHA-1 cert hash registered (`8ad1c7f4...`). Confirm this matches the **release** keystore's SHA-1 (I could not verify this myself — extracting it requires running `keytool` with the keystore password, which this session's sandbox blocked as credential materialization). If it doesn't match, Google Sign-In will silently fail in the production build even though it works in dev. Run this yourself: `keytool -list -v -keystore "D:\IOT Device\Society\google\jenix-community-release.keystore" -storepass <pw>` and compare the SHA-1 to the one in `google-services.json`. |
| Privacy Policy page | Exists | `frontend/src/modules/marketing/PrivacyPage.tsx`, routed at `/privacy`. |
| Terms of Service page | Exists | `frontend/src/modules/marketing/TermsPage.tsx`, routed at `/terms`. |
| Deep-link reachability of `/privacy` and `/terms` | NEEDS VERIFICATION | The app is a WebView pointed at `https://community.iotsoft.in` (not bundled local assets — see `capacitor.config.ts`). Play Console needs a **directly loadable URL** for the privacy policy. Since routing is client-side (React Router SPA), confirm Nginx on the VPS falls back to `index.html` for `/privacy` and `/terms` on a fresh page load (not just client-side navigation) — otherwise Google's reviewer hits a 404. Quick check: open `https://community.iotsoft.in/privacy` directly in a fresh incognito tab. |
| Store listing (title, descriptions, screenshots, feature graphic) | MISSING | Nothing in the repo — no drafted short/full description, no screenshots, no 1024×500 feature graphic, no hi-res 512×512 icon export. Play Console requires all of these before it will let you submit to any track. |
| Data Safety form content | MISSING | Not filled in Play Console yet. Based on the permissions/features audited above, this app collects: Personal info (name, phone, email, flat/unit number), precise Location (guard patrol GPS-verified scans), Photos (camera — visitor request modal, guard kiosk), Audio (voice input, transient/on-device via Web Speech API, not stored). All of this needs to be declared accurately and matched against what `PrivacyPage.tsx` actually says — read both together before filling the form, since a mismatch is a rejection reason. |
| Financial / payments (MCR + Rent modules) | NEEDS DECISION | The app handles maintenance collection (MCR) and rent. If it takes payments in-app or displays payment status/amounts, Play Console's "Financial Features" declaration applies, and depending on flow this can trigger additional policy review (e.g. if it ever resembles a lending/financial-services app). Confirm what the actual payment flow is (redirect to a payment gateway page vs. native payment UI) before answering that questionnaire — the two paths have very different scrutiny. |
| Content rating questionnaire | MISSING | Not started. Straightforward for this app (no UGC feed, no violence/gambling) — should be a quick "Everyone" rating once you fill it in Play Console. |
| Target audience & Ads declaration | MISSING | App is not for children; no ads present in the codebase (no ad SDK in `package.json`) — declare "no ads", target audience 18+/general. Quick, just needs to be filled in Console. |
| Closed testing requirement | NOT STARTED | If this is a new/personal Google Play Developer account, Google requires a closed test with **≥12 testers opted in continuously for 14 days** before the app is allowed into full production. This is a calendar-time blocker, not a code blocker — start it early. Check whether the developer account already has prior published apps (which would exempt it) before assuming this applies. |
| Developer account / listing contact info | NEEDS VERIFICATION | Confirm a Google Play Developer account exists for `in.iotsoft.community`, and that a support email/website is ready to put in the listing. |
| Keystore backup | AT RISK | The release keystore exists in exactly one place on this machine (`D:\IOT Device\Society\google\`), is not in git, and there's no evidence of a second copy. If this file or its password is lost, **you permanently lose the ability to publish updates to this app** unless Play App Signing was enrolled at first upload (in which case Google holds the real signing key and this local one is just an "upload key" — recoverable). Either confirm Play App Signing will be used (recommended, and now default for new apps) or make an encrypted backup of the keystore + password before doing anything else. |
| `google/` folder hygiene | MINOR | `D:\IOT Device\Society\google\` has several near-duplicate files (`google-services (5).json`, `google-services 1.json`, plus the one actually wired into the Android project) and an OAuth client secret JSON sitting in plaintext. Not a Play Store blocker, but worth cleaning up / moving the secrets into a password manager rather than loose files, since this folder is outside the git repo and outside any obvious backup. |
| Offline/no-network behavior | NOT VERIFIED | Since the WebView loads a **remote** URL rather than bundled assets, first-launch behavior with no network (or a slow/interrupted connection) has not been checked. Play reviewers sometimes test on throttled/offline conditions. Launch the release APK with airplane mode on and confirm it fails gracefully (not a blank white screen) before submitting. |

## Suggested order of work

1. **Back up the keystore** (or confirm Play App Signing enrollment) — do this before anything else touches the signing config.
2. Verify the Firebase SHA-1 matches the release keystore; fix `google-services.json` / Firebase console registration if not.
3. Verify `/privacy` and `/terms` load directly (fresh URL, not client-nav) on the live site.
4. Run `./gradlew bundleRelease` to produce the `.aab`; smoke-test it on a device (`bundletool` or a physical install) same as the APK.
5. Test offline/first-launch behavior.
6. Draft store listing copy + capture screenshots + feature graphic (put drafts in this folder as they're written, e.g. `listing/short-description.txt`, `listing/full-description.md`, `screenshots/`).
7. Fill in Play Console: Data Safety form, content rating questionnaire, target audience, ads declaration, financial features (if applicable), contact info.
8. Set up and run the closed testing track (if required for this developer account) — start this early since it has a mandatory 14-day clock.
9. Submit to production.

## Bottom line

Code-wise the app is close — permissions are clean, icon/splash are branded, privacy/terms pages exist, signing is configured. The actual gap is entirely **Play Console process work** (store listing, data safety, testing track) plus **two verification steps** (Firebase SHA-1, `/privacy` deep-link reachability) and **one build step** (produce the `.aab`). None of it requires new app features. The keystore backup is the one item that deserves urgency out of proportion to its size — losing it is not fixable after the fact unless Play App Signing is already active.
