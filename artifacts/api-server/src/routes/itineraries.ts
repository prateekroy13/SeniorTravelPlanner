import { Router, type IRouter, type Request, type Response } from "express";
import { db, itinerariesTable } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";
import { eq } from "drizzle-orm";

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

const SYSTEM_PROMPT = `You are a senior-first travel planner AI. Generate realistic travel itineraries for senior travelers (ages 60+).

Key requirements:
- Pace activities for the specified preference (easy/moderate/active)
- Realistic step counts: easy 3000-5000, moderate 5000-8000, active 8000-12000
- Group nearby attractions on the same day to minimise travel
- Include real opening hours for each attraction
- State the best time to visit each place (fewest crowds, best light)
- Crowd level per attraction: "low" | "medium" | "high" (for the stated best time)
- 1-2 rest stops per half-day (cafes, parks)
- Public transport options with accessibility notes
- 3 mid-tier restaurants per day
- Budget estimates in local currency (mid-range realistic pricing)
- 1-2 nearby side trips per day
- Keep descriptions concise (max 80 words each)

IMPORTANT: Respond ONLY with valid, complete JSON. No markdown, no truncation.`;

function buildPrompt(body: {
  city: string;
  country: string;
  days: number;
  travelMonth: string;
  likedAttractions?: string[];
  likedRestaurants?: string[];
  realTravelTimes?: string;
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
      ? `\nMUST INCLUDE these specific attractions the traveler loved (they swiped right on them): ${body.likedAttractions.join(", ")}. Spread them across appropriate days — group nearby ones on the same day to minimise travel.\n`
      : "";

  const restaurantSection =
    body.likedRestaurants && body.likedRestaurants.length > 0
      ? `\nMUST INCLUDE these specific restaurants the traveler loved for their meals: ${body.likedRestaurants.join(", ")}. Schedule these for lunch or dinner across the appropriate days — do not cluster them all on one day.\n`
      : "";

  const travelTimesSection = body.realTravelTimes || "";

  return `Generate a ${body.days}-day itinerary for ${body.city}, ${body.country} in ${body.travelMonth}.

Traveler preferences:
- Pace: ${body.preferences.pace}
- Max steps per day: ${body.preferences.maxStepsPerDay || "moderate"}
- Dietary needs: ${body.preferences.dietaryNeeds?.join(", ") || "none specified"}
- Interests: ${body.preferences.interests?.join(", ") || "culture, history, food"}
- Budget level: ${body.preferences.budgetLevel || "mid"}
- Accessibility needs: ${body.preferences.accessibilityNeeds?.join(", ") || "none specified"}${likedSection}${restaurantSection}${travelTimesSection}
Day-grouping rule: place attractions that are < 20 min walk apart on the SAME day. Attractions > 30 min walk apart go on SEPARATE days.

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
          "tips": "string (senior-specific, max 30 words)",
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
  try {
    const { city, country, days, travelMonth, preferences, likedAttractions, likedRestaurants } = req.body;

    if (!city || !country || !days || !travelMonth || !preferences) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    // Fetch real walking travel times between liked attractions to help the AI
    // correctly group close attractions on the same day and separate far ones.
    const realTravelTimes =
      likedAttractions && likedAttractions.length > 1
        ? await getRealTravelTimes(likedAttractions, `${city}, ${country}`)
        : "";

    const prompt = buildPrompt({
      city, country, days, travelMonth, preferences,
      likedAttractions, likedRestaurants, realTravelTimes,
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 16000,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      res.status(500).json({ error: "No response from AI" });
      return;
    }

    const itinerary = JSON.parse(content);
    res.json(itinerary);
  } catch (err) {
    console.error("Generate itinerary error:", err);
    res.status(500).json({ error: "Failed to generate itinerary" });
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
    const id = parseInt(req.params.id);
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
    const id = parseInt(req.params.id);
    await db.delete(itinerariesTable).where(eq(itinerariesTable.id, id));
    res.status(204).send();
  } catch (err) {
    console.error("Delete itinerary error:", err);
    res.status(500).json({ error: "Failed to delete itinerary" });
  }
});

export default router;
