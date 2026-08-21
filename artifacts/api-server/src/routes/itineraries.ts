import { Router, type IRouter, type Request, type Response } from "express";
import { randomUUID } from "crypto";
import { db, itinerariesTable, generationLogsTable } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";
import { eq } from "drizzle-orm";
import { geocodeCityCoords, getCityPlaces, formatCandidatePool } from "../utils/places";

const router: IRouter = Router();

const MAPS_KEY = process.env.GOOGLE_MAPS_API_KEY;

// Fetch real walking travel times between consecutive attractions using
// Google Distance Matrix API. Returns formatted strings for the AI prompt.
async function getRealTravelTimes(
  places: string[],
  city: string
): Promise<string> {
  if (!MAPS_KEY || places.length < 2) return "";

  const lines: string[] = [];

  for (let i = 0; i < places.length - 1; i++) {
    const origin = `${places[i]}, ${city}`;
    const dest = `${places[i + 1]}, ${city}`;
    try {
      const url =
        `https://maps.googleapis.com/maps/api/distancematrix/json` +
        `?origins=${encodeURIComponent(origin)}` +
        `&destinations=${encodeURIComponent(dest)}` +
        `&mode=walking` +
        `&key=${MAPS_KEY}`;
      const r = await fetch(url);
      const data = (await r.json()) as any;
      const el = data?.rows?.[0]?.elements?.[0];
      if (el?.status === "OK") {
        lines.push(
          `  - ${places[i]} → ${places[i + 1]}: ${el.duration.text} walk, ${el.distance.text}`
        );
      }
    } catch {
      // skip this pair on error
    }
  }

  if (!lines.length) return "";
  return `\nREAL GOOGLE MAPS TRAVEL TIMES between selected attractions (use these exact figures in the itinerary):\n${lines.join("\n")}\n`;
}

const PROMPT_VERSION = "v2";

const SYSTEM_PROMPT = `You are a travel planning AI. Generate realistic, personalized travel itineraries tailored to each traveler's stated preferences.

Key requirements:
- Pace activities for the specified preference (easy/moderate/active)
- Realistic step counts: easy 3000-5000, moderate 5000-8000, active 8000-12000
- Group nearby attractions on the same day to minimise travel
- Include real opening hours for each attraction
- State the best time to visit each place (fewest crowds, best light)
- Crowd level per attraction: "low" | "medium" | "high" (for the stated best time)
- 1-2 rest stops per half-day (cafes, parks)
- Public transport options with accessibility notes
- 3 restaurants per day — price tier and budget estimates must match the traveler's stated Budget level exactly (budget = affordable local spots, mid = mid-range bistros and trattorias, luxury = upscale/fine dining)
- 1-2 nearby side trips per day
- Keep descriptions concise (max 80 words each)

IMPORTANT: Respond ONLY with valid, complete JSON. No markdown, no truncation.`;

function buildPrompt(body: {
  city: string;
  country: string;
  days: number;
  travelMonth: string;
  likedAttractions?: string[];
  likedDayTrips?: string[];
  likedRestaurants?: string[];
  realTravelTimes?: string;
  candidatePool?: string;
  preferences: {
    pace: string;
    maxStepsPerDay?: number;
    dietaryNeeds?: string[];
    interests?: string[];
    budgetLevel?: string;
    accessibilityNeeds?: string[];
  };
}) {
  const likedSection =
    body.likedAttractions && body.likedAttractions.length > 0
      ? `\nMUST INCLUDE these city attractions (traveler swiped right): ${body.likedAttractions.join(", ")}. Group nearby ones on the same day.\n`
      : "";

  const dayTripSection =
    body.likedDayTrips && body.likedDayTrips.length > 0
      ? `\nMUST INCLUDE these day-trip destinations (each is 40–100 km from ${body.city} and requires a dedicated full day by train or bus — do NOT mix with city attractions on the same day): ${body.likedDayTrips.join(", ")}.\n`
      : "";

  const restaurantSection =
    body.likedRestaurants && body.likedRestaurants.length > 0
      ? `\nMUST INCLUDE these specific restaurants the traveler loved for their meals: ${body.likedRestaurants.join(", ")}. Schedule these for lunch or dinner across the appropriate days — do not cluster them all on one day.\n`
      : "";

  const travelTimesSection = body.realTravelTimes || "";
  const candidateSection = body.candidatePool || "";

  return `Generate a ${body.days}-day itinerary for ${body.city}, ${body.country} in ${body.travelMonth}.

Traveler preferences:
- Pace: ${body.preferences.pace}
- Max steps per day: ${body.preferences.maxStepsPerDay || "moderate"}
- Dietary needs: ${body.preferences.dietaryNeeds?.join(", ") || "none specified"}
- Interests: ${body.preferences.interests?.join(", ") || "culture, history, food"}
- Budget level: ${body.preferences.budgetLevel || "mid"}
- Accessibility needs: ${body.preferences.accessibilityNeeds?.join(", ") || "none specified"}${likedSection}${dayTripSection}${restaurantSection}${candidateSection}${travelTimesSection}
Day-grouping rules:
- City attractions < 20 min walk apart → same day. > 30 min walk → separate days.
- Day-trip destinations (listed above) → one destination per day, full day. Depart ${body.city} by train/bus in the morning, return evening. Never mix a day trip with other city attractions on the same day.

Return ONLY a valid JSON object (no markdown) with this exact structure:
{
  "title": "string",
  "city": "${body.city}",
  "country": "${body.country}",
  "days": ${body.days},
  "travelMonth": "${body.travelMonth}",
  "overview": "string (2-3 sentences)",
  "seniorFriendlyScore": number (1-10),
  "seniorFriendlyNotes": "string",
  "totalEstimatedCostLow": number,
  "totalEstimatedCostHigh": number,
  "currency": "string (e.g. EUR)",
  "weatherInfo": "string",
  "emergencyNumbers": "string",
  "dayPlans": [
    {
      "dayNumber": 1,
      "theme": "string",
      "morning": [
        {
          "name": "string",
          "description": "string (max 60 words)",
          "openingHours": "string (e.g. '9:00 AM – 6:00 PM, closed Mondays')",
          "bestTimeToVisit": "string (e.g. 'Arrive by 9 AM to avoid tour groups')",
          "crowdLevel": "low" | "medium" | "high",
          "duration": "string (e.g. '2 hours')",
          "walkingMinutes": number,
          "steps": number,
          "cost": "string (e.g. 'Free' or '€15')",
          "tips": "string (helpful tip for this place, max 30 words)",
          "isRestStop": boolean,
          "travelMinutesToNext": number (0 if last activity of day)
        }
      ],
      "afternoon": [same activity structure],
      "evening": [same activity structure],
      "totalSteps": number,
      "totalWalkingMinutes": number,
      "activeHours": number,
      "estimatedCostLow": number,
      "estimatedCostHigh": number,
      "currency": "string",
      "restaurants": [
        {
          "name": "string",
          "cuisine": "string",
          "priceRange": "string",
          "description": "string (max 40 words)",
          "wheelchairFriendly": boolean,
          "nearbyAttraction": "string"
        }
      ],
      "transportOptions": [
        {
          "mode": "string",
          "description": "string (max 40 words)",
          "estimatedCost": "string",
          "accessibilityNotes": "string"
        }
      ],
      "sideTrips": [
        {
          "name": "string",
          "description": "string (max 40 words)",
          "distance": "string",
          "extraSteps": number,
          "extraTime": "string",
          "estimatedCost": "string"
        }
      ],
      "crowdAvoidanceTip": "string",
      "weatherNote": "string"
    }
  ]
}`;
}

router.post("/itineraries/generate", async (req: Request, res: Response) => {
  const requestId = randomUUID();
  const startedAt = Date.now();
  let httpStatus = 500;
  let errorType: string | null = null;
  let tokensIn: number | null = null;
  let tokensOut: number | null = null;
  let distanceMatrixCalls = 0;

  const { city, country, days, travelMonth, preferences, likedAttractions, likedRestaurants } = req.body;

  try {
    if (!city || !country || !days || !travelMonth || !preferences) {
      httpStatus = 400;
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    // Geocode gate: validates city and returns coordinates.
    // When MAPS_KEY is set, null means invalid city → reject with 400.
    // When MAPS_KEY is not set, returns null and we proceed without Places grounding.
    const coords = MAPS_KEY ? await geocodeCityCoords(city, country) : null;
    if (MAPS_KEY && coords === null) {
      httpStatus = 400;
      res.status(400).json({
        error: `"${city}, ${country}" doesn't appear to be a valid city. Please check the spelling and try again.`,
      });
      return;
    }

    // Fetch verified places — needed for both the candidate pool and to classify
    // liked attractions as city vs. day-trip (insider) destinations.
    let candidatePool: string | undefined;
    let likedCityAttractions = likedAttractions ?? [];
    let likedDayTrips: string[] = [];

    if (coords) {
      const places = await getCityPlaces(city, country, coords);
      if (places && places.main.length > 0) {
        candidatePool = formatCandidatePool(places.main, places.insider);

        // Split liked attractions: insider names are day trips (40–100 km away).
        // City attractions get walking-time optimisation; day trips travel by train.
        const insiderNames = new Set(places.insider.map((p) => p.name));
        likedCityAttractions = (likedAttractions ?? []).filter((n) => !insiderNames.has(n));
        likedDayTrips = (likedAttractions ?? []).filter((n) => insiderNames.has(n));
      }
    }

    // Walking travel times only for city attractions — day trips travel by train,
    // not on foot, so including them would produce nonsensical distances.
    distanceMatrixCalls = likedCityAttractions.length > 1 ? 1 : 0;
    const realTravelTimes =
      likedCityAttractions.length > 1
        ? await getRealTravelTimes(likedCityAttractions, `${city}, ${country}`)
        : "";

    const prompt = buildPrompt({
      city, country, days, travelMonth, preferences,
      likedAttractions: likedCityAttractions,
      likedDayTrips,
      likedRestaurants, realTravelTimes, candidatePool,
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      max_completion_tokens: 32000,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "itinerary",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["title","city","country","days","travelMonth","overview","seniorFriendlyScore","seniorFriendlyNotes","totalEstimatedCostLow","totalEstimatedCostHigh","currency","weatherInfo","emergencyNumbers","dayPlans"],
            properties: {
              title: { type: "string" },
              city: { type: "string" },
              country: { type: "string" },
              days: { type: "number" },
              travelMonth: { type: "string" },
              overview: { type: "string" },
              seniorFriendlyScore: { type: "number" },
              seniorFriendlyNotes: { type: "string" },
              totalEstimatedCostLow: { type: "number" },
              totalEstimatedCostHigh: { type: "number" },
              currency: { type: "string" },
              weatherInfo: { type: "string" },
              emergencyNumbers: { type: "string" },
              dayPlans: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["dayNumber","theme","morning","afternoon","evening","totalSteps","totalWalkingMinutes","activeHours","estimatedCostLow","estimatedCostHigh","currency","restaurants","transportOptions","sideTrips","crowdAvoidanceTip","weatherNote"],
                  properties: {
                    dayNumber: { type: "number" },
                    theme: { type: "string" },
                    totalSteps: { type: "number" },
                    totalWalkingMinutes: { type: "number" },
                    activeHours: { type: "number" },
                    estimatedCostLow: { type: "number" },
                    estimatedCostHigh: { type: "number" },
                    currency: { type: "string" },
                    crowdAvoidanceTip: { type: "string" },
                    weatherNote: { type: "string" },
                    morning:   { type: "array", items: { $ref: "#/$defs/activity" } },
                    afternoon: { type: "array", items: { $ref: "#/$defs/activity" } },
                    evening:   { type: "array", items: { $ref: "#/$defs/activity" } },
                    restaurants: {
                      type: "array",
                      items: {
                        type: "object",
                        additionalProperties: false,
                        required: ["name","cuisine","priceRange","description","wheelchairFriendly","nearbyAttraction"],
                        properties: {
                          name: { type: "string" },
                          cuisine: { type: "string" },
                          priceRange: { type: "string" },
                          description: { type: "string" },
                          wheelchairFriendly: { type: "boolean" },
                          nearbyAttraction: { type: "string" }
                        }
                      }
                    },
                    transportOptions: {
                      type: "array",
                      items: {
                        type: "object",
                        additionalProperties: false,
                        required: ["mode","description","estimatedCost","accessibilityNotes"],
                        properties: {
                          mode: { type: "string" },
                          description: { type: "string" },
                          estimatedCost: { type: "string" },
                          accessibilityNotes: { type: "string" }
                        }
                      }
                    },
                    sideTrips: {
                      type: "array",
                      items: {
                        type: "object",
                        additionalProperties: false,
                        required: ["name","description","distance","extraSteps","extraTime","estimatedCost"],
                        properties: {
                          name: { type: "string" },
                          description: { type: "string" },
                          distance: { type: "string" },
                          extraSteps: { type: "number" },
                          extraTime: { type: "string" },
                          estimatedCost: { type: "string" }
                        }
                      }
                    }
                  }
                }
              }
            },
            $defs: {
              activity: {
                type: "object",
                additionalProperties: false,
                required: ["name","description","duration","walkingMinutes","steps","cost","tips","isRestStop","crowdLevel","openingHours","bestTimeToVisit","travelMinutesToNext"],
                properties: {
                  name: { type: "string" },
                  description: { type: "string" },
                  duration: { type: "string" },
                  walkingMinutes: { type: "number" },
                  steps: { type: "number" },
                  cost: { type: "string" },
                  tips: { type: "string" },
                  isRestStop: { type: "boolean" },
                  crowdLevel: { type: "string", enum: ["low","medium","high"] },
                  openingHours: { type: "string" },
                  bestTimeToVisit: { type: "string" },
                  travelMinutesToNext: { type: "number" }
                }
              }
            }
          }
        }
      },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      res.status(500).json({ error: "No response from AI" });
      return;
    }

    tokensIn = completion.usage?.prompt_tokens ?? null;
    tokensOut = completion.usage?.completion_tokens ?? null;

    const itinerary = JSON.parse(content);
    httpStatus = 200;
    res.json(itinerary);
  } catch (err) {
    console.error("Generate itinerary error:", err);
    errorType = err instanceof Error ? err.constructor.name : "UnknownError";
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to generate itinerary" });
    }
  } finally {
    // Item 4: Fire-and-forget generation log — never blocks the response
    if (city) {
      db.insert(generationLogsTable).values({
        requestId,
        userId: req.body.userId ?? null,
        city,
        country,
        days,
        travelMonth,
        promptVersion: PROMPT_VERSION,
        model: "gpt-4.1",
        tokensIn,
        tokensOut,
        estimatedCostUsd:
          tokensIn != null && tokensOut != null
            ? parseFloat(((tokensIn * 2.5 + tokensOut * 10) / 1_000_000).toFixed(6))
            : null,
        latencyMs: Math.round(Date.now() - startedAt),
        googleDistanceMatrixCalls: distanceMatrixCalls,
        httpStatus,
        errorType,
      }).catch(() => {});
    }
  }
});

router.get("/itineraries", async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string | undefined;
    let result;
    if (userId) {
      result = await db
        .select()
        .from(itinerariesTable)
        .where(eq(itinerariesTable.userId, userId))
        .orderBy(itinerariesTable.createdAt);
    } else {
      result = await db
        .select()
        .from(itinerariesTable)
        .orderBy(itinerariesTable.createdAt);
    }

    const mapped = result.map((row) => ({
      ...row,
      id: String(row.id),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }));

    res.json(mapped);
  } catch (err) {
    console.error("Get itineraries error:", err);
    res.status(500).json({ error: "Failed to fetch itineraries" });
  }
});

router.post("/itineraries", async (req: Request, res: Response) => {
  try {
    const {
      userId,
      title,
      city,
      country,
      days,
      travelMonth,
      generatedData,
      preferences,
    } = req.body;

    const [created] = await db
      .insert(itinerariesTable)
      .values({
        userId: userId || null,
        title,
        city,
        country,
        days,
        travelMonth,
        generatedData,
        preferences: preferences || null,
      })
      .returning();

    res.status(201).json({
      ...created,
      id: String(created.id),
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    });
  } catch (err) {
    console.error("Create itinerary error:", err);
    res.status(500).json({ error: "Failed to save itinerary" });
  }
});

router.get("/itineraries/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const [row] = await db
      .select()
      .from(itinerariesTable)
      .where(eq(itinerariesTable.id, id));

    if (!row) {
      res.status(404).json({ error: "Itinerary not found" });
      return;
    }

    res.json({
      ...row,
      id: String(row.id),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    });
  } catch (err) {
    console.error("Get itinerary error:", err);
    res.status(500).json({ error: "Failed to fetch itinerary" });
  }
});

router.delete("/itineraries/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    await db.delete(itinerariesTable).where(eq(itinerariesTable.id, id));
    res.status(204).send();
  } catch (err) {
    console.error("Delete itinerary error:", err);
    res.status(500).json({ error: "Failed to delete itinerary" });
  }
});

export default router;
