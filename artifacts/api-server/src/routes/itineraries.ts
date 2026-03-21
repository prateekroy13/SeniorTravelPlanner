import { Router, type IRouter, type Request, type Response } from "express";
import { db, itinerariesTable } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

const SYSTEM_PROMPT = `You are a senior-first travel planner AI. Generate detailed, realistic travel itineraries specifically designed for senior travelers (ages 60+).

Key requirements:
- Pace activities according to the specified preference (easy/moderate/active)
- Include realistic step counts (easy: 3000-5000, moderate: 5000-8000, active: 8000-12000 per day)
- Provide walking times between stops
- Suggest 2-3 rest stops per half-day (cafes, parks, benches)
- Include public transport options with accessibility notes
- Recommend 3 mid-tier restaurants per day (not fast food, not Michelin stars)
- Include crowd-avoidance tips and best visiting hours
- Note accessible toilet locations where relevant
- Provide budget estimates in local currency (realistic mid-range pricing)
- Suggest 2-3 nearby side trips that don't require much extra effort
- Be specific about actual place names, not generic descriptions
- Senior-friendly score: rate terrain flatness, bench availability, crowd levels, medical facility proximity

IMPORTANT: Always respond with valid JSON matching the exact schema provided.`;

function buildPrompt(body: {
  city: string;
  country: string;
  days: number;
  travelMonth: string;
  likedAttractions?: string[];
  likedRestaurants?: string[];
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
      ? `\nMUST INCLUDE these specific attractions the traveler loved (they swiped right on them): ${body.likedAttractions.join(", ")}. Include these in the itinerary spread across appropriate days.\n`
      : "";

  const restaurantSection =
    body.likedRestaurants && body.likedRestaurants.length > 0
      ? `\nMUST INCLUDE these specific restaurants the traveler loved for their meals: ${body.likedRestaurants.join(", ")}. Schedule these for lunch or dinner across the appropriate days — do not cluster them all on one day.\n`
      : "";

  return `Generate a ${body.days}-day itinerary for ${body.city}, ${body.country} in ${body.travelMonth}.

Traveler preferences:
- Pace: ${body.preferences.pace}
- Max steps per day: ${body.preferences.maxStepsPerDay || "moderate"}
- Dietary needs: ${body.preferences.dietaryNeeds?.join(", ") || "none specified"}
- Interests: ${body.preferences.interests?.join(", ") || "culture, history, food"}
- Budget level: ${body.preferences.budgetLevel || "mid"}
- Accessibility needs: ${body.preferences.accessibilityNeeds?.join(", ") || "none specified"}${likedSection}${restaurantSection}

Return a JSON object with this exact structure:
{
  "title": "string (catchy title for the trip)",
  "city": "${body.city}",
  "country": "${body.country}",
  "days": ${body.days},
  "travelMonth": "${body.travelMonth}",
  "overview": "string (2-3 sentence trip overview)",
  "seniorFriendlyScore": number (1-10),
  "seniorFriendlyNotes": "string (key accessibility notes for this destination)",
  "totalEstimatedCostLow": number (total trip cost low estimate, excluding flights/hotel),
  "totalEstimatedCostHigh": number (total trip cost high estimate),
  "currency": "string (local currency code e.g. EUR, USD, GBP)",
  "weatherInfo": "string (expected weather in ${body.travelMonth})",
  "bestTimeToVisit": "string (best hours for each attraction type)",
  "emergencyNumbers": "string (key emergency numbers: police, ambulance, tourist help)",
  "dayPlans": [
    {
      "dayNumber": 1,
      "theme": "string (e.g. 'Historic Old Town')",
      "morning": [
        {
          "name": "string",
          "description": "string",
          "duration": "string (e.g. '2 hours')",
          "walkingMinutes": number,
          "steps": number,
          "cost": "string (e.g. 'Free' or '€15')",
          "tips": "string (senior-specific tip)",
          "isRestStop": false
        }
      ],
      "afternoon": [...same structure...],
      "evening": [...same structure...],
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
          "priceRange": "string (e.g. '€€' or '$15-25 per person')",
          "description": "string",
          "wheelchairFriendly": boolean,
          "nearbyAttraction": "string"
        }
      ],
      "transportOptions": [
        {
          "mode": "string (e.g. 'Metro', 'Bus', 'Taxi')",
          "description": "string",
          "estimatedCost": "string",
          "accessibilityNotes": "string"
        }
      ],
      "sideTrips": [
        {
          "name": "string",
          "description": "string",
          "distance": "string (e.g. '30 min by train')",
          "extraSteps": number,
          "extraTime": "string (e.g. 'Half day')",
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

    const prompt = buildPrompt({ city, country, days, travelMonth, preferences, likedAttractions, likedRestaurants });

    const completion = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 8192,
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
