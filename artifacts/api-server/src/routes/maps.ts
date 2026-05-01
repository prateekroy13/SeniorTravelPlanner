import { Router, type Request, type Response } from "express";

const router = Router();

const MAPS_KEY = process.env.GOOGLE_MAPS_API_KEY;

// In-memory photo cache: query → CDN URL (no expiry, safe because place photos
// don't change and this is a dev/production runtime cache, not persisted)
const photoCache = new Map<string, string>();

// ─── GET /api/maps/place-photo ────────────────────────────────────────────────
// Fetches a Google Places photo URL for a text query.
// Two-step:
//   1. Places Text Search (New) → get photo name reference
//   2. Photo Media endpoint → follow redirect → extract CDN URL (no key in URL)
// Returns { url: string } — safe to use directly in <Image> on the client.
router.get("/maps/place-photo", async (req: Request, res: Response): Promise<void> => {
  const query = ((req.query.query as string) || "").trim();
  const width = Math.min(parseInt((req.query.width as string) || "800", 10), 1200);

  if (!query) {
    res.status(400).json({ error: "query param is required" });
    return;
  }

  const cacheKey = `${query}::${width}`;
  const cached = photoCache.get(cacheKey);
  if (cached) {
    res.json({ url: cached });
    return;
  }

  if (!MAPS_KEY) {
    res.status(503).json({ error: "GOOGLE_MAPS_API_KEY not configured" });
    return;
  }

  try {
    // Step 1 – search for the place and get its first photo reference
    const searchRes = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": MAPS_KEY,
        "X-Goog-FieldMask": "places.id,places.photos",
      },
      body: JSON.stringify({ textQuery: query, maxResultCount: 1 }),
    });

    if (!searchRes.ok) {
      res.status(502).json({ error: "Places search failed" });
      return;
    }

    const searchData = (await searchRes.json()) as any;
    const photoName = searchData?.places?.[0]?.photos?.[0]?.name;

    if (!photoName) {
      res.status(404).json({ error: "No photo found for query" });
      return;
    }

    // Step 2 – resolve the photo name to a CDN URL (the endpoint returns a
    // 302 redirect to lh3.googleusercontent.com — extract the final URL)
    const photoRes = await fetch(
      `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${width}&key=${MAPS_KEY}`,
      { redirect: "follow" }
    );

    const photoUrl = photoRes.url;

    if (!photoUrl || !photoUrl.startsWith("http")) {
      res.status(502).json({ error: "Could not resolve photo URL" });
      return;
    }

    photoCache.set(cacheKey, photoUrl);
    res.json({ url: photoUrl });
  } catch (err: any) {
    console.error("place-photo error:", err?.message);
    res.status(500).json({ error: "Failed to fetch photo" });
  }
});

// ─── POST /api/maps/travel-times ─────────────────────────────────────────────
// Calls Google Distance Matrix API between a list of ordered waypoints.
// Body: { places: string[], city: string, mode?: "walking"|"driving"|"transit" }
// Returns the raw Distance Matrix JSON plus a simplified `legs` array.
router.post("/maps/travel-times", async (req: Request, res: Response): Promise<void> => {
  const {
    places,
    city,
    mode = "walking",
  } = req.body as { places: string[]; city: string; mode?: string };

  if (!places || places.length < 2) {
    res.status(400).json({ error: "At least 2 places required" });
    return;
  }

  if (!MAPS_KEY) {
    res.status(503).json({ error: "GOOGLE_MAPS_API_KEY not configured" });
    return;
  }

  try {
    // Build consecutive pairs: A→B, B→C, C→D …
    const legs: {
      from: string;
      to: string;
      distanceText: string;
      durationText: string;
      durationSeconds: number;
    }[] = [];

    for (let i = 0; i < places.length - 1; i++) {
      const origin = `${places[i]}, ${city}`;
      const destination = `${places[i + 1]}, ${city}`;

      const url =
        `https://maps.googleapis.com/maps/api/distancematrix/json` +
        `?origins=${encodeURIComponent(origin)}` +
        `&destinations=${encodeURIComponent(destination)}` +
        `&mode=${mode}` +
        `&key=${MAPS_KEY}`;

      const dmRes = await fetch(url);
      const data = (await dmRes.json()) as any;
      const element = data?.rows?.[0]?.elements?.[0];

      if (element?.status === "OK") {
        legs.push({
          from: places[i],
          to: places[i + 1],
          distanceText: element.distance.text,
          durationText: element.duration.text,
          durationSeconds: element.duration.value,
        });
      } else {
        legs.push({
          from: places[i],
          to: places[i + 1],
          distanceText: "unknown",
          durationText: "unknown",
          durationSeconds: 0,
        });
      }
    }

    res.json({ legs, mode });
  } catch (err: any) {
    console.error("travel-times error:", err?.message);
    res.status(500).json({ error: "Failed to calculate travel times" });
  }
});

export default router;
