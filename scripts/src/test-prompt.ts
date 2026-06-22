/**
 * Prompt comparison test — itinerary generation
 *
 * Runs CURRENT and CANDIDATE system prompts against the same fixed payload
 * and prints a structured comparison so you can verify the difference.
 *
 * Run from project root:
 *   cd scripts && pnpm tsx src/test-prompt.ts
 *
 * Requires one of:
 *   AI_INTEGRATIONS_OPENAI_API_KEY   (Replit)
 *   OPENAI_API_KEY                   (local)
 *
 * Optional:
 *   AI_INTEGRATIONS_OPENAI_BASE_URL  (Replit proxy — defaults to OpenAI)
 */

const API_KEY =
  process.env.AI_INTEGRATIONS_OPENAI_API_KEY ?? process.env.OPENAI_API_KEY;
const BASE_URL =
  process.env.AI_INTEGRATIONS_OPENAI_BASE_URL ?? "https://api.openai.com";

if (!API_KEY) {
  console.error(
    "ERROR: Set AI_INTEGRATIONS_OPENAI_API_KEY or OPENAI_API_KEY before running."
  );
  process.exit(1);
}

// Endpoint differs by base: direct OpenAI is version-prefixed (/v1/...), while
// the Replit AI Integrations proxy base URL already includes the version, so it
// only needs /chat/completions. Detect direct OpenAI by host.
const IS_DIRECT_OPENAI = /(^|\.)api\.openai\.com$/i.test(
  (() => {
    try {
      return new URL(BASE_URL).hostname;
    } catch {
      return "";
    }
  })()
);
const COMPLETIONS_URL = `${BASE_URL}${IS_DIRECT_OPENAI ? "/v1" : ""}/chat/completions`;
console.log(
  `Base: ${BASE_URL}  (${IS_DIRECT_OPENAI ? "direct OpenAI" : "Replit AI proxy"})\nEndpoint: ${COMPLETIONS_URL}`
);

// ─── Fixed test payload ──────────────────────────────────────────────────────
// Using Rome, 2 days, moderate pace — small enough to be fast/cheap but rich
// enough to exercise the restaurant + attraction proximity logic.

const TEST_PAYLOAD = {
  city: "Rome",
  country: "Italy",
  days: 2,
  travelMonth: "October",
  preferences: {
    pace: "moderate",
    maxStepsPerDay: 6000,
    dietaryNeeds: ["gluten-free"],
    interests: ["history", "food"],
    budgetLevel: "mid",
    accessibilityNeeds: ["limited stairs"],
  },
  likedAttractions: ["Colosseum", "Pantheon", "Trastevere"],
  likedRestaurants: ["Da Enzo al 29", "Pizzarium"],
};

const USER_PROMPT = `Generate a ${TEST_PAYLOAD.days}-day itinerary for ${TEST_PAYLOAD.city}, ${TEST_PAYLOAD.country} in ${TEST_PAYLOAD.travelMonth}.

Traveler preferences:
- Pace: ${TEST_PAYLOAD.preferences.pace}
- Max steps per day: ${TEST_PAYLOAD.preferences.maxStepsPerDay}
- Dietary needs: ${TEST_PAYLOAD.preferences.dietaryNeeds.join(", ")}
- Interests: ${TEST_PAYLOAD.preferences.interests.join(", ")}
- Budget level: ${TEST_PAYLOAD.preferences.budgetLevel}
- Accessibility needs: ${TEST_PAYLOAD.preferences.accessibilityNeeds.join(", ")}

MUST INCLUDE these specific attractions the traveler loved: ${TEST_PAYLOAD.likedAttractions.join(", ")}. Spread them across appropriate days.
MUST INCLUDE these specific restaurants the traveler loved: ${TEST_PAYLOAD.likedRestaurants.join(", ")}. Schedule for lunch or dinner.

Return ONLY a valid JSON object (no markdown) matching the itinerary schema.`;

// ─── CURRENT system prompt (verbatim from itineraries.ts) ────────────────────

const CURRENT_SYSTEM_PROMPT = `You are a senior-first travel planner AI. Generate realistic travel itineraries for senior travelers (ages 60+).

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

IMPORTANT: Respond ONLY with valid, complete JSON. No markdown, no truncation.`;

// ─── CANDIDATE system prompt — proposed changes ───────────────────────────────
// Changes from current:
//  1. Attractions and restaurants are planned together as a unit: if a
//     restaurant is within 10 min walk of an attraction, it is scheduled
//     immediately after that attraction and flagged as "nearbyAttraction".
//  2. Restaurant open timings are verified in the plan — lunch restaurants
//     must be open 12:00-14:30, dinner 19:00-22:00. If a preferred restaurant
//     is closed at the planned time, it is moved to the next available slot.
//  3. Reservation requirement is surfaced per restaurant with a
//     "reservationRequired" boolean and "bookingAdvice" string (e.g.
//     "Book 2 weeks ahead on TheFork or call directly").
//  4. Each activity's "nearbyDining" field lists restaurants within 10 min
//     walk so the traveler can plan spontaneously.

const CANDIDATE_SYSTEM_PROMPT = `You are a senior-first travel planner AI. Generate realistic travel itineraries for senior travelers (ages 60+).

Key requirements:
- Pace activities for the specified preference (easy/moderate/active)
- Realistic step counts: easy 3000-5000, moderate 5000-8000, active 8000-12000
- Group nearby attractions on the same day to minimise travel
- Include real opening hours for each attraction
- State the best time to visit each place (fewest crowds, best light)
- Crowd level per attraction: "low" | "medium" | "high" (for the stated best time)
- 1-2 rest stops per half-day (cafes, parks)
- Public transport options with accessibility notes
- Budget estimates in local currency (mid-range realistic pricing)
- 1-2 nearby side trips per day
- Keep descriptions concise (max 80 words each)

Attraction + Restaurant co-planning (NEW — apply strictly):
- For EVERY activity, list restaurants within a 10-minute walk in a "nearbyDining" array (name + cuisine + walkMinutes).
- When scheduling a restaurant for lunch or dinner, prefer one that is physically close to the preceding or following attraction — this minimises walking for seniors.
- Verify restaurant operating hours: lunch slots must fall between 12:00–15:00, dinner slots between 19:00–22:30. If a preferred restaurant does not open in time, move it to the next viable meal slot or swap to a nearby alternative.
- For each restaurant include:
    - "openingHours": actual hours for that day (e.g. "12:00–15:00, 19:00–23:00, closed Mondays")
    - "reservationRequired": true | false
    - "bookingAdvice": practical string — how and how far in advance to book (e.g. "Book 2 weeks ahead via TheFork or call +39 06…"). Empty string if walk-in only.
    - "nearbyAttraction": closest attraction within 10 min walk (name only)
- If a liked restaurant is near a liked attraction, highlight this explicitly in both the activity description and the restaurant description (e.g. "2-min walk from the Pantheon").

IMPORTANT: Respond ONLY with valid, complete JSON. No markdown, no truncation.`;

// ─── Strict output schema (OpenAI structured outputs) ─────────────────────────
// Forces BOTH prompts to return an identical structure so the comparison is
// apples-to-apples. Because every field is required by the schema, the analyzer
// measures how richly each field is POPULATED rather than whether it merely
// exists.

const ITINERARY_SCHEMA = {
  name: "itinerary",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      days: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            day: { type: "integer" },
            activities: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  name: { type: "string" },
                  description: { type: "string" },
                  openingHours: { type: "string" },
                  bestTimeToVisit: { type: "string" },
                  crowdLevel: { type: "string", enum: ["low", "medium", "high"] },
                  nearbyDining: {
                    type: "array",
                    items: {
                      type: "object",
                      additionalProperties: false,
                      properties: {
                        name: { type: "string" },
                        cuisine: { type: "string" },
                        walkMinutes: { type: "integer" },
                      },
                      required: ["name", "cuisine", "walkMinutes"],
                    },
                  },
                },
                required: [
                  "name",
                  "description",
                  "openingHours",
                  "bestTimeToVisit",
                  "crowdLevel",
                  "nearbyDining",
                ],
              },
            },
            restaurants: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  name: { type: "string" },
                  cuisine: { type: "string" },
                  mealType: { type: "string", enum: ["lunch", "dinner"] },
                  openingHours: { type: "string" },
                  reservationRequired: { type: "boolean" },
                  bookingAdvice: { type: "string" },
                  nearbyAttraction: { type: "string" },
                },
                required: [
                  "name",
                  "cuisine",
                  "mealType",
                  "openingHours",
                  "reservationRequired",
                  "bookingAdvice",
                  "nearbyAttraction",
                ],
              },
            },
          },
          required: ["day", "activities", "restaurants"],
        },
      },
    },
    required: ["days"],
  },
};

// ─── OpenAI call helper ───────────────────────────────────────────────────────

async function callOpenAI(systemPrompt: string, label: string): Promise<any> {
  console.log(`\n⏳  Calling OpenAI [${label}] ...`);
  const start = Date.now();

  const response = await fetch(COMPLETIONS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      max_completion_tokens: 16000,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: USER_PROMPT },
      ],
      response_format: { type: "json_schema", json_schema: ITINERARY_SCHEMA },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI error [${response.status}]: ${err}`);
  }

  const data = (await response.json()) as any;
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty response from OpenAI");

  const parsed = JSON.parse(content);
  console.log(`✅  [${label}] done in ${elapsed}s`);
  return parsed;
}

// ─── Comparison analysis ──────────────────────────────────────────────────────

function analyseResult(label: string, itinerary: any) {
  // With structured outputs the schema is guaranteed: top-level "days", each
  // with "activities" and "restaurants". No more shape-guessing.
  const days: any[] = itinerary.days ?? [];

  const allActivities = days.flatMap((d: any) => d.activities ?? []);
  const allRestaurants = days.flatMap((d: any) => d.restaurants ?? []);

  // Schema forces every field to exist, so presence is meaningless. Measure how
  // richly each field is POPULATED — that's where CURRENT vs CANDIDATE diverges.
  const nonEmpty = (s: any) => typeof s === "string" && s.trim() !== "";

  const restWithOpeningHours = allRestaurants.filter((r: any) => nonEmpty(r.openingHours));
  const restWithBookingAdvice = allRestaurants.filter((r: any) => nonEmpty(r.bookingAdvice));
  const restWithNearbyAttraction = allRestaurants.filter((r: any) => nonEmpty(r.nearbyAttraction));
  const restReservationTrue = allRestaurants.filter((r: any) => r.reservationRequired === true);
  const actWithNearbyDining = allActivities.filter(
    (a: any) => Array.isArray(a.nearbyDining) && a.nearbyDining.length > 0
  );
  const totalNearbyDining = actWithNearbyDining.reduce(
    (sum: number, a: any) => sum + a.nearbyDining.length,
    0
  );

  const pct = (n: number, total: number) =>
    total === 0 ? "0%" : `${Math.round((n / total) * 100)}%`;

  const likedRestsIncluded = TEST_PAYLOAD.likedRestaurants.filter((lr) =>
    allRestaurants.some((r: any) => r.name?.toLowerCase().includes(lr.toLowerCase()))
  );

  const likedAttrsIncluded = TEST_PAYLOAD.likedAttractions.filter((la) =>
    allActivities.some((a: any) => a.name?.toLowerCase().includes(la.toLowerCase()))
  );

  console.log(`\n${"─".repeat(60)}`);
  console.log(`  RESULT: ${label}`);
  console.log(`${"─".repeat(60)}`);
  console.log(`  Days planned:              ${days.length}`);
  console.log(`  Total restaurants:         ${allRestaurants.length}`);
  console.log(`  Total activities:          ${allActivities.length}`);
  console.log(
    `  Liked attractions covered: ${likedAttrsIncluded.join(", ") || "none"} (${likedAttrsIncluded.length}/${TEST_PAYLOAD.likedAttractions.length})`
  );
  console.log(
    `  Liked restaurants covered: ${likedRestsIncluded.join(", ") || "none"} (${likedRestsIncluded.length}/${TEST_PAYLOAD.likedRestaurants.length})`
  );
  console.log(`\n  Field population (how richly each field is filled):`);
  console.log(
    `  • restaurant openingHours:    ${restWithOpeningHours.length}/${allRestaurants.length} (${pct(restWithOpeningHours.length, allRestaurants.length)})`
  );
  console.log(
    `  • bookingAdvice populated:    ${restWithBookingAdvice.length}/${allRestaurants.length} (${pct(restWithBookingAdvice.length, allRestaurants.length)})`
  );
  console.log(
    `  • nearbyAttraction populated: ${restWithNearbyAttraction.length}/${allRestaurants.length} (${pct(restWithNearbyAttraction.length, allRestaurants.length)})`
  );
  console.log(
    `  • reservationRequired = true: ${restReservationTrue.length}/${allRestaurants.length}`
  );
  console.log(
    `  • activities w/ nearbyDining: ${actWithNearbyDining.length}/${allActivities.length} (${pct(actWithNearbyDining.length, allActivities.length)})  —  ${totalNearbyDining} dining suggestions total`
  );

  // Print a sample day-1 restaurant for manual review
  const sampleRest = allRestaurants[0];
  if (sampleRest) {
    console.log(`\n  Sample restaurant (Day 1, slot 0):`);
    console.log(`    Name:                ${sampleRest.name}`);
    console.log(`    openingHours:        ${sampleRest.openingHours ?? "—"}`);
    console.log(
      `    reservationRequired: ${sampleRest.reservationRequired ?? "—"}`
    );
    console.log(`    bookingAdvice:       ${sampleRest.bookingAdvice ?? "—"}`);
    console.log(`    nearbyAttraction:    ${sampleRest.nearbyAttraction ?? "—"}`);
  }

  // Print a sample activity with nearbyDining
  const sampleWithDining = allActivities.find(
    (a: any) => a.nearbyDining?.length > 0
  );
  if (sampleWithDining) {
    console.log(`\n  Sample activity with nearbyDining:`);
    console.log(`    Activity: ${sampleWithDining.name}`);
    sampleWithDining.nearbyDining.slice(0, 2).forEach((d: any) => {
      console.log(
        `      → ${d.name} (${d.cuisine}, ${d.walkMinutes ?? "?"} min walk)`
      );
    });
  }

  return {
    "Days planned": `${days.length}`,
    "Total restaurants": `${allRestaurants.length}`,
    "Total activities": `${allActivities.length}`,
    "Liked attractions covered": `${likedAttrsIncluded.length}/${TEST_PAYLOAD.likedAttractions.length}`,
    "Liked restaurants covered": `${likedRestsIncluded.length}/${TEST_PAYLOAD.likedRestaurants.length}`,
    "Restaurant openingHours": `${restWithOpeningHours.length}/${allRestaurants.length} (${pct(restWithOpeningHours.length, allRestaurants.length)})`,
    "bookingAdvice populated": `${restWithBookingAdvice.length}/${allRestaurants.length} (${pct(restWithBookingAdvice.length, allRestaurants.length)})`,
    "nearbyAttraction populated": `${restWithNearbyAttraction.length}/${allRestaurants.length} (${pct(restWithNearbyAttraction.length, allRestaurants.length)})`,
    "reservationRequired = true": `${restReservationTrue.length}/${allRestaurants.length}`,
    "Activities w/ nearbyDining": `${actWithNearbyDining.length}/${allActivities.length} (${pct(actWithNearbyDining.length, allActivities.length)})`,
    "Dining suggestions (total)": `${totalNearbyDining}`,
  };
}

type Metrics = Record<string, string>;

// ─── Side-by-side comparison table ────────────────────────────────────────────

function printComparisonTable(current: Metrics, candidate: Metrics) {
  const rows = Object.keys(current).map((metric) => ({
    metric,
    current: current[metric],
    candidate: candidate[metric] ?? "—",
  }));

  const cMetric = Math.max(6, ...rows.map((r) => r.metric.length));
  const cCur = Math.max(7, ...rows.map((r) => r.current.length));
  const cCand = Math.max(9, ...rows.map((r) => r.candidate.length));

  const pad = (s: string, w: number) => s.padEnd(w);
  const line = (l: string, m: string, r: string, fill: string) =>
    `${l}${fill.repeat(cMetric + 2)}${m}${fill.repeat(cCur + 2)}${m}${fill.repeat(cCand + 2)}${r}`;

  console.log(`\n${"═".repeat(60)}`);
  console.log("  COMPARISON TABLE");
  console.log("═".repeat(60));
  console.log(line("┌", "┬", "┐", "─"));
  console.log(
    `│ ${pad("Metric", cMetric)} │ ${pad("CURRENT", cCur)} │ ${pad("CANDIDATE", cCand)} │`
  );
  console.log(line("├", "┼", "┤", "─"));
  for (const r of rows) {
    console.log(
      `│ ${pad(r.metric, cMetric)} │ ${pad(r.current, cCur)} │ ${pad(r.candidate, cCand)} │`
    );
  }
  console.log(line("└", "┴", "┘", "─"));
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("═".repeat(60));
  console.log("  ITINERARY PROMPT COMPARISON TEST");
  console.log(`  City: ${TEST_PAYLOAD.city}, ${TEST_PAYLOAD.days} days, ${TEST_PAYLOAD.travelMonth}`);
  console.log("═".repeat(60));

  const [currentResult, candidateResult] = await Promise.all([
    callOpenAI(CURRENT_SYSTEM_PROMPT, "CURRENT"),
    callOpenAI(CANDIDATE_SYSTEM_PROMPT, "CANDIDATE"),
  ]);

  const currentMetrics = analyseResult("CURRENT", currentResult);
  const candidateMetrics = analyseResult("CANDIDATE", candidateResult);

  printComparisonTable(currentMetrics, candidateMetrics);

  // Write raw JSON outputs for manual inspection
  const fs = await import("fs");
  fs.writeFileSync(
    "test-output-current.json",
    JSON.stringify(currentResult, null, 2)
  );
  fs.writeFileSync(
    "test-output-candidate.json",
    JSON.stringify(candidateResult, null, 2)
  );

  console.log(`\n${"═".repeat(60)}`);
  console.log("  Full JSON outputs written to:");
  console.log("    scripts/test-output-current.json");
  console.log("    scripts/test-output-candidate.json");
  console.log("═".repeat(60));
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
