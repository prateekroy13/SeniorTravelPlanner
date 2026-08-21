// Run: node debug-delhi.mjs
// Shows what the Places API returns for Delhi before and after the type fix.
import "dotenv/config";

const MAPS_KEY = process.env.GOOGLE_MAPS_API_KEY;
const DELHI_LAT = 28.6139;
const DELHI_LNG = 77.2090;

const OLD_TYPES = [
  "tourist_attraction","museum","art_gallery","historical_landmark","cultural_landmark",
  "monument","castle","church","mosque","hindu_temple","synagogue",
  "national_park","park","beach","garden","botanical_garden","observation_deck","zoo","aquarium",
];

const NEW_TYPES = [
  "tourist_attraction","museum","art_gallery","historical_landmark","cultural_landmark",
  "monument","castle","national_park","park","beach","garden",
  "botanical_garden","observation_deck","zoo","aquarium",
];

async function nearbySearch(types, label) {
  const res = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": MAPS_KEY,
      "X-Goog-FieldMask": "places.id,places.displayName,places.rating,places.userRatingCount,places.types",
    },
    body: JSON.stringify({
      includedTypes: types,
      maxResultCount: 20,
      languageCode: "en",
      locationRestriction: {
        circle: { center: { latitude: DELHI_LAT, longitude: DELHI_LNG }, radius: 15000 },
      },
      rankPreference: "POPULARITY",
    }),
  });
  const data = await res.json();
  const places = data.places ?? [];
  console.log(`\n=== ${label} (${places.length} results) ===`);
  places.forEach((p, i) => {
    const types = (p.types ?? []).filter(t => !["point_of_interest","establishment","premise"].includes(t));
    const isReligious = types.some(t => ["hindu_temple","mosque","church","synagogue"].includes(t));
    console.log(`${i+1}. ${p.displayName?.text} — ⭐${p.rating} (${p.userRatingCount?.toLocaleString()} reviews)${isReligious ? " 🛕 RELIGIOUS" : ""}`);
    console.log(`   types: ${types.slice(0,4).join(", ")}`);
  });
  const religiousCount = places.filter(p => (p.types??[]).some(t => ["hindu_temple","mosque","church","synagogue"].includes(t))).length;
  console.log(`\n→ Religious sites: ${religiousCount}/${places.length}`);
  const targets = ["Red Fort","India Gate","Qutb Minar","Humayun","Lotus Temple","Akshardham"];
  const found = targets.filter(t => places.some(p => p.displayName?.text?.includes(t.split(" ")[0])));
  console.log(`→ Famous landmarks found: ${found.join(", ") || "NONE"}`);
}

await nearbySearch(OLD_TYPES, "OLD types (with hindu_temple/mosque/church/synagogue)");
await nearbySearch(NEW_TYPES, "NEW types (religious subtypes removed)");
