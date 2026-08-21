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
  ruins:               { category: "Ruins",        emoji: "🏚️", gradient: ["#78716C", "#57534E"] },
  castle:              { category: "Castle",       emoji: "🏰", gradient: ["#92400E", "#78350F"] },
  palace:              { category: "Palace",       emoji: "👑", gradient: ["#CA8A04", "#A16207"] },
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
  scenic_viewpoint:    { category: "Viewpoint",    emoji: "🌄", gradient: ["#0C4A6E", "#082F49"] },
  zoo:                 { category: "Zoo",          emoji: "🦁", gradient: ["#854D0E", "#713F12"] },
  aquarium:            { category: "Aquarium",     emoji: "🐠", gradient: ["#155E75", "#164E63"] },
  lighthouse:          { category: "Lighthouse",   emoji: "🗼", gradient: ["#B45309", "#92400E"] },
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
