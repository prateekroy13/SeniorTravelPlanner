# Evals Framework — Travel Itinerary Generation

**Status: DRAFT for discussion. Nothing in this doc is implemented yet. Do not treat any threshold or checklist here as final — flag anything that should change before it becomes a working doc / gets committed.**

**Revision note (round 2):** audience scope broadened from seniors-only to all travelers — pace/step-budget/accessibility/dietary preferences remain first-class, but as *opt-in preferences anyone can set*, not a default persona. This revision also folds in a code-verified finding on budget personalization, and proposes concrete designs for pre-generation grounding, a geocode gate, sampled cross-model evaluation, and a new "local insider picks" feature.

Modeled loosely on the INDmoney Mind evals case study (product context → tech flow → prompt → why evals → metrics → test dataset → eval methods → offline/online → gates), adapted to what this app actually does today, based on a fresh read of the codebase (Aug 2026).

---

## 1. Product Context

The feature in scope is **AI itinerary generation**: a traveler picks a city, country, trip length (3–7 days), and travel month, optionally swipes right on attractions/restaurants they like, and the app calls GPT-4o to generate a full multi-day itinerary — daily activities, rest stops, restaurants, transport options, and side trips — tailored to their stated pace, step budget, dietary needs, interests, budget level, and accessibility needs.

**Audience note:** the product is now positioned for all travelers, not seniors exclusively. Pace/step-budget/dietary/accessibility preferences stay important — they're just preferences a family with a stroller, someone recovering from surgery, or a senior traveler can each set for themselves, rather than a baked-in persona. This matters for the eval doc because it shifts the framing from "assume every user is frail" to "honor whatever preferences a given user actually stated" — see the flagged prompt/schema staleness in §3.

This is a **different risk profile than INDmoney Mind**. INDmoney's failure mode is bad financial advice; ours is closer to: *a traveler with a stated accessibility need follows our itinerary to a restaurant that's closed, up a hill our step budget said to avoid, expecting accessibility that doesn't exist.* The stakes are physical (fatigue, stranding, wasted travel day) and trust-based, not financial. That should shape which eval dimensions get the P0 label — and it applies to anyone who told us about a real constraint, at any age.

## 2. Where This Actually Runs Today (grounded in code)

| Layer | Reality |
|---|---|
| Trigger | `artifacts/mobile/app/itinerary/generate.tsx` → `POST /api/itineraries/generate` |
| Orchestration | `artifacts/api-server/src/routes/itineraries.ts` — one route, one LLM call site |
| Grounding data | **RAG pipeline:** Google Places Nearby Search fetches real attraction candidate pools per city (main pool: 15 km, insider/hidden gems: 50 km, 30-day cache). Candidate pool injected into every LLM prompt — model picks ONLY from verified real places. Distance Matrix still used for walking times between liked attractions. |
| Model | `gpt-4o` via OpenAI SDK, `response_format: json_schema` (`strict: true`), `max_completion_tokens: 16000` |
| Output validation | Schema shape only (OpenAI structured outputs + a Zod contract test in `scripts/src/test-generate-endpoint.ts`) — **no semantic/factual validation today** |
| Photos | Google Places Text Search + Photo Media API (`artifacts/api-server/src/routes/maps.ts`) — real photos, but display-only, not used to validate the LLM's claims |
| Curated (non-LLM) data | `artifacts/api-server/src/routes/destinations.ts` — 14 hand-authored cities with static attractions/restaurants, used for the swipe screens, not the AI generation flow |
| City input | Geocode gate via Google Geocoding API — `geocodeCityCoords()` in `utils/places.ts` validates city before any LLM call. Invalid cities get a 400 error. Returns lat/lng for the Places pipeline. |
| Persistence | Saved itineraries go to Postgres as JSONB (`generatedData`) — no versioning of which prompt/model produced them |
| Observability | `generation_logs` Postgres table — per-request logging of request_id, city, model, tokens_in, tokens_out, estimated_cost_usd, latency_ms, http_status, error_type. Fire-and-forget (doesn't block response). No dashboard yet. |
| User feedback | `accuracy_reports` Postgres table + "Report an issue" button in day detail view. Users can flag closed places, wrong hours, wrong address, or non-existent venues. Each report tagged with itinerary_id, day_number, item_type, item_name, issue_type. |
| Purchase/booking links | **None exist anywhere in the codebase today** — confirmed by grep. Roadmap-only (GetYourGuide/Viator, listed as v3) |

Existing (informal) eval scaffolding worth building on rather than duplicating:
- `scripts/src/test-generate-endpoint.ts` — Zod contract test + a few non-fatal semantic sanity checks (day count, non-empty names, a `console.warn` if a liked attraction never shows up in the output).
- `scripts/src/test-prompt.ts` — a side-by-side CURRENT-vs-CANDIDATE prompt comparison harness that already computes field-population metrics. This is basically a prototype of the offline eval runner this doc proposes formalizing.

## 3. Current System Prompt (as shipped)

```
You are a senior-first travel planner AI. Generate realistic travel itineraries for senior travelers (ages 60+).

Key requirements:
- Pace activities for the specified preference (easy/moderate/active)
- Realistic step counts: easy 3000-5000, moderate 5000-8000, active 8000-12000
- Group nearby attractions on the same day to minimise travel
- Include real opening hours for each attraction
- State the best time to visit each place (fewest crowds, best light)
- Crowd level per attraction: "low" | "medium" | "high" (for the stated best time)
- 1-2 rest stops per half-day (cafes, parks)
- Public transport options with accessibility notes
- 3 mid-tier restaurants per day
- Budget estimates in local currency (mid-range realistic pricing)
- 1-2 nearby side trips per day
- Keep descriptions concise (max 80 words each)

IMPORTANT: Respond ONLY with valid, complete JSON. No markdown, no truncation.
```

**Gaps this eval framework needs to compensate for, because the prompt doesn't address them:**
1. It asks for "real opening hours" but nothing grounds them — the model is asserting hours from its own knowledge/pattern-matching, not a live source.
2. No instruction to only suggest places that actually exist, or any anti-hallucination language.
3. No curation criteria beyond "mid-tier" / "3 restaurants" — no signal that reviews, ratings, or actual popularity were considered (because they aren't — there's no such data source wired in).
4. `wheelchairFriendly` is a boolean the model invents per restaurant — for an accessibility-conscious product, an ungrounded true/false accessibility claim is arguably the single riskiest field in the whole schema, for whichever user actually needs it.
5. No constraint against suggesting anything transactional (moot today since no links exist, but worth a regression guard before the booking-integration roadmap item ships).
6. **Budget personalization is likely broken** — see the code-verified finding in §7 Q2 below. The system prompt hardcodes "mid-tier"/"mid-range" pricing regardless of what the user actually selected.
7. **The persona text itself is now stale.** Line 47 literally reads *"You are a senior-first travel planner AI... for senior travelers (ages 60+)"* and the schema still has `seniorFriendlyScore`/`seniorFriendlyNotes`/`isRestStop` fields baked in as if every user is the same persona. Given the audience is broadening, this needs a product decision (kept as an "accessibility mode" concept vs. renamed/generalized) — flagging it here since it affects every eval dimension below, but the actual prompt/schema rewrite is a separate piece of work from this doc.

## 4. Why We Need Evals

1. **Physical consequence, not just a bad answer.** A wrong opening hour or an invented "wheelchair accessible" claim can strand a mobility-limited traveler on a trip they can't easily improvise around, unlike a stock chatbot being wrong.
2. **The product's entire value prop is "we did the homework so you don't have to."** If the pacing/step-count logic or hours are wrong, we've actively made the trip worse than if the user had just used a map app.
3. **Zero grounding today for most claims.** Opening hours, crowd levels, pricing, and accessibility are 100% LLM-generated with no cross-check — this is the biggest gap and the natural starting point.
4. **Free-text city input, no allowlist.** Any string reaches the model; there's currently no gate distinguishing "Lisbon, Portugal" from a typo, a nonsense string, or an adversarial prompt-injection attempt.
5. **No observability.** We currently can't answer "how much did last week's generations cost," "what's our hallucination rate," or "did the last prompt change make things worse" — all three are currently invisible.
6. **Model/prompt changes need a regression guard.** `test-prompt.ts` shows the team already anticipates comparing prompt variants; it just isn't wired into a gate yet.
7. **New cities are currently unvalidated.** Nothing stops a first-time city from reaching a user with zero one-time review.

## 5. Evaluation Dimensions

Mapping your eight questions (labeled Q1–Q8) plus additions onto concrete, testable dimensions:

| # | Dimension | What it checks | Source question(s) |
|---|---|---|---|
| D1 | **Place existence** | Every named restaurant/attraction actually exists at/near the stated city | Q1 |
| D2 | **Personalization fit** | Selections match stated dietary needs, interests, pace, budget level, accessibility needs | Q1 |
| D3 | **Data plausibility (price/hours/crowd)** | Pricing, hours, crowd-level claims are within a plausible range vs. a real source | Q2, Q8 |
| D4 | **Temporal consistency** | The place is actually open at the day/time-slot the itinerary assigns it | Q5 |
| D5 | **Accessibility claim safety** | `wheelchairFriendly` and other accessibility statements are either grounded or hedged, never asserted with false confidence | new |
| D6 | **Physical realism / pacing** | Step counts, walking minutes, and day density match the stated pace/step-budget preference | new (core value prop) |
| D7 | **Day-plan coherence** | No duplicate places across days, geographically sensible grouping, no scheduling overlaps | new |
| D8 | **Suggestion-only / no transaction** | Output (and surrounding UI) never presents a purchase/booking link or "buy now"-style framing | Q4 |
| D9 | **New-destination readiness** | A city has passed a defined check before reaching production, for both the curated list and free-text AI paths | Q3 |
| D10 | **Schema & structural integrity** | Valid against the Zod contract, no truncation, no drift (extends existing `test-generate-endpoint.ts`) | existing |
| D11 | **Tone & readability** | Clear, welcoming, general-audience language: no unexplained jargon, concise, legible sentence structure — and no presumptions about the traveler's age or ability beyond what they actually stated in preferences | new (revised — no longer senior-specific) |
| D12 | **Cost / latency / token efficiency** | Tokens in/out, $ per itinerary, P50/P95 latency | Q7 |
| D13 | **Cross-model agreement** | A second model's independent read of the same itinerary flags the same issues a first-party judge would miss | Q8 |
| D14 | **User-reported accuracy (explicit feedback)** | Structured hard signals from real users post-generation and post-trip | Q6 |
| D15 | **Adversarial robustness** | Prompt injection via free-text fields (city, interests), offensive/nonsense input, boundary values (days=3 vs 7) | new |

## 6. Metrics & Thresholds (starting proposal — needs your sign-off)

| Metric | Target | Critical | Action |
|---|---|---|---|
| Place existence rate (D1) | ≥98% | <93% | Block deploy |
| Personalization fit score (D2, LLM-judge 1–5) | ≥4.0 | <3.0 | Investigate |
| Price/hours plausibility (D3, vs. grounded source) | ≥95% | <85% | P0 |
| Temporal consistency (D4) | ≥97% | <90% | P0 |
| Accessibility claim safety (D5) | 100% hedged-or-grounded | any false-positive claim | Block deploy |
| Pacing accuracy (D6, step count within stated band) | ≥95% | <85% | P0 |
| Duplicate/overlap rate (D7) | 0% | >2% | P1 |
| Transaction-link leakage (D8) | 0 occurrences | any occurrence | Block deploy |
| New-city checklist completion (D9) | 100% before launch | any skipped item | Block launch |
| Schema pass rate (D10) | 100% | <99% | Block deploy |
| Tone/readability pass (D11, LLM-judge) | ≥4.0 | <3.0 | Investigate |
| Cost per itinerary (D12) | tracked, no fixed target yet | >2x rolling median | Alert |
| P50 latency (D12) | <8s | >20s | Optimize |
| Cross-model disagreement rate (D13) | <10% | >25% | Investigate |
| Thumbs-down / "report inaccurate" rate (D14) | <10% | >20% | Investigate |
| Injection/adversarial resistance (D15) | 100% | any leak of raw instructions or off-brand output | P0 |

These numbers are placeholders to anchor discussion, not measured baselines — we have no production traffic yet to calibrate against. First milestone should probably be *instrumenting and measuring*, then setting real thresholds off observed data (see §11).

## 7. Deep Dive — Your Specific Questions

### Q1 + Q2 — Are the places real, curated to need, and is the surrounding data (price/reviews) trustworthy?

Two separate problems today: **existence** and **curation quality**.

- **Existence check (D1):** Post-generation, for each restaurant/attraction name + city, call the Google Places Text Search API (the same API already wired for photos in `maps.ts`) and require a match above a confidence/name-similarity threshold. No match → flag as unverified. This can run as an automated offline eval today with zero product changes, and could later become a synchronous pre-response grounding step (higher latency/cost trade-off — worth a separate discussion).
- **Curation fit (D2):** Since there's no real "ranking by review score" happening (the model isn't fed any review data), "curated based on user needs" today really means "personalization fit," not "quality-ranked." Eval as: does the restaurant's cuisine match `dietaryNeeds`, does the activity match `interests`, does `priceRange`/`cost` track `budgetLevel`. This is checkable both programmatically (dietary tag matching) and via LLM-judge (does this *feel* like a good fit for someed interests).
- **Reviews/ratings (Q2):** The current schema has **no rating or review-count field at all** — you confirmed you're open to adding this (see §12), and it's the more direct fix vs. eval-only checking.

**Code-verified finding — is pricing personalized, or always mid-range? (your Q2 follow-up)**

Checked `artifacts/api-server/src/routes/itineraries.ts` directly. Short answer: **your profile preferences do reach the model on every request, but the pricing/restaurant-tier instruction is hardcoded and likely overrides them.**

- Preferences *are* wired through correctly: `buildPrompt()` (lines 96–102) injects `pace`, `maxStepsPerDay`, `dietaryNeeds`, `interests`, **`budgetLevel`**, and `accessibilityNeeds` from the mobile app's `PreferencesContext` into the user-turn prompt on every single call. So "does the profile reach the prompt" — yes, confirmed.
- But the **system prompt** (lines 58–59) says, unconditionally, for every request regardless of budget level:
  ```
  - 3 mid-tier restaurants per day
  - Budget estimates in local currency (mid-range realistic pricing)
  ```
  Nothing in the system prompt references `budgetLevel` at all, or tells the model that restaurant tier/pricing should vary by it. The user-turn prompt does pass `Budget level: ${budgetLevel || "mid"}` as one line of context, but it's sitting next to a system-level instruction that already told the model to default to mid-tier regardless.
- In practice this means: a user who sets `budgetLevel: "luxury"` or `"budget"` is likely still getting mid-range restaurant suggestions, because the system prompt actively steers the model toward "mid-tier" as an instruction, not just a fallback default. This reads as an unintentional bug rather than a deliberate design choice — the fallback string `"mid"` at line 101 (used only when `budgetLevel` is unset) makes sense as a default; the *system prompt* hardcoding "mid-tier" for every request does not.
- **Suggested fix** (flagging for your call, not changing code yet): replace the two hardcoded lines in `SYSTEM_PROMPT` with something conditional, e.g. *"Restaurant price tier and budget estimates must match the traveler's stated Budget level exactly — do not default to mid-range."* This is a one-line prompt fix, separate from the eval-framework work, but worth doing regardless of when the rest of this doc lands.
- **This is also a perfect first eval test case.** Add a D2 (personalization fit) test that runs the same city/day-count three times with `budgetLevel` set to `"budget"`, `"mid"`, and `"luxury"`, and asserts that `priceRange`/`cost`/`estimatedCostLow`/`estimatedCostHigh` actually shift meaningfully between runs. Today, I'd expect this test to fail — which is exactly the kind of regression this framework should have caught before it shipped.

### Q3 — New city rollout eval

Split by path, because the codebase currently treats these very differently:

- **Curated destinations (`destinations.ts`):** Already gated by code review (hand-authored PR). Add a **New Destination Checklist** to that PR template: run the automated eval suite (D1, D3, D4) against the new city's hand-authored attractions/restaurants, confirm `imageUrl`s resolve, confirm at least one entry per dietary/accessibility combination the app supports.
- **Free-text AI generation (no allowlist today):** This is the bigger gap. Two options to discuss:
  1. **Geocode-gate**: validate the city string via Google Geocoding API before calling the LLM at all — rejects typos/nonsense, doesn't require a hardcoded list, minimal added latency.
  2. **First-seen-city sampling**: don't block, but flag any city not seen before in a special queue for human spot-check within N hours, run the full automated suite against it before it's shown to a second user for that city.
  I'd recommend (1) as a cheap correctness gate regardless, plus (2) for quality — they're not mutually exclusive.

### Q4 — Suggestion-only, no purchase links

Today this is trivially true (no links exist anywhere). The eval value here is **regression protection**, especially since booking integrations are on the roadmap (v3, GetYourGuide/Viator). Proposed automated check (cheap, deterministic, like INDmoney's Compliance Checker): scan all itinerary text fields and the rendered share-sheet output for URL patterns, "buy now"/"book here"/price-with-CTA phrasing, and affiliate-link domains. Zero tolerance — any hit blocks deploy. Add this test *now*, before it's needed, so it's already in place and battle-tested by the time booking links are a real feature (and can be reused to prove those new links are only surfaced where intended, not injected into itinerary text).

### Q5 — Is the place actually open at the suggested day/time?

This is the biggest concrete gap in the current schema: `openingHours` is a free-text LLM string, `bestTimeToVisit` is also free text, and neither is checked against reality. Proposed grounding + check:
1. For each activity, resolve the place via Places Text Search (same call as D1's existence check — can be combined into one pass).
2. Pull real `opening_hours.periods` via Places Details.
3. Cross-check the day-of-week (derived from `travelMonth` + trip day index — note: today the app doesn't ask for a specific start date, only a month, so this can only be checked approximately, e.g. "generally open on [weekday pattern]" rather than an exact date — worth deciding if we should start collecting a real start date to make this precise) and the assigned time slot (morning/afternoon/evening) against real hours.
4. Flag if the assigned slot falls outside real hours, or if `bestTimeToVisit` contradicts real opening hours.

This one probably has the highest ROI of everything in this doc, since it directly prevents "we sent a 70-year-old to a closed restaurant."

### Q6 — Getting hard input from users

Distinguish *implicit* signals (already partly exist via swipe) from *explicit* ones (mostly missing):

| Signal | Type | Exists today? | Use |
|---|---|---|---|
| Swipe right/left on attraction/restaurant | Implicit preference | Yes (pre-generation) | Feed into personalization, not post-generation accuracy |
| Thumbs up/down per day or per itinerary | Explicit satisfaction | No | Primary online quality signal (mirrors INDmoney's approach) |
| "Report an issue" per activity/restaurant | Explicit accuracy correction | **Yes — "Report an issue" link in day detail view** | Highest-value signal — direct hallucination catch, feeds straight into accuracy_reports table; each report is a labeled eval case (D1/D4/D5 failure cases) |
| Regenerate-this-day click | Implicit dissatisfaction | No | Investigate trigger |
| Post-trip micro-survey ("did you actually visit these places? were they as described?") | Delayed ground truth | No | The only signal that validates *real-world* accuracy, not just plausibility — expensive to collect (needs to reach users after their trip), but the highest-fidelity of anything here |

Recommend starting with the "report inaccurate" button on individual itinerary items — it's cheap to build, and every report becomes a labeled eval case for free (this is exactly INDmoney's "production query mining" idea, adapted).

### Q7 — Transparency & observability (API calls, token utilization)

Nothing exists today beyond a failure-path `console.error`. **Status: Implemented** — `generation_logs` table in `lib/db/src/schema/generation_logs.ts`, populated via fire-and-forget in the `itineraries.ts` generate handler. Captures all fields below except `google_places_calls` and `google_api_cost_usd` (those can be added when Places call counts are tracked).

Minimum logging schema per generation request:

```
request_id, timestamp, user_id_hash, city, country, days, travel_month,
prompt_version, model, tokens_in, tokens_out, estimated_cost_usd,
latency_ms, google_places_calls, google_distance_matrix_calls,
google_api_cost_usd, http_status, error_type (nullable)
```

Minimum viable dashboard, in priority order:
1. Cost per itinerary (rolling median + trend) — you're on gpt-4o with 16k max output tokens, this could get expensive at scale and there's currently zero visibility into it.
2. P50/P95 latency.
3. Error rate by type (OpenAI failure vs. JSON parse failure vs. Google API failure).
4. Token trend by prompt version — this is what lets you tell if a prompt change quietly made responses more verbose/expensive.

This is the one area where I'd push to start simple (structured logs to a table you can query) rather than adopting a full observability vendor before there's real traffic to justify it.

### Q8 — Cross-model validation & pricing comparison

Two distinct ideas worth separating:

- **Cross-model-as-judge**: send the generated itinerary to a second model (e.g., Claude) as an independent grader — same-model judges tend to rate their own outputs generously (self-preference bias), so a different provider is a real signal, not just redundancy. Best used for D2 (personalization fit) and D11 (tone), where "does this feel right" is inherently judgment-based rather than fact-checkable.
- **Pricing comparison**: I'd push back slightly on using a second *LLM* to validate pricing — a second model's "knowledge" of restaurant prices is just as ungrounded as the first model's. Better ground truth: Google Places `price_level` (0–4 scale, real) as a sanity bound on the LLM's price-range claim, rather than model-vs-model. Save cross-model judging for the subjective dimensions, and use real APIs for anything with a factual answer.

### Grounding Before Generation — Proposed Architecture (answering your Open Q1)

Your instinct is correct, with one nuance worth being precise about: **Google's APIs give you real facts about places that already exist — they don't do the personalization/pacing/curation reasoning.** So "grounding before generation" means using Places data to shrink the LLM's job from *"invent restaurants and facts about them"* to *"select, arrange, and narrate from a real, verified set of candidates"* — a standard retrieval-augmented-generation (RAG) pattern.

Proposed pipeline:

1. **Resolve the location.** Call the **Geocoding API** on `city` + `country` → get back a precise `lat/lng` and `place_id`. (This step doubles as the geocode gate — see next section.)
2. **Fetch real candidates.** Call **Places Nearby Search / Text Search** around that lat/lng:
   - Attractions: filtered by category/type matching the user's `interests` (museum, park, landmark, etc.)
   - Restaurants: filtered by `type=restaurant`, `price_level` matching `budgetLevel`, and a keyword pass for `dietaryNeeds` (e.g. "vegan restaurant Vienna")
3. **Fetch real details per candidate.** Call **Place Details** for each result to get real `name`, `formatted_address`, `rating`, `user_ratings_total`, `price_level`, structured `opening_hours` (with day-by-day periods, not free text), and accessibility fields where Google exposes them (coverage varies by place — flag this as a known limitation, not every place has this data).
4. **Build a candidate pool** — e.g. 25–40 real places with full real data — and inject it into the prompt as **structured data**, not prose. The instruction changes from "generate realistic restaurants" to *"select and arrange attractions/restaurants ONLY from CANDIDATE_POOL below; do not invent places not in this list."*
5. **What's left for the LLM to actually do** (still real, still valuable): choosing which candidates best fit the stated preferences, day-grouping/pacing logic, writing the narrative descriptions and tips, and — per your local-insider idea below — surfacing the non-obvious picks from within (or adjacent to) the pool.

Why this is worth the investment: it doesn't just reduce hallucination risk (D1) — it makes D3 (price/hours/crowd) and D5 (accessibility) *free*, because those fields get copied from real Place Details instead of generated. It converts most of this eval framework from "catch the model lying" into "verify the pipeline wired the real data through correctly," which is a much easier problem.

Trade-offs to weigh before committing to this as the architecture: added latency (multiple Places calls before the LLM call — parallelizable, but still real), added Google API cost per generation (Nearby Search + Details calls add up — worth estimating $/itinerary before scaling), and a fallback path for when Places doesn't return enough matching candidates (small towns, unusual dietary + budget combos) — the pool could come back too thin to build a good itinerary from, and that failure mode needs its own handling.

### Geocode Gate — Explained (answering your Open Q3)

**Status: Implemented** — `geocodeCityCoords()` in `artifacts/api-server/src/utils/places.ts`. Returns null for invalid cities; generate route returns 400. Also returns lat/lng used by the Places RAG pipeline so geocoding is only called once per generation.

The **Google Geocoding API** takes free text (`city`, `country`) and returns a structured, verified result — it's a single REST call: `GET /maps/api/geocode/json?address=<city>,<country>`.

What comes back:
- `formatted_address` — the canonical name (fixes "NYC" / "new york" / "New York City" all resolving differently)
- `geometry.location` — real `lat`/`lng`
- `place_id` — a stable ID, reusable directly in the grounding pipeline's Nearby Search/Details calls above, so you're not paying for this lookup twice
- `types` — tells you *what kind* of place it resolved to (e.g. `"locality"`, `"administrative_area_level_1"` for an actual city/town, vs. resolving to a business, a street address, or nothing)
- `status` — `"OK"` vs. `"ZERO_RESULTS"` vs. ambiguous multiple matches

**How it gates:** call this the moment the user submits city+country, before the LLM is ever touched. If `status` is `ZERO_RESULTS`, or the result's `types` don't look like a real place (e.g. it matched a business name instead of a city), reject with a "we couldn't find that city — did you mean...?" and offer back any alternate candidates Geocoding returned. Only proceed to the (paid, slower) LLM call once you have a verified location.

**Why it's worth it:** rejects typos/gibberish/adversarial input *before* the expensive LLM call runs — it's cheap (~sub-200ms, low cost) relative to a wasted GPT-4o call on garbage input. It also normalizes city names for your eval dataset stratification later, and it gives you the `lat/lng`/`place_id` the grounding pipeline needs anyway, so this step isn't extra work on top of grounding — it's the first step of it.

**One limit worth naming:** Geocoding validates that the *place* exists, not that a good *trip* exists there — it won't stop someone from requesting a 7-day itinerary for a village with three streets. That's a separate problem the candidate-pool-thinness fallback above needs to handle.

### Sampled (10%) Evaluation — Implementation & Where to Observe (answering your Open Q5)

**Implementation:**
- Sample deterministically, not with a random coin flip per request: hash `request_id` (or `user_id`, if you want a given user's requests to sample consistently) and sample when `hash % 10 === 0`. Deterministic sampling means a retried request samples the same way, it's trivial to reason about in logs, and bumping to 20%/50% later is a one-line change.
- Run the sampled work **after** the response is already sent to the user — never add grounding-check or cross-model-judge latency to the live request. In the current stack (no job queue yet), the pragmatic version of this is: fire an `async` function without `await` right after `res.json(itinerary)` in the route handler, wrapped in its own `try/catch` so a failure there can never affect what the user sees. That's "good enough" until volume justifies a real queue (e.g. BullMQ + Redis) — I wouldn't build a queue for this on day one.
- What that background job does: takes the itinerary that was just generated, runs (a) the Places-based existence/hours checks, (b) the cross-model judge call for personalization/tone, and (c) writes results to an `eval_results` table keyed by `request_id`, alongside the request-level logging schema from §7 Q7.

**Where you'd actually observe this** — three options, increasing in effort and worth deciding between:
1. **Cheapest to ship**: log request metadata + eval results into Postgres tables (which you already have), and point a free self-hostable BI tool like **Metabase** at it for dashboards — no new infra beyond a table and a connection string.
2. **Purpose-built LLM observability**: tools like **Langfuse** (open-source, self-hostable or hosted) or **Helicone** are built exactly for this — token/cost/latency/trace dashboards, prompt-version tracking, and eval-score tracking, often via a thin wrapper around the OpenAI client you already use. Saves you building the dashboard, at the cost of a new dependency.
3. **Full APM** (PostHog/Amplitude) — already on your own v3 roadmap per `ARCHITECTURE.md`, but likely premature for this specific need right now.

My recommendation: start with **option 1** — it needs no new vendor, you already run Postgres, and it gets you observing real numbers fastest. Revisit Langfuse/Helicone once you're confident this is a sustained investment area, since they'd save real time specifically on tracing/dashboards once volume grows.

## 8. Test Dataset Design (starting proposal)

| Category | Examples | Priority |
|---|---|---|
| Popular cities, happy path | Rome, Paris, Kyoto, Lisbon — trips of 3/5/7 days | P0 |
| Curated-list cities (regression) | All 14 hardcoded destinations, generate + compare against the hand-authored data as loose ground truth | P0 |
| First-time / long-tail cities | Small towns, less-documented destinations — stress-tests D1/D3/D4 where the model has less reliable training data | P0 |
| Dietary/accessibility edge cases | Vegan + wheelchair + easy pace + low step budget, combined | P0 |
| Pacing extremes | `active`/12000 steps vs `easy`/3000 steps, same city | P1 |
| Swipe-liked places included | Verify liked attractions/restaurants actually appear (extends existing non-fatal check in `test-generate-endpoint.ts` — should become a hard fail) | P0 |
| Adversarial / injection | City field containing instructions ("ignore previous instructions..."), gibberish, offensive strings | P0 |
| Boundary values | days=3, days=7 (schema bounds), empty interests, empty dietary needs | P1 |
| Seasonal | Same city across different `travelMonth` values — hours/crowd claims should shift plausibly, not be copy-pasted | P2 |
| Production-mined (once live) | Real user requests that got thumbs-down or "report inaccurate" | ongoing, highest value |

## 9. Eval Methods

**Automated / programmatic** (cheapest, run on every prompt PR):
- Zod schema validation (exists)
- Place existence via Places Text Search (D1)
- Opening-hours cross-check via Places Details (D4)
- Transaction-link/CTA scanner (D8)
- Step-count/pacing math check against stated preference band (D6)
- Duplicate-place detector across days (D7)
- Liked-attraction/restaurant inclusion check, promoted from warning to hard fail (D1 extension)

**LLM-as-judge** (1–5 scale, run on a sample, not every request — cost trade-off worth discussing):
- Personalization fit (D2)
- Tone/readability appropriate for seniors (D11)
- Cross-model grading for D2/D11 specifically (D13)

**Human evaluation:**
- New-city launch checklist (D9)
- Quarterly audit sample, ideally including reviewers across the range of preferences the app actually supports (someone testing with accessibility needs set, someone testing with none, different budget levels) — an LLM judge can't tell you if the tone actually reads as respectful and the personalization actually feels honored
- Accessibility claims (D5) reviewed by someone who actually knows accessibility standards, not just plausibility-checked by a model

## 10. Offline vs. Online Evals

| Trigger | Scope | Blocking? |
|---|---|---|
| Every prompt/model PR | Smoke test — small fixed set (mirrors `test-prompt.ts`, formalized into CI) | Yes |
| Nightly | Full regression across dataset in §8 | No (alerts) |
| Before a new city ships (curated or first AI use) | New-city checklist (§7 Q3) | Yes |
| Model change (e.g., gpt-4o → a newer model) | Full suite + cost/latency comparison | Yes |
| Production, real-time | Error rate, latency, transaction-link leakage (D8 — zero-tolerance, alert on any occurrence) | N/A (monitoring) |
| Production, sampled | Existence/hours/pacing checks on X% of live generations, "report inaccurate" signal | N/A (monitoring) |

## 11. Deployment Gates (draft)

| Gate | Condition | Action |
|---|---|---|
| Schema Gate | 100% pass | Block deploy |
| Existence Gate | ≥98% place existence | Block deploy |
| Accessibility Safety Gate | 0 false/unhedged accessibility claims found in sample | Block deploy |
| Transaction-Link Gate | 0 occurrences | Block deploy |
| New-City Gate | Checklist 100% complete | Block launch for that city |

## 12. New Feature Proposal — Local Insider / Hidden-Gem Picks

Your Vienna example (top 8–10 mainstream picks, plus 2–3 things like a Melk day trip or an opera performance that don't show up on generic tourist sites) is a genuinely good differentiator — worth designing carefully rather than bolting on, because it interacts with the grounding architecture above in a specific way.

**Prompt/schema design:**
- Keep the main day-plan as-is (and, once grounding lands, constrained to the verified candidate pool per D1).
- Add a distinct field — e.g. a `localInsiderPicks` array (itinerary-level, or one per 2–3 days rather than forced into every single day) — with its own explicit instruction, something like: *"In addition to the main itinerary, suggest 2–3 'local insider' picks: places or experiences that are genuinely excellent but wouldn't appear on a typical top-10 list for this city — a nearby day trip, a specific show/performance, a neighborhood locals actually frequent. For each, include a short `whyNonObvious` explanation and how it connects to the traveler's stated interests."*
- Tag these distinctly in the schema (`category: "local_insider"` or the separate array above) so the UI can badge them differently (e.g. "Local's Pick") — and, just as importantly, so they can be **eval'd separately** rather than mixed into the main-itinerary metrics.

**Why this needs its own eval treatment, not a bolt-on to D1/D2:**
- **Existence validation gets harder by design.** The whole point of a hidden gem is thinner documentation — Places API coverage and review volume will naturally be lower. A strict "must be in the pre-filtered, popularity-ranked candidate pool" rule would filter out exactly the good suggestions. Recommend a **relaxed existence check** for this category specifically: still require it exists via a broader, unfiltered Places/Geocoding lookup (never skip that — see the risk below), just don't require it to have shown up in the main popularity-filtered pool.
- **"Is this actually non-obvious" is a new, genuinely hard-to-automate dimension.** No programmatic check can tell you if Melk is truly a hidden gem or secretly the #1 result on every "day trips from Vienna" blog. Two realistic options: (a) an LLM-judge prompt asking specifically "would this appear on the first page of generic tourist guides for this city? penalize if yes," or (b) a light-touch spot check from your internal team per new city — which you're already doing for the New-City Gate (§7 Q3), so this can likely piggyback on that same review pass rather than being new process.
- **This instruction is an open invitation to hallucinate.** "Unique and undiscovered" is exactly the kind of ask that rewards the model for sounding clever over being accurate — a fabricated-sounding hidden gem is genuinely hard to tell apart from a real one without checking. This makes the existence check for this category *more* important than for the mainstream picks, even though it's harder to fully automate.

**Proposed new dimension — D16: Local-insider suggestion quality**
(a) existence-verified via relaxed/broader lookup, (b) genuinely non-obvious per LLM-judge or human spot-check, (c) actually relevant to the traveler's stated interests rather than generic filler.

## 13. Open Questions — Need Your Call Before This Becomes Real

1. ✅ **Grounding architecture — decided: ground before generation.** Proposed pipeline is in §7 above (Geocode → Nearby Search/Text Search → Place Details → structured candidate pool injected into the prompt). Still open: do we build this as one big rollout, or land it incrementally (e.g., restaurants first since that's where the budget bug lives, attractions second)? Worth a call before scoping actual work.
2. ✅ **Schema change — confirmed: add `rating`, `reviewCount`, `priceLevel`.** These map directly to Place Details fields (`rating`, `user_ratings_total`, `price_level`), so this is a natural byproduct of the grounding pipeline rather than separate work — same API calls feed both.
3. ✅ **City input — geocode gate explained in §7 above.** Still open: do you want to proceed with building it, and should ambiguous matches surface a disambiguation prompt to the user (e.g. multiple cities with the same name) or just take Google's top result?
4. **Noted for next iteration** — collecting an actual trip start date (not just month), to make the opening-hours check in Q5/D4 exact rather than approximate.
5. ✅ **Sampling rate — confirmed: 10%.** Implementation + observability options in §7 above (deterministic hash-based sampling, async fire-and-forget, Postgres+Metabase recommended as the starting point over Langfuse/Helicone/full APM). Still open: confirm you're comfortable starting with Postgres+Metabase before evaluating a paid observability vendor.
6. ✅ **Reviewers — confirmed: internal team**, for both new-city checks (§7 Q3) and the local-insider "is this actually non-obvious" spot check (§12) — same review pass can likely cover both.
7. ✅ **Priority order confirmed**: (a) report-inaccurate button + logging schema, (b) existence + opening-hours grounding, before cross-model judging or a full observability stack. The budget-personalization prompt fix (§7 Q2) is cheap enough it could realistically jump the queue — flagging as a candidate for "do now, separately from the rest of this doc."
8. **New, from this round** — for the local-insider feature (§12): should it ship as part of the same grounding rollout, or as a fast-follow once the main candidate-pool pipeline is stable? It depends on relaxed existence-check logic that doesn't exist yet.
9. ✅ **Resolved: hide `seniorFriendlyScore`/`seniorScore` for now**, revisit once age-group (or similar relevant signal) is actually captured and the score can be tied to something real.

   **Code-verified finding backing this decision:** there is no defined rubric anywhere in the codebase for either version of this score. The LLM-generated per-itinerary score (`itineraries.ts:113`, JSON schema just says `"seniorFriendlyScore": number (1-10)`) has zero criteria passed to the model — no instruction on what should drive the number (walkability? seating? rest-stop frequency?). The hand-authored per-destination/attraction scores in `destinations.ts` loosely track terrain/accessibility language in their descriptions (e.g. "flat access with lifts" → 9, "hilly but tuk-tuks available" → 7.5) but that correlation is never written down as a rubric — it's informal author judgment, not reproducible. It's currently rendered to users in five places (destination cards, swipe cards, itinerary hero badge, saved-itinerary card, shared HTML export) as if it were an authoritative metric. Hiding it now is the safer call — an undefined number invites false trust, which is arguably worse than showing nothing. **When it comes back**, it should get an explicit rubric (candidate inputs once grounding lands: real terrain/step data, seating availability signals, accessibility flags from Place Details, actual walking distance) documented in the prompt or computed programmatically rather than left to the model's unstated judgment — and should probably become its own eval dimension (checking the score's stated rubric was actually followed) rather than an ungoverned free-floating number like it is today.

   Remaining open item: `isRestStop`/`seniorFriendlyNotes`-style fields still carry a persona-specific name even with the score hidden — worth a naming pass whenever the schema gets touched for the grounding work, but not urgent on its own.

---

*Next step once we've discussed this: turn the agreed-on dimensions into an actual test dataset + a first automated eval script (likely extending `scripts/src/test-generate-endpoint.ts` and `scripts/src/test-prompt.ts` rather than building parallel tooling), before touching the production prompt.*
