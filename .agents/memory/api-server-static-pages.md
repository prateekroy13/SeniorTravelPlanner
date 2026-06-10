---
name: Static pages on API server
description: How the landing and privacy HTML pages are served, and why prod can lag
---

The API server (`artifacts/api-server/src/app.ts`) serves two inline HTML pages directly (not via the routes router):
- `GET /` — landing/"open in Expo Go" page
- `GET /privacy` — privacy policy (required for Play Store)

These are defined BEFORE the rate limiters and the `/api` router, so they are not rate-limited.

**Why this matters:** Because they are plain code in the deployed service, any edit (branding, privacy text) only reaches users after a **re-publish/redeploy**. A symptom seen once: `/privacy` worked in dev (200) but 404'd in production because prod was an older build. The fix was simply to redeploy — not a code change.

**How to apply:** If a user reports a static page (home or privacy) is wrong/missing in the browser, first check whether they're hitting prod vs dev, then confirm whether prod has been redeployed since the code change. Suggest re-publish rather than hunting for a code bug.
