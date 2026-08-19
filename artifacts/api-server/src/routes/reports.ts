import { Router, type IRouter, type Request, type Response } from "express";
import { db, accuracyReportsTable } from "@workspace/db";

const router: IRouter = Router();

router.post("/itineraries/:id/report", async (req: Request, res: Response) => {
  try {
    const itineraryId = parseInt(req.params.id as string, 10);
    if (isNaN(itineraryId)) {
      res.status(400).json({ error: "Invalid itinerary ID" });
      return;
    }
    const { itemType, itemName, dayNumber, issueType, notes } = req.body;
    if (!itemType || !itemName || !issueType) {
      res.status(400).json({ error: "itemType, itemName, and issueType are required" });
      return;
    }
    await db.insert(accuracyReportsTable).values({
      itineraryId,
      itemType,
      itemName,
      dayNumber: dayNumber ?? null,
      issueType,
      notes: notes ?? null,
    });
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error("Report error:", err);
    res.status(500).json({ error: "Failed to save report" });
  }
});

export default router;
