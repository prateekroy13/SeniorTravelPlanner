---
name: Static pages on API server
description: How landing/privacy HTML pages are served, and the prod path-routing gotcha
---

The API server (`artifacts/api-server/src/app.ts`) serves two inline HTML pages directly (not via the routes router):
- `GET /` — landing/"open in Expo Go" page
- `GET /privacy` — privacy policy (required for Play Store)

These are defined BEFORE the rate limiters and the `/api` router, so they are not rate-limited.

## Production path-routing gotcha (important)
The api-server artifact only claims path prefixes listed in its service `paths` in
`artifacts/api-server/.replit-artifact/artifact.toml`. Originally `paths = ["/api"]`.

In **production** (autoscale, path-based routing), ONLY the listed prefixes are forwarded
to the service. The root `/` falls through to the service as a default, but any other
non-`/api` path (e.g. `/privacy`) is NOT routed to the server and returns a hard 404 —
even though the Express route exists and works locally.

In **dev** the proxy is more permissive (root fallback covers `/privacy` too), so a route
can return 200 in dev and 404 in prod. Do not trust dev alone for root-level pages.

**Fix:** add the extra root path to the service `paths` array, e.g. `paths = ["/api", "/privacy"]`.
Edit via the artifacts skill's `verifyAndReplaceArtifactToml` flow (write a temp
`artifact.edit.toml`, then replace) — never edit `artifact.toml` in place. The change only
reaches production after a **re-publish**.

**Why:** Hit during Play Store prep — `/privacy` worked in dev, 404'd in prod, because the
prod router only forwarded `/api`. Branding edits to `/` deployed fine (root has fallback),
which made it look like only privacy was broken.

**How to apply:** Any new public page served at the API server root (not under `/api/`) must
be added to the service `paths`, then redeployed. Verify in PROD, not just dev.
