import { db, cityPlacesCacheTable } from "@workspace/db";
import type { CachedPlace } from "@workspace/db";
import { and, eq, gt } from "drizzle-orm";

const MAPS_KEY = process.env.GOOGLE_MAPS_API_KEY;

// Historical landmarks, architecture, viewpoints, nature, monuments, famous sights.
// Explicitly excludes food/drink types (restaurant, cafe, bakery, bar).
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
  maxCount: number
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
        includedTypes: ATTRACTION_TYPES,
        maxResultCount: maxCount,
        languageCode: "en",
        locationRestriction: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: radiusMeters,
          },
        },
        rankPreference: "POPULARITY",
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

// Fetches the main attraction pool (15 km city core) and hidden gem
// candidates (50 km radius, low review count) from Google Places.
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

  // Cache miss — run two parallel Nearby Searches
  const [mainRaw, insiderRaw] = await Promise.all([
    nearbySearch(coords.lat, coords.lng, 15_000, 20), // 15 km: city-centre famous sights
    nearbySearch(coords.lat, coords.lng, 50_000, 20), // 50 km: wider region for hidden gems
  ]);

  const mainPlaces = normalizePlaces(mainRaw);
  const mainIds = new Set(mainPlaces.map((p) => p.placeId));

  // Hidden gems: real, good quality, NOT already in main pool, low footfall
  // Insider picks: quality attractions within 50km that aren't in the city-centre main pool.
  // No upper review cap — the "not in main pool" exclusion already removes the mega-famous.
  const insiderPlaces = normalizePlaces(insiderRaw)
    .filter(
      (p) =>
        !mainIds.has(p.placeId) &&
        p.userRatingCount >= 50 &&
        p.rating >= 4.3
    )
    .slice(0, 10);

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
