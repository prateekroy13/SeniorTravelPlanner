# Next Release — Fix List

Items to address before the next EAS native build and store submission.

---

## Bug Fixes

### ~~1. Itinerary PDF download fails for all users~~
~~- **File:** `artifacts/mobile/app/itinerary/[id].tsx` — `handleDownload` (line 100)~~
~~- **Root cause:** `expo-print` and `expo-sharing` are native modules added in commit `c781bd6` but no new native binary was built and submitted to the stores afterward. Users see "Could not create PDF. Please try again."~~
~~- **Fix:** No code change needed. Run `eas build --platform all --profile production` and resubmit to App Store + Play Store.~~
✅ **Done** — EAS production build triggered (versionCode 5, commit `fa979dc`).

### ~~2. Web platform: PDF download is broken silently~~
~~- **File:** `artifacts/mobile/app/itinerary/[id].tsx` — `handleDownload` (line 211)~~
~~- **Root cause:** `Print.printToFileAsync` throws on web (no native module). The `Alert.alert("Saved", uri)` fallback branch is also dead code on web since `Sharing.isAvailableAsync()` returns false but `printToFileAsync` errors first.~~
~~- **Fix:** Add a `Platform.OS === 'web'` guard before the print call, or use `window.print()` / a Blob download link as a web-specific path.~~
✅ **Done** — `Platform.OS === 'web'` guard added; uses iframe + `window.print()` on web.

### ~~3. Activity schema drift in PDF template~~
~~- **File:** `artifacts/mobile/app/itinerary/[id].tsx` — `buildActivity` (line 105)~~
~~- **Root cause:** `buildActivity` references `crowdLevel`, `openingHours`, `bestTimeToVisit`, and `travelMinutesToNext` on activity objects, but `DayActivity` in `lib/api-zod/src/generated/types/dayActivity.ts` defines none of these fields. The AI returns them as undocumented extras.~~
~~- **Fix:** Add the missing fields to the `DayActivity` schema in the API spec and regenerate types, so the contract is explicit.~~
✅ **Done** — Fields added to `openapi.yaml`, orval regenerated.

### ~~4. Itinerary API: unpinned JSON schema causes shape drift in production~~
~~- **File:** `artifacts/api-server/src/routes/itineraries.ts` (line 204)~~
~~- **Root cause:** The OpenAI call uses `response_format: { type: "json_object" }` with no schema constraint. GPT-4o freely varies the response shape between runs — confirmed shapes include `{ dayPlans: [...] }`, `{ day_1: {...}, day_2: {...} }`, and `{ itinerary: [...] }` with both camelCase and snake_case fields. The app's `JSON.parse` at line 220 will silently succeed but the mobile client will receive a broken itinerary.~~
~~- **Fix:** Switch to `response_format: { type: "json_schema", ... }` (OpenAI structured outputs) with a strict schema derived from the existing Zod types. Pending system prompt update (tracked separately).~~
✅ **Done** — Switched to `json_schema` structured outputs with `strict: true`.

### 5. Android: no deobfuscation file uploaded to Play Console
- **Root cause:** `enableProguardInReleaseBuilds` was not explicitly set and no `proguard-rules.pro` existed. Play Console warns that crash/ANR symbolication is unavailable.
- **Fix:** Added `enableProguardInReleaseBuilds: true` and `proguardRules: ./proguard-rules.pro` to `app.json`. Created `proguard-rules.pro` keeping React Native bridge classes safe. The mapping file will now be included in EAS build artifacts — upload it in Play Console > App Bundle Explorer > Deobfuscation files after the next build.

---

## Pending Items

- [ ] iOS build — run `eas build --platform ios --profile production` interactively to re-validate Distribution Certificate, then submit to App Store Connect.
- [ ] Android build (versionCode 5) — once complete, download `mapping.txt` from EAS build artifacts and upload to Play Console alongside the AAB.

---

## Build Checklist (when ready)

- [x] All bug fixes resolved
- [x] `pnpm run typecheck` passes with no errors
- [x] `eas build --platform android --profile production` — in progress (versionCode 5)
- [ ] `eas build --platform ios --profile production` — pending credential re-validation
- [ ] Submit iOS build to App Store Connect
- [ ] Submit Android build to Play Store
- [ ] Upload `mapping.txt` to Play Console (deobfuscation file)
