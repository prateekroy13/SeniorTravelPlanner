/**
 * Vienna hidden-gems diagnostic.
 * Run on Replit: node debug-vienna.mjs
 * Needs: GOOGLE_MAPS_API_KEY in env.
 *
 * Traces every step of the getCityPlaces pipeline for Vienna:
 *  1. Offset centres (geometry)
 *  2. Raw API responses per direction
 *  3. Where Melk appears (or doesn't) in each batch
 *  4. Filter elimination reason for every candidate
 */

const MAPS_KEY = process.env.GOOGLE_MAPS_API_KEY;
if (!MAPS_KEY) { console.error("GOOGLE_MAPS_API_KEY not set"); process.exit(1); }

// ── Known targets ──────────────────────────────────────────────────────────
const VIENNA    = { lat: 48.2082, lng: 16.3738, label: "Vienna" };
const MELK      = { lat: 48.2279, lng: 15.3316, label: "Melk Abbey" };
const HALLSTATT = { lat: 47.5622, lng: 13.6493, label: "Hallstatt" };
const KLOSTERN  = { lat: 48.3040, lng: 16.3252, label: "Klosterneuburg" };
const TARGETS   = [MELK, HALLSTATT, KLOSTERN];

// ── Types (mirrors places.ts) ───────────────────────────────────────────────
const DAY_TRIP_TYPES = [
  "tourist_attraction", "historical_landmark", "cultural_landmark",
  "castle", "church", "national_park", "museum",
];
const LOCAL_TYPES = new Set([
  "park", "garden", "botanical_garden", "observation_deck",
  "beach", "zoo", "aquarium", "amusement_park", "campground",
]);

// ── Geometry ────────────────────────────────────────────────────────────────
function offsetCoords(lat, lng, bearingDeg, distKm) {
  const R = 6371, d = distKm / R, b = (bearingDeg * Math.PI) / 180;
  const lat1 = (lat * Math.PI) / 180, lng1 = (lng * Math.PI) / 180;
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(b));
  const lng2 = lng1 + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));
  return { lat: (lat2 * 180) / Math.PI, lng: (lng2 * 180) / Math.PI };
}

function distKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos((lat1*Math.PI)/180) * Math.cos((lat2*Math.PI)/180) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// ── API call ─────────────────────────────────────────────────────────────────
async function nearbySearch(lat, lng, radiusMeters, maxCount, types, rankBy) {
  const res = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": MAPS_KEY,
      "X-Goog-FieldMask": "places.id,places.displayName,places.rating,places.userRatingCount,places.location,places.formattedAddress,places.types",
    },
    body: JSON.stringify({
      includedTypes: types,
      maxResultCount: maxCount,
      languageCode: "en",
      locationRestriction: { circle: { center: { latitude: lat, longitude: lng }, radius: radiusMeters } },
      rankPreference: rankBy,
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    console.error(`  API ERROR ${res.status}: ${txt}`);
    return [];
  }
  const data = await res.json();
  return data.places ?? [];
}

// ── Filter logic (mirrors places.ts) ─────────────────────────────────────────
function filterReason(p, mainIds, viennaLat, viennaLng) {
  if (!p.displayName?.text || !p.rating || !p.userRatingCount) return "missing-data";
  if (mainIds.has(p.id)) return "in-main-pool";
  if (p.userRatingCount < 5000) return `low-reviews(${p.userRatingCount})`;
  if (p.rating < 4.3) return `low-rating(${p.rating})`;
  const d = distKm(viennaLat, viennaLng, p.location.latitude, p.location.longitude);
  if (d < 35) return `too-close(${d.toFixed(1)}km)`;
  const types = p.types ?? [];
  const localHit = types.find((t) => LOCAL_TYPES.has(t));
  if (localHit) return `local-type(${localHit})`;
  return "PASS";
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const OFFSET_KM = 60;
  const RADIUS_M  = 40_000;
  const bearings  = [
    { deg: 0,   dir: "N"  },
    { deg: 45,  dir: "NE" },
    { deg: 90,  dir: "E"  },
    { deg: 135, dir: "SE" },
    { deg: 180, dir: "S"  },
    { deg: 225, dir: "SW" },
    { deg: 270, dir: "W"  },
    { deg: 315, dir: "NW" },
  ];

  console.log("═══════════════════════════════════════════════════════════════");
  console.log(" VIENNA HIDDEN GEMS DIAGNOSTIC");
  console.log("═══════════════════════════════════════════════════════════════\n");

  // ── Section 0: Geometry check for known targets ───────────────────────────
  console.log("── 0. GEOMETRY: known targets vs. offset centres ───────────────");
  for (const t of TARGETS) {
    const dFromVienna = distKm(VIENNA.lat, VIENNA.lng, t.lat, t.lng);
    console.log(`  ${t.label}: ${dFromVienna.toFixed(1)} km from Vienna center`);
    let closest = null, closestDist = Infinity;
    for (const b of bearings) {
      const off = offsetCoords(VIENNA.lat, VIENNA.lng, b.deg, OFFSET_KM);
      const d = distKm(off.lat, off.lng, t.lat, t.lng);
      if (d < closestDist) { closestDist = d; closest = b.dir; }
    }
    const inRadius = closestDist <= RADIUS_M / 1000;
    console.log(`    → closest offset: ${closest} (${closestDist.toFixed(1)} km from offset centre) ${inRadius ? "✅ in radius" : "❌ OUTSIDE 40km radius"}`);
    // Check all offsets
    for (const b of bearings) {
      const off = offsetCoords(VIENNA.lat, VIENNA.lng, b.deg, OFFSET_KM);
      const d = distKm(off.lat, off.lng, t.lat, t.lng);
      if (d <= RADIUS_M / 1000) {
        console.log(`    → also in: ${b.dir} offset (${d.toFixed(1)} km)`);
      }
    }
  }
  console.log();

  // ── Section 1: Main pool (to build exclusion set) ─────────────────────────
  console.log("── 1. MAIN POOL (15km radius, POPULARITY) ──────────────────────");
  const mainRaw = await nearbySearch(VIENNA.lat, VIENNA.lng, 15_000, 20, DAY_TRIP_TYPES, "POPULARITY");
  const mainIds = new Set(mainRaw.map((p) => p.id));
  console.log(`  ${mainRaw.length} places returned. IDs logged for dedup.\n`);

  // ── Section 2: Per-direction outer searches ────────────────────────────────
  const allRaw = [];
  const seenIds = new Set();

  for (const b of bearings) {
    const off = offsetCoords(VIENNA.lat, VIENNA.lng, b.deg, OFFSET_KM);
    console.log(`── 2.${b.dir} OFFSET (bearing ${b.deg}°) — centre: ${off.lat.toFixed(4)}, ${off.lng.toFixed(4)} ─`);

    const places = await nearbySearch(off.lat, off.lng, RADIUS_M, 20, DAY_TRIP_TYPES, "POPULARITY");
    console.log(`  ${places.length} places returned (rank by POPULARITY)`);

    // Check for known targets in this batch
    for (const t of TARGETS) {
      const hit = places.find((p) => {
        if (!p.location) return false;
        return distKm(p.location.latitude, p.location.longitude, t.lat, t.lng) < 3;
      });
      if (hit) {
        const dFromOff = distKm(off.lat, off.lng, hit.location.latitude, hit.location.longitude);
        const dFromVienna = distKm(VIENNA.lat, VIENNA.lng, hit.location.latitude, hit.location.longitude);
        const rank = places.indexOf(hit) + 1;
        const reason = filterReason(hit, mainIds, VIENNA.lat, VIENNA.lng);
        console.log(`  🎯 FOUND ${t.label}!`);
        console.log(`     Rank #${rank} in this batch`);
        console.log(`     ${dFromOff.toFixed(1)} km from offset centre`);
        console.log(`     ${dFromVienna.toFixed(1)} km from Vienna centre`);
        console.log(`     Rating: ${hit.rating} (${hit.userRatingCount} reviews)`);
        console.log(`     Types: ${(hit.types ?? []).join(", ")}`);
        console.log(`     Filter verdict: ${reason}`);
      } else {
        console.log(`  ✗ ${t.label} NOT in this batch`);
      }
    }

    // Print top-5 results with distances
    console.log(`  Top ${Math.min(5, places.length)} results:`);
    for (let i = 0; i < Math.min(5, places.length); i++) {
      const p = places[i];
      if (!p.location) continue;
      const dFromOff = distKm(off.lat, off.lng, p.location.latitude, p.location.longitude);
      const dFromVienna = distKm(VIENNA.lat, VIENNA.lng, p.location.latitude, p.location.longitude);
      const reason = filterReason(p, mainIds, VIENNA.lat, VIENNA.lng);
      const name = p.displayName?.text ?? "?";
      console.log(`    #${i+1} ${name} | ${dFromOff.toFixed(1)}km from offset | ${dFromVienna.toFixed(1)}km from Vienna | ${reason}`);
    }

    // Also print last-2 (tail of DISTANCE sort — furthest returned)
    if (places.length > 5) {
      console.log(`  Last 2 results (furthest from offset):`);
      for (let i = Math.max(5, places.length - 2); i < places.length; i++) {
        const p = places[i];
        if (!p.location) continue;
        const dFromOff = distKm(off.lat, off.lng, p.location.latitude, p.location.longitude);
        const dFromVienna = distKm(VIENNA.lat, VIENNA.lng, p.location.latitude, p.location.longitude);
        const reason = filterReason(p, mainIds, VIENNA.lat, VIENNA.lng);
        console.log(`    #${i+1} ${p.displayName?.text ?? "?"} | ${dFromOff.toFixed(1)}km from offset | ${dFromVienna.toFixed(1)}km from Vienna | ${reason}`);
      }
    }

    // Accumulate for global dedup
    for (const p of places) {
      if (p.id && !seenIds.has(p.id)) {
        seenIds.add(p.id);
        allRaw.push(p);
      }
    }
    console.log();
  }

  // ── Section 3: Full filter pipeline on merged results ─────────────────────
  console.log("── 3. MERGED + FULL FILTER PIPELINE ────────────────────────────");
  console.log(`  Total unique candidates: ${allRaw.length}`);

  const filterCounts = {};
  const passed = [];

  for (const p of allRaw) {
    const reason = filterReason(p, mainIds, VIENNA.lat, VIENNA.lng);
    filterCounts[reason] = (filterCounts[reason] ?? 0) + 1;
    if (reason === "PASS") passed.push(p);
  }

  console.log("  Elimination reasons:");
  for (const [reason, count] of Object.entries(filterCounts).sort((a,b) => b[1]-a[1])) {
    console.log(`    ${reason}: ${count}`);
  }

  console.log(`\n  PASSED all filters: ${passed.length}`);
  for (const p of passed) {
    const d = distKm(VIENNA.lat, VIENNA.lng, p.location.latitude, p.location.longitude);
    console.log(`    ✅ ${p.displayName?.text} — ${p.rating}★ (${p.userRatingCount} reviews) — ${d.toFixed(1)} km`);
  }

  // ── Section 4: Summary ─────────────────────────────────────────────────────
  console.log("\n── 4. WHAT WOULD BE STORED ──────────────────────────────────────");
  const sorted = passed.sort((a,b) => b.rating - a.rating || b.userRatingCount - a.userRatingCount).slice(0, 8);
  sorted.forEach((p, i) => {
    const d = distKm(VIENNA.lat, VIENNA.lng, p.location.latitude, p.location.longitude);
    console.log(`  ${i+1}. ${p.displayName?.text} — ${p.rating}★ (${p.userRatingCount} reviews) — ${d.toFixed(1)} km`);
    console.log(`     Types: ${(p.types ?? []).join(", ")}`);
  });
  if (sorted.length === 0) console.log("  (nothing passes — hidden gems pool would be empty)");
}

main().catch(console.error);
