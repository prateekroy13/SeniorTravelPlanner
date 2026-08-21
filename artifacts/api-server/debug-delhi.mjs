// node debug-delhi.mjs
// Full audit: shows every filter step and why targets are missing.
import { readFileSync } from "fs";
import { resolve } from "path";
try {
  const env = readFileSync(resolve(process.cwd(), ".env"), "utf8");
  for (const line of env.split("\n")) {
    const [k, ...v] = line.split("=");
    if (k && v.length) process.env[k.trim()] = v.join("=").trim();
  }
} catch {}

const KEY = process.env.GOOGLE_MAPS_API_KEY;
const LAT = 28.6139, LNG = 77.2090;

const ATTRACTION_TYPES = [
  "tourist_attraction","museum","art_gallery","historical_landmark","cultural_landmark",
  "monument","castle","national_park","park","beach","garden",
  "botanical_garden","observation_deck","zoo","aquarium",
];
const RELIGIOUS_TYPES = ["hindu_temple","mosque","church","synagogue"];
const TARGETS = ["Lotus Temple","Akshardham","Red Fort","India Gate","Qutb Minar","Humayun","Jama Masjid","Raj Ghat"];

async function search(types, label, radius = 15000) {
  const res = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": KEY,
      "X-Goog-FieldMask": "places.id,places.displayName,places.rating,places.userRatingCount,places.types,places.location",
    },
    body: JSON.stringify({
      includedTypes: types, maxResultCount: 20, languageCode: "en",
      locationRestriction: { circle: { center: { latitude: LAT, longitude: LNG }, radius } },
      rankPreference: "POPULARITY",
    }),
  });
  const data = await res.json();
  if (data.error) { console.error(`${label} API error:`, data.error.message); return []; }
  return data.places ?? [];
}

function tag(p) {
  return (p.types ?? []).filter(t => !["point_of_interest","establishment","premise","food"].includes(t)).join(", ");
}
function isTarget(p) { return TARGETS.some(t => p.displayName?.text?.includes(t.split(" ")[0])); }

const [touristOnly, broadTypes, religiousTypes] = await Promise.all([
  search(["tourist_attraction"], "tourist_attraction ONLY"),
  search(ATTRACTION_TYPES, "BROAD TYPES"),
  search(RELIGIOUS_TYPES, "RELIGIOUS TYPES"),
]);

console.log("\n══ SEARCH 1: tourist_attraction ONLY (20 results) ══");
touristOnly.forEach((p, i) => {
  const hit = isTarget(p) ? " ← TARGET" : "";
  console.log(`${i+1}. ${p.displayName?.text} ⭐${p.rating} (${p.userRatingCount?.toLocaleString()})${hit}`);
});

console.log("\n══ SEARCH 2: BROAD TYPES (20 results) ══");
broadTypes.forEach((p, i) => {
  const hit = isTarget(p) ? " ← TARGET" : "";
  console.log(`${i+1}. ${p.displayName?.text} ⭐${p.rating} (${p.userRatingCount?.toLocaleString()})${hit}`);
});

console.log("\n══ SEARCH 3: RELIGIOUS TYPES (20 results) ══");
religiousTypes.forEach((p, i) => {
  const hit = isTarget(p) ? " ← TARGET" : "";
  console.log(`${i+1}. ${p.displayName?.text} ⭐${p.rating} (${p.userRatingCount?.toLocaleString()}) [${tag(p)}]${hit}`);
});

// Find where each target appears
console.log("\n══ TARGET TRACKER ══");
for (const t of TARGETS) {
  const inS1 = touristOnly.find(p => p.displayName?.text?.includes(t.split(" ")[0]));
  const inS2 = broadTypes.find(p => p.displayName?.text?.includes(t.split(" ")[0]));
  const inS3 = religiousTypes.find(p => p.displayName?.text?.includes(t.split(" ")[0]));
  const found = inS1 || inS2 || inS3;
  if (!found) {
    console.log(`❌ ${t} — NOT RETURNED by any search`);
  } else {
    const where = [inS1 && "tourist_only", inS2 && "broad", inS3 && "religious"].filter(Boolean).join(", ");
    const reviews = (inS1 || inS2 || inS3).userRatingCount;
    console.log(`✅ ${t} — found in [${where}] — ${reviews?.toLocaleString()} reviews`);
    console.log(`   types: ${tag(inS1 || inS2 || inS3)}`);
  }
}

// Merge simulation with 10k + 50k-religious filter
const seen = new Set();
const merged = [];
for (const p of [...touristOnly, ...broadTypes, ...religiousTypes]) {
  if (p.id && !seen.has(p.id)) { seen.add(p.id); merged.push(p); }
}

const RELIGIOUS_SET = new Set(RELIGIOUS_TYPES);
const CULTURAL_SET = new Set(["tourist_attraction","historical_landmark","cultural_landmark"]);
const EXCLUDE_SET = new Set([
  "market","shopping_mall","store","supermarket","convenience_store",
  "clothing_store","department_store","grocery_store",
  "restaurant","cafe","bar","night_club",
  "convention_center","event_venue","conference_center","lodging","hotel",
]);

const final20 = merged
  .filter(p => {
    if ((p.userRatingCount ?? 0) < 10000) return false;
    if ((p.rating ?? 0) < 4.3) return false;
    if ((p.types ?? []).some(t => EXCLUDE_SET.has(t))) return false;
    const rel = (p.types ?? []).some(t => RELIGIOUS_SET.has(t));
    const cult = (p.types ?? []).some(t => CULTURAL_SET.has(t));
    if (rel && !cult && (p.userRatingCount ?? 0) < 50000) return false;
    return true;
  })
  .sort((a, b) => (b.userRatingCount ?? 0) - (a.userRatingCount ?? 0))
  .slice(0, 20);

console.log(`\n══ FINAL 20 (merged, filtered, sorted) ══`);
final20.forEach((p, i) => {
  const hit = isTarget(p) ? " ← TARGET" : "";
  console.log(`${i+1}. ${p.displayName?.text} ⭐${p.rating} (${p.userRatingCount?.toLocaleString()})${hit}`);
});

const missing = TARGETS.filter(t => !final20.some(p => p.displayName?.text?.includes(t.split(" ")[0])));
console.log(missing.length ? `\n⚠️  STILL MISSING: ${missing.join(", ")}` : "\n✅ All targets in final 20");
