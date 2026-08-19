/**
 * End-to-end contract test for POST /api/itineraries/generate.
 *
 * Calls the LIVE api-server route (through the shared proxy on localhost:80)
 * and validates the actual OpenAI response shape against the generated Zod
 * schemas from the OpenAPI spec (@workspace/api-zod). This catches schema
 * drift between the AI structured-output schema, the OpenAPI contract, and
 * what the mobile app consumes (dayPlans → morning/afternoon/evening).
 */
import {
  GenerateItineraryBody,
  GenerateItineraryResponse,
} from "@workspace/api-zod";

const BASE = process.env.API_BASE ?? "http://localhost:80";

const payload = {
  city: "Rome",
  country: "Italy",
  days: 3,
  travelMonth: "October",
  likedAttractions: ["Colosseum", "Pantheon"],
  preferences: {
    pace: "moderate" as const,
    maxStepsPerDay: 7000,
    dietaryNeeds: ["vegetarian"],
    interests: ["history", "food"],
    budgetLevel: "mid" as const,
    accessibilityNeeds: [],
  },
};

function fail(msg: string): never {
  console.error(`\n❌ FAIL: ${msg}`);
  process.exit(1);
}

async function main() {
  // 1. Validate our request body against the contract first
  const bodyCheck = GenerateItineraryBody.safeParse(payload);
  if (!bodyCheck.success) {
    fail(`Test payload violates GenerateItineraryBody:\n${bodyCheck.error}`);
  }
  // Ensure nothing we send falls outside the contract (zod strips unknown keys)
  const dropped = Object.keys(payload).filter(
    (k) => !(k in (bodyCheck.data as Record<string, unknown>))
  );
  if (dropped.length) {
    fail(`Payload contains out-of-contract fields: ${dropped.join(", ")}`);
  }
  console.log("✔ Request payload conforms to GenerateItineraryBody");

  console.log(`⏳ POST ${BASE}/api/itineraries/generate (may take 30–90s)...`);
  const started = Date.now();
  const res = await fetch(`${BASE}/api/itineraries/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // POST the contract-validated body, not the raw payload
    body: JSON.stringify(bodyCheck.data),
  });
  const secs = ((Date.now() - started) / 1000).toFixed(1);

  if (!res.ok) {
    fail(`HTTP ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  console.log(`✔ HTTP 200 in ${secs}s`);

  // 2. Validate the response against the generated contract schema
  const parsed = GenerateItineraryResponse.safeParse(data);
  if (!parsed.success) {
    console.error(JSON.stringify(parsed.error.issues.slice(0, 20), null, 2));
    fail("Response does NOT conform to GenerateItineraryResponse (schema drift!)");
  }
  console.log("✔ Response conforms to GenerateItineraryResponse (no drift)");

  // 3. Semantic sanity checks the schema can't express
  const it = parsed.data;
  const problems: string[] = [];
  if (it.dayPlans.length !== payload.days)
    problems.push(`dayPlans.length=${it.dayPlans.length}, expected ${payload.days}`);
  for (const day of it.dayPlans) {
    const acts = [...day.morning, ...day.afternoon, ...day.evening];
    if (acts.length === 0) problems.push(`Day ${day.dayNumber} has no activities`);
    if (day.restaurants.length === 0) problems.push(`Day ${day.dayNumber} has no restaurants`);
    for (const a of acts) {
      if (!a.name?.trim()) problems.push(`Day ${day.dayNumber}: activity with empty name`);
    }
  }
  if (problems.length) {
    problems.forEach((p) => console.error(`  ✗ ${p}`));
    fail("Semantic checks failed");
  }
  console.log("✔ Semantic checks passed (days, activities, restaurants)");

  // Liked attractions MUST appear in the itinerary — the system prompt instructs this explicitly
  const allNames = it.dayPlans
    .flatMap((d) => [...d.morning, ...d.afternoon, ...d.evening])
    .map((a) => a.name.toLowerCase());
  for (const liked of payload.likedAttractions) {
    if (!allNames.some((n) => n.includes(liked.toLowerCase())))
      problems.push(`liked attraction "${liked}" not found anywhere in the itinerary`);
  }
  if (problems.length) {
    problems.forEach((p) => console.error(`  ✗ ${p}`));
    fail("Liked attractions check failed");
  }
  console.log("✔ Liked attractions present in itinerary");

  console.log("\n── Summary ─────────────────────────────");
  console.log(`  Title:        ${it.title}`);
  console.log(`  Days:         ${it.dayPlans.length}`);
  console.log(
    `  Activities:   ${it.dayPlans.reduce((s, d) => s + d.morning.length + d.afternoon.length + d.evening.length, 0)}`
  );
  console.log(`  Restaurants:  ${it.dayPlans.reduce((s, d) => s + d.restaurants.length, 0)}`);
  console.log(`  Senior score: ${it.seniorFriendlyScore}/10`);
  console.log("\n✅ PASS — endpoint response matches the API contract");
}

main().catch((e) => fail(String(e)));
