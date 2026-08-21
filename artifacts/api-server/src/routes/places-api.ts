import { Router, type IRouter, type Request, type Response } from "express";
import { geocodeCityCoords, getCityPlaces } from "../utils/places";
import type { CachedPlace } from "@workspace/db";

const router: IRouter = Router();

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

function toAttraction(place: CachedPlace, isInsider: boolean) {
  const { category, emoji, gradient } = getMeta(place.types);
  return {
    id: place.placeId,
    name: place.name,
    category,
    emoji,
    gradient,
    description: `★${place.rating.toFixed(1)} · ${place.userRatingCount.toLocaleString()} reviews`,
    seniorScore: Math.round(place.rating * 20),
    walkingMinutes: 0,
    steps: 0,
    rating: place.rating,
    userRatingCount: place.userRatingCount,
    isInsider,
  };
}

router.get("/places/debug", async (req: Request, res: Response) => {
  const city = ((req.query.city as string) || "Rome").trim();
  const country = ((req.query.country as string) || "Italy").trim();
  const mapsKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!mapsKey) { res.json({ mapsKeySet: false }); return; }

  const coords = await geocodeCityCoords(city, country);
  if (!coords) { res.json({ mapsKeySet: true, coords: null }); return; }

  // Raw 50 km search — bypass cache to see what Places API actually returns
  const raw50Res = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": mapsKey,
      "X-Goog-FieldMask": "places.id,places.displayName,places.rating,places.userRatingCount",
    },
    body: JSON.stringify({
      includedTypes: ["tourist_attraction","museum","art_gallery","historical_landmark","cultural_landmark","monument","castle","church","mosque","hindu_temple","synagogue","national_park","park","beach","garden","botanical_garden","observation_deck","zoo","aquarium"],
      maxResultCount: 20,
      locationRestriction: { circle: { center: { latitude: coords.lat, longitude: coords.lng }, radius: 50000 } },
      rankPreference: "POPULARITY",
    }),
  });
  const raw50Data = raw50Res.ok ? (await raw50Res.json() as any) : { error: await raw50Res.text() };
  const raw50Places: any[] = raw50Data.places ?? [];

  const places = await getCityPlaces(city, country, coords);
  const mainIds = new Set(places?.main.map((p) => p.placeId) ?? []);

  res.json({
    mapsKeySet: true,
    coords,
    mainCount: places?.main.length ?? 0,
    insiderCount: places?.insider.length ?? 0,
    raw50Count: raw50Places.length,
    raw50NotInMain: raw50Places.filter((p: any) => !mainIds.has(p.id)).map((p: any) => ({
      name: p.displayName?.text,
      rating: p.rating,
      reviews: p.userRatingCount,
    })),
  });
});

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
