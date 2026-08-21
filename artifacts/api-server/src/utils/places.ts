import { db, cityPlacesCacheTable } from "@workspace/db";
import type { CachedPlace } from "@workspace/db";
import { and, eq, gt } from "drizzle-orm";

const MAPS_KEY = process.env.GOOGLE_MAPS_API_KEY;

// Used for the 15km main pool — broad, covers city-centre attractions of all kinds.
const ATTRACTION_TYPES = [
  "tourist_attraction",
  "museum",
  "art_gallery",
  "historical_landmark",
  "cultural_landmark",
  "monument",
  "castle",
  "church",
  "mosque",
  "hindu_temple",
  "synagogue",
  "national_park",
  "park",
  "beach",
  "garden",
  "botanical_garden",
  "observation_deck",
  "zoo",
  "aquarium",
];

// Used for the outer-ring day-trip searches.
// Deliberately narrow: only types that produce standalone destination landmarks
// (abbeys, castles, cathedrals, national parks, iconic museums) that justify
// travelling to a different town for the day.
// Excluded intentionally: park, garden, beach, observation_deck, zoo, aquarium,
// art_gallery, monument, mosque, hindu_temple, synagogue — these are overwhelmingly
// local attractions, not day-trip destinations.
const DAY_TRIP_TYPES = [
  "tourist_attraction",
  "historical_landmark",
  "cultural_landmark",
  "castle",
  "church",
  "national_park",
  "museum",
];

const CITY_TYPES = new Set([
  "locality",
  "administrative_area_level_1",
  "administrative_area_level_2",
  "sublocality",
  "colloquial_area",
  "natural_feature",
  "archipelago",
]);

// Validates city and returns its coordinates in a single geocode call.
// Returns { lat, lng } for valid cities, null for invalid cities or network errors.
// null means "skip Places grounding, don't block generation".
export async function geocodeCityCoords(
  city: string,
  country: string
): Promise<{ lat: number; lng: number } | null> {
  if (!MAPS_KEY) return null;
  try {
    const url =
      `https://maps.googleapis.com/maps/api/geocode/json` +
      `?address=${encodeURIComponent(`${city}, ${country}`)}` +
      `&key=${MAPS_KEY}`;
    const r = await fetch(url);
    const data = (await r.json()) as any;
    if (data.status !== "OK" || !data.results?.length) return null;
    const types: string[] = data.results[0]?.types ?? [];
    if (!types.some((t) => CITY_TYPES.has(t))) return null;
    const loc = data.results[0]?.geometry?.location;
    if (!loc) return null;
    return { lat: loc.lat, lng: loc.lng };
  } catch {
    return null; // network error — fail open
  }
}

async function nearbySearch(
  lat: number,
  lng: number,
  radiusMeters: number,
  maxCount: number,
  types: string[] = ATTRACTION_TYPES,
  rankBy: "POPULARITY" | "DISTANCE" = "POPULARITY"
): Promise<any[]> {
  if (!MAPS_KEY) return [];
  try {
    const res = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": MAPS_KEY,
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.rating,places.userRatingCount," +
          "places.location,places.formattedAddress,places.types,places.regularOpeningHours",
      },
      body: JSON.stringify({
        includedTypes: types,
        maxResultCount: maxCount,
        languageCode: "en",
        locationRestriction: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: radiusMeters,
          },
        },
        rankPreference: rankBy,
      }),
    });
    if (!res.ok) {
      console.error("Places Nearby Search error:", res.status, await res.text());
      return [];
    }
    const data = (await res.json()) as any;
    return data.places ?? [];
  } catch (e) {
    console.error("Places Nearby Search exception:", e);
    return [];
  }
}

function normalizePlaces(raw: any[]): CachedPlace[] {
  return raw
    .filter((p) => p.displayName?.text && p.rating && p.userRatingCount)
    .map((p) => ({
      placeId: p.id ?? "",
      name: (p.displayName?.text ?? "") as string,
      rating: Number(p.rating),
      userRatingCount: Number(p.userRatingCount),
      lat: p.location?.latitude ?? 0,
      lng: p.location?.longitude ?? 0,
      formattedAddress: (p.formattedAddress ?? "") as string,
      types: (p.types ?? []) as string[],
      // Compact hours: Mon–Fri line is enough context for the LLM
      openingHours: p.regularOpeningHours?.weekdayDescriptions?.[0] as string | undefined,
    }));
}

// Returns a point offset from (lat, lng) by distanceKm in the given bearing (degrees).
function offsetCoords(
  lat: number,
  lng: number,
  bearingDeg: number,
  distanceKm: number
): { lat: number; lng: number } {
  const R = 6371;
  const d = distanceKm / R;
  const b = (bearingDeg * Math.PI) / 180;
  const lat1 = (lat * Math.PI) / 180;
  const lng1 = (lng * Math.PI) / 180;
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(b));
  const lng2 = lng1 + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));
  return { lat: (lat2 * 180) / Math.PI, lng: (lng2 * 180) / Math.PI };
}

// Haversine distance between two lat/lng points in km.
function distanceKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Fetches the main attraction pool (15 km city core) and insider picks from
// four offset searches covering the 15–40 km outer ring around the city.
// Caches both pools per city for 30 days.
// Returns null if the API key is not configured.
export async function getCityPlaces(
  city: string,
  country: string,
  coords: { lat: number; lng: number }
): Promise<{ main: CachedPlace[]; insider: CachedPlace[] } | null> {
  if (!MAPS_KEY) return null;

  const now = new Date();
  const cityKey = city.toLowerCase();
  const countryKey = country.toLowerCase();

  // Check DB cache first
  const cached = await db
    .select()
    .from(cityPlacesCacheTable)
    .where(
      and(
        eq(cityPlacesCacheTable.city, cityKey),
        eq(cityPlacesCacheTable.country, countryKey),
        gt(cityPlacesCacheTable.expiresAt, now)
      )
    )
    .catch(() => [] as typeof cityPlacesCacheTable.$inferSelect[]);

  const mainRow = cached.find((r) => r.placeType === "main");
  const insiderRow = cached.find((r) => r.placeType === "insider");

  if (mainRow && insiderRow) {
    return {
      main: mainRow.places as CachedPlace[],
      insider: insiderRow.places as CachedPlace[],
    };
  }

  // Cache miss — main pool (15km city core) + 4 day-trip searches in parallel.
  //
  // Day-trip strategy: offset 60km N/E/S/W from city centre, 40km radius each.
  // This covers up to ~100km from the centre — catching classic day-trip towns
  // (e.g. Melk from Vienna at 83km, Tivoli from Rome at 30km, Versailles from
  // Paris at 25km) that a city-centre search never surfaces.
  //
  // After dedup, we filter to places >20km from the city centre (inner suburbs
  // are already covered by the main pool) and sort furthest-first so genuine
  // day-trip destinations rank above closer suburbs.
  // 8 directions: N/NE/E/SE/S/SW/W/NW, each 60km offset + 40km radius.
  // The 4 diagonal directions (45°/135°/225°/315°) eliminate the dead zones
  // between cardinal searches — e.g. Chartres (SW of Paris) and Schneeberg
  // (SW of Vienna) both fall outside N/S/E/W circles but inside the SW circle.
  // 8 dirs × 20 results = 160 raw candidates, cached for 30 days.
  const outerOffsets = [0, 45, 90, 135, 180, 225, 270, 315].map((b) =>
    offsetCoords(coords.lat, coords.lng, b, 60)
  );
  const [mainRaw, ...outerRaws] = await Promise.all([
    nearbySearch(coords.lat, coords.lng, 15_000, 20),
    // POPULARITY ranking across the full 40km radius.
    // DISTANCE was tried but the rural countryside is dense with tiny village
    // churches (1–4 reviews) that exhaust all 20 slots within 3–5km of the
    // offset centre, so Melk Abbey at 17km was never returned.
    // POPULARITY surfaces the genuinely well-known landmarks (Melk: 29k reviews,
    // 4.6★) that belong in the top-20 across the full circle.
    // Post-API filters handle quality control: LOCAL_TYPES removes parks/gardens,
    // userRatingCount≥1500 removes the tiny chapels, dist>35km removes suburbs.
    ...outerOffsets.map((o) => nearbySearch(o.lat, o.lng, 40_000, 20, DAY_TRIP_TYPES, "POPULARITY")),
  ]);

  const mainPlaces = normalizePlaces(mainRaw);
  const mainIds = new Set(mainPlaces.map((p) => p.placeId));

  // Deduplicate outer-ring results by place ID.
  const seenInsider = new Set<string>();
  const insiderRaw: any[] = [];
  for (const batch of outerRaws) {
    for (const p of batch) {
      if (!seenInsider.has(p.id)) {
        seenInsider.add(p.id);
        insiderRaw.push(p);
      }
    }
  }

  // Types that indicate a local attraction, not a day-trip destination.
  // Even if a place was returned via DAY_TRIP_TYPES (because it also has
  // tourist_attraction), we reject it if its own returned types include these.
  const LOCAL_TYPES = new Set([
    "park", "garden", "botanical_garden", "observation_deck",
    "beach", "zoo", "aquarium", "amusement_park", "campground",
  ]);

  const insiderPlaces = normalizePlaces(insiderRaw)
    .filter((p) => {
      if (mainIds.has(p.placeId)) return false;
      if (p.userRatingCount < 5000) return false;
      if (p.rating < 4.3) return false;
      // 35km minimum: genuine day trips start here. Suburban parks at 22km
      // passed the old 20km threshold — this closes that gap.
      const d = distanceKm(coords.lat, coords.lng, p.lat, p.lng);
      if (d < 35) return false;
      // Reject anything whose own returned types signal a local attraction,
      // even if tourist_attraction also appears in its type list.
      if (p.types.some((t) => LOCAL_TYPES.has(t))) return false;
      return true;
    })
    .sort((a, b) => b.rating - a.rating || b.userRatingCount - a.userRatingCount)
    .slice(0, 8);

  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1_000);

  // Upsert both pools (fire-and-forget — don't block the response)
  Promise.all([
    db
      .insert(cityPlacesCacheTable)
      .values({ city: cityKey, country: countryKey, placeType: "main", places: mainPlaces, expiresAt })
      .onConflictDoUpdate({
        target: [cityPlacesCacheTable.city, cityPlacesCacheTable.country, cityPlacesCacheTable.placeType],
        set: { places: mainPlaces, fetchedAt: now, expiresAt },
      }),
    db
      .insert(cityPlacesCacheTable)
      .values({ city: cityKey, country: countryKey, placeType: "insider", places: insiderPlaces, expiresAt })
      .onConflictDoUpdate({
        target: [cityPlacesCacheTable.city, cityPlacesCacheTable.country, cityPlacesCacheTable.placeType],
        set: { places: insiderPlaces, fetchedAt: now, expiresAt },
      }),
  ]).catch((e) => console.error("city_places_cache upsert failed:", e));

  return { main: mainPlaces, insider: insiderPlaces };
}

// Formats the candidate pools into a prompt section.
// Used to ground the LLM in real, verified places.
export function formatCandidatePool(
  main: CachedPlace[],
  insider: CachedPlace[]
): string {
  const mainLines = main
    .slice(0, 20)
    .map((p, i) => {
      const hours = p.openingHours ? ` | ${p.openingHours}` : "";
      return `  ${i + 1}. ${p.name} — ⭐${p.rating} (${p.userRatingCount.toLocaleString()} reviews)${hours}`;
    })
    .join("\n");

  const insiderLines = insider
    .map((p, i) => {
      const hours = p.openingHours ? ` | ${p.openingHours}` : "";
      return `  ${i + 1}. ${p.name} — ⭐${p.rating} (${p.userRatingCount.toLocaleString()} reviews)${hours}`;
    })
    .join("\n");

  let out =
    `\n── GOOGLE MAPS VERIFIED PLACES ──────────────────────────────────────────\n` +
    `MAIN ATTRACTION POOL — use ONLY these names for day activities (exact spelling):\n` +
    mainLines;

  if (insiderLines) {
    out +=
      `\n\nHIDDEN GEM CANDIDATES — include 1-2 of these naturally across the itinerary;\n` +
      `add "Hidden Gem" to the tips field for these:\n` +
      insiderLines;
  }

  out +=
    `\n─────────────────────────────────────────────────────────────────────────\n` +
    `RULE: Do NOT invent attraction names. Use only names from the lists above.\n`;

  return out;
}
