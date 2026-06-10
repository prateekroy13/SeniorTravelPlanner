---
name: Production domain
description: Which deployed URL is live for the Tuttle/SeniorTravel app
---

The active production deployment is **`senior-travel-planner.replit.app`**.

- `seniortravel.replit.app` is NOT connected to any live deployment — it returns 404 for all paths. Do not use it for Play Store listings or anywhere user-facing.
- The Play Store privacy policy URL is `senior-travel-planner.replit.app/privacy`.
- The mobile app defaults `EXPO_PUBLIC_DOMAIN` to this prod domain.

**Why:** During Play Store prep, the wrong domain was nearly used; only the hyphenated one resolves.
**How to apply:** Any time you give the user a production URL (privacy policy, store listing, sharing link), use the hyphenated domain.
