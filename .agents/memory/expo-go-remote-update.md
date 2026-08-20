---
name: Expo Go remote update troubleshooting
description: How to distinguish an Expo Go bundle download failure from an app runtime crash.
---

# Expo Go "Failed to download remote update"

Treat this error as a delivery/runtime-compatibility failure before diagnosing
application UI code. Confirm the Expo manifest and Android bundle can be
served, then run the Expo SDK compatibility check.

**Why:** Expo Go can reach Metro and request a bundle but still reject or fail
to load its remote update when the project's native package versions and app
configuration do not match the app's Expo SDK. The visible Android error does
not identify the mismatched dependency.

**How to apply:** After a fresh QR retry, verify the manifest and launch asset
are reachable, run `expo-doctor`, and align every flagged native dependency
and configuration field to the installed Expo SDK before chasing app code.