import { Router, type Request, type Response } from "express";
import { pool } from "@workspace/db";

const router = Router();

router.get("/sparks", async (req: Request, res: Response) => {
  try {
    const deviceId = (req.query.deviceId as string) || "";
    const { rows } = await pool.query(
      `SELECT s.*,
        CASE WHEN sl.device_id IS NOT NULL THEN true ELSE false END AS liked_by_me
       FROM sparks s
       LEFT JOIN spark_likes sl ON sl.spark_id = s.id AND sl.device_id = $1
       ORDER BY s.created_at DESC`,
      [deviceId]
    );
    res.json({ sparks: rows });
  } catch (err) {
    console.error("GET /sparks error:", err);
    res.status(500).json({ error: "Failed to fetch sparks" });
  }
});

router.post("/sparks", async (req: Request, res: Response) => {
  try {
    const { authorName, imageData, caption, locationName, locationType, destinationCity, destinationCountry } = req.body;

    if (!locationName || !locationType || !destinationCity || !destinationCountry) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const { rows } = await pool.query(
      `INSERT INTO sparks (author_name, image_data, caption, location_name, location_type, destination_city, destination_country)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [authorName || "You", imageData || null, caption || "", locationName, locationType, destinationCity, destinationCountry]
    );
    res.status(201).json({ spark: { ...rows[0], liked_by_me: false } });
  } catch (err) {
    console.error("POST /sparks error:", err);
    res.status(500).json({ error: "Failed to create spark" });
  }
});

router.get("/sparks/user/:authorName", async (req: Request, res: Response) => {
  try {
    const deviceId = (req.query.deviceId as string) || "";
    const authorName = decodeURIComponent(req.params.authorName);
    const { rows } = await pool.query(
      `SELECT s.*,
        CASE WHEN sl.device_id IS NOT NULL THEN true ELSE false END AS liked_by_me
       FROM sparks s
       LEFT JOIN spark_likes sl ON sl.spark_id = s.id AND sl.device_id = $2
       WHERE s.author_name = $1
       ORDER BY s.created_at DESC`,
      [authorName, deviceId]
    );
    const totalLikes = rows.reduce((sum: number, r: { likes_count: number }) => sum + (r.likes_count || 0), 0);
    res.json({ sparks: rows, authorName, totalLikes });
  } catch (err) {
    console.error("GET /sparks/user/:authorName error:", err);
    res.status(500).json({ error: "Failed to fetch user sparks" });
  }
});

router.post("/sparks/:id/like", async (req: Request, res: Response) => {
  try {
    const sparkId = parseInt(req.params.id);
    const { deviceId } = req.body;

    if (!deviceId) {
      res.status(400).json({ error: "deviceId required" });
      return;
    }

    const existing = await pool.query(
      "SELECT 1 FROM spark_likes WHERE spark_id = $1 AND device_id = $2",
      [sparkId, deviceId]
    );

    let likedByMe: boolean;
    if (existing.rows.length > 0) {
      await pool.query("DELETE FROM spark_likes WHERE spark_id = $1 AND device_id = $2", [sparkId, deviceId]);
      await pool.query("UPDATE sparks SET likes_count = GREATEST(0, likes_count - 1) WHERE id = $1", [sparkId]);
      likedByMe = false;
    } else {
      await pool.query("INSERT INTO spark_likes (spark_id, device_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [sparkId, deviceId]);
      await pool.query("UPDATE sparks SET likes_count = likes_count + 1 WHERE id = $1", [sparkId]);
      likedByMe = true;
    }

    const { rows } = await pool.query("SELECT likes_count FROM sparks WHERE id = $1", [sparkId]);
    res.json({ likesCount: rows[0]?.likes_count ?? 0, likedByMe });
  } catch (err) {
    console.error("POST /sparks/:id/like error:", err);
    res.status(500).json({ error: "Failed to toggle like" });
  }
});

export default router;
