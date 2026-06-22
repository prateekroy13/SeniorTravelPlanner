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

// ─── OpenAI call helper ───────────────────────────────────────────────────────

async function callOpenAI(systemPrompt: string, label: string): Promise<any> {
  console.log(`\n⏳  Calling OpenAI [${label}] ...`);
  const start = Date.now();

  const response = await fetch(`${BASE_URL}/v1/chat/completions`, {
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
      response_format: { type: "json_object" },
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
  const days: any[] = itinerary.dayPlans ?? [];

  const allRestaurants = days.flatMap((d: any) => d.restaurants ?? []);
  const allActivities = days.flatMap((d: any) => [
    ...(d.morning ?? []),
    ...(d.afternoon ?? []),
    ...(d.evening ?? []),
  ]);

  const hasReservationField = allRestaurants.some(
    (r: any) => "reservationRequired" in r
  );
  const hasBookingAdvice = allRestaurants.some(
    (r: any) => r.bookingAdvice !== undefined
  );
  const hasOpeningHours = allRestaurants.some(
    (r: any) => r.openingHours !== undefined
  );
  const hasNearbyDining = allActivities.some(
    (a: any) => Array.isArray(a.nearbyDining) && a.nearbyDining.length > 0
  );
  const hasNearbyAttractionHighlight = allRestaurants.some(
    (r: any) => r.nearbyAttraction && r.nearbyAttraction.trim() !== ""
  );

  const likedRestsIncluded = TEST_PAYLOAD.likedRestaurants.filter((lr) =>
    allRestaurants.some((r: any) =>
      r.name?.toLowerCase().includes(lr.toLowerCase())
    )
  );

  const likedAttrsIncluded = TEST_PAYLOAD.likedAttractions.filter((la) =>
    allActivities.some((a: any) =>
      a.name?.toLowerCase().includes(la.toLowerCase())
    )
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
  console.log(`\n  New fields check:`);
  console.log(
    `  ✔ reservationRequired field:    ${hasReservationField ? "YES" : "NO ✗"}`
  );
  console.log(
    `  ✔ bookingAdvice field:          ${hasBookingAdvice ? "YES" : "NO ✗"}`
  );
  console.log(
    `  ✔ restaurant openingHours:      ${hasOpeningHours ? "YES" : "NO ✗"}`
  );
  console.log(
    `  ✔ nearbyDining on activities:   ${hasNearbyDining ? "YES" : "NO ✗"}`
  );
  console.log(
    `  ✔ nearbyAttraction highlights:  ${hasNearbyAttractionHighlight ? "YES" : "NO ✗"}`
  );

  // Print a sample day-1 restaurant for manual review
  const sampleRest = days[0]?.restaurants?.[0];
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

  analyseResult("CURRENT", currentResult);
  analyseResult("CANDIDATE", candidateResult);

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
