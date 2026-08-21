import { Router, type IRouter, type Request, type Response } from "express";
import { geocodeCityCoords, getCityPlaces } from "../utils/places";
import type { CachedPlace } from "@workspace/db";

const router: IRouter = Router();
const MAPS_KEY = process.env.GOOGLE_MAPS_API_KEY;

// City autocomplete — proxies Google Places Autocomplete, keeps API key server-side.
router.get("/places/city-autocomplete", async (req: Request, res: Response) => {
  const input = ((req.query.input as string) || "").trim();
  if (!input || input.length < 2 || !MAPS_KEY) { res.json([]); return; }

  try {
    const url =
      `https://maps.googleapis.com/maps/api/place/autocomplete/json` +
      `?input=${encodeURIComponent(input)}` +
      `&types=(cities)` +
      `&language=en` +
      `&key=${MAPS_KEY}`;
    const r = await fetch(url);
    const data = (await r.json()) as any;

    // Fetch up to 15 then deduplicate by city+country so e.g. "Delhi, United States"
    // (NY / CA / OH) only occupies one slot, letting "Delhi, India" through.
    const seen = new Set<string>();
    const results: { city: string; country: string; description: string }[] = [];
    for (const p of (data.predictions ?? []) as any[]) {
      if (results.length >= 6) break;
      const main: string = p.structured_formatting?.main_text ?? p.description.split(",")[0].trim();
      const secondary: string = p.structured_formatting?.secondary_text ?? "";
      const country = secondary.split(",").pop()?.trim() ?? "";
      const key = `${main.toLowerCase()}|${country.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        results.push({ city: main, country, description: p.description });
      }
    }
    res.json(results);
  } catch {
    res.json([]);
  }
});

const TYPE_META: Record<string, { category: string; emoji: string; gradient: [string, string] }> = {
  tourist_attraction:  { category: "Attraction",  emoji: "✨", gradient: ["#7C3AED", "#5B21B6"] },
  museum:              { category: "Museum",       emoji: "🏛️", gradient: ["#1D4ED8", "#1E3A8A"] },
  art_gallery:         { category: "Art Gallery",  emoji: "🎨", gradient: ["#7C3AED", "#4C1D95"] },
  historical_landmark: { category: "Historic",     emoji: "🏺", gradient: ["#92400E", "#78350F"] },
  cultural_landmark:   { category: "Culture",      emoji: "🏛️", gradient: ["#B45309", "#92400E"] },
  monument:            { category: "Monument",     emoji: "🗿", gradient: ["#374151", "#1F2937"] },
  castle:              { category: "Castle",       emoji: "🏰", gradient: ["#92400E", "#78350F"] },
  church:              { category: "Architecture", emoji: "⛪", gradient: ["#1E40AF", "#1E3A8A"] },
  mosque:              { category: "Architecture", emoji: "🕌", gradient: ["#065F46", "#064E3B"] },
  hindu_temple:        { category: "Temple",       emoji: "🛕", gradient: ["#B45309", "#92400E"] },
  synagogue:           { category: "Architecture", emoji: "🕍", gradient: ["#1E40AF", "#1E3A8A"] },
  national_park:       { category: "Nature",       emoji: "🌲", gradient: ["#166534", "#14532D"] },
  park:                { category: "Park",         emoji: "🌳", gradient: ["#15803D", "#166534"] },
  beach:               { category: "Beach",        emoji: "🏖️", gradient: ["#0369A1", "#075985"] },
  garden:              { category: "Garden",       emoji: "🌷", gradient: ["#16A34A", "#15803D"] },
  botanical_garden:    { category: "Garden",       emoji: "🌺", gradient: ["#15803D", "#166534"] },
  observation_deck:    { category: "Viewpoint",    emoji: "🔭", gradient: ["#0C4A6E", "#082F49"] },
  zoo:                 { category: "Zoo",          emoji: "🦁", gradient: ["#854D0E", "#713F12"] },
  aquarium:            { category: "Aquarium",     emoji: "🐠", gradient: ["#155E75", "#164E63"] },
};

const DEFAULT_META = {
  category: "Attraction",
  emoji: "✨",
  gradient: ["#374151", "#1F2937"] as [string, string],
};

function getMeta(types: string[]): { category: string; emoji: string; gradient: [string, string] } {
  for (const t of types) {
    const m = TYPE_META[t];
    if (m) return m;
  }
  return DEFAULT_META;
}

const TYPE_DESC: Record<string, string> = {
  castle:              "Historic castle",
  church:              "Historic church",
  museum:              "Museum",
  national_park:       "National park",
  historical_landmark: "Historical landmark",
  cultural_landmark:   "Cultural landmark",
  monument:            "Historic monument",
  art_gallery:         "Art gallery",
  mosque:              "Historic mosque",
  hindu_temple:        "Hindu temple",
  synagogue:           "Historic synagogue",
  beach:               "Beach",
  garden:              "Garden",
  botanical_garden:    "Botanical garden",
  observation_deck:    "Scenic viewpoint",
  zoo:                 "Zoo",
  aquarium:            "Aquarium",
  tourist_attraction:  "Popular attraction",
};

function getTypeDescription(types: string[]): string {
  for (const t of types) {
    if (TYPE_DESC[t]) return TYPE_DESC[t];
  }
  return "Popular attraction";
}

function toAttraction(place: CachedPlace, isInsider: boolean) {
  const { category, emoji, gradient } = getMeta(place.types);
  return {
    id: place.placeId,
    name: place.name,
    category,
    emoji,
    gradient,
    description: place.description || getTypeDescription(place.types),
    seniorScore: Math.round(place.rating * 20),
    walkingMinutes: 0,
    steps: 0,
    rating: place.rating,
    userRatingCount: place.userRatingCount,
    isInsider,
  };
}


router.get("/places/attractions", async (req: Request, res: Response) => {
  const city = ((req.query.city as string) || "").trim();
  const country = ((req.query.country as string) || "").trim();

  if (!city || !country) {
    res.status(400).json({ error: "city and country are required" });
    return;
  }

  const coords = await geocodeCityCoords(city, country);
  if (!coords) {
    res.json([]);
    return;
  }

  const places = await getCityPlaces(city, country, coords);
  if (!places) {
    res.json([]);
    return;
  }

  const result = [
    ...places.main.map((p) => toAttraction(p, false)),
    ...places.insider.map((p) => toAttraction(p, true)),
  ];

  res.json(result);
});

export default router;
