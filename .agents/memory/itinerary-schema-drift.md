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
**How to apply:** use OpenAI structured outputs (`response_format: { type: "json_schema", json_schema: { strict: true, schema } }`) for a fixed shape. Both the prompt-comparison harness and the production generate endpoint now enforce strict schemas. Note the two schemas are intentionally different: production uses the OpenAPI contract shape (`dayPlans` → morning/afternoon/evening), while the harness experiments with a flat `days`/`activities` shape — do not "sync" them. The contract test `pnpm --filter @workspace/scripts run test-generate` validates the live endpoint response against the generated Zod contract; run it after any change to the AI schema, prompt, or OpenAPI itinerary types.
