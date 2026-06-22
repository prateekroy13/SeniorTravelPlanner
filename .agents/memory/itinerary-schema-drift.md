---
name: Itinerary generation schema drift
description: GPT itinerary output shape varies per run unless structured outputs are enforced
---

# Itinerary generation: enforce output schema

GPT-4o itinerary generation returns an UNSTABLE JSON shape across runs when only
`response_format: { type: "json_object" }` is used — observed variants in one sitting:
`{ itinerary: [...] }`, `{ day_1: {...}, day_2: {...} }`, camelCase vs snake_case fields.

**Why:** json_object mode constrains validity, not structure, so any parser that assumes
field names breaks intermittently.
**How to apply:** use OpenAI structured outputs (`response_format: { type: "json_schema", json_schema: { strict: true, schema } }`) for a fixed shape. The prompt-comparison harness in `scripts/src/test-prompt.ts` already does this. The production endpoint `artifacts/api-server/src/routes/itineraries.ts` still uses json_object and is exposed to the same drift risk.
