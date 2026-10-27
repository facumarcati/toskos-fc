import { Router } from "express";
import { getClubSummary } from "../services/clubSummary.service.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    res.set("Cache-Control", "no-cache");
    res.json(await getClubSummary());
  } catch {
    res.status(503).json({ error: "No se pudieron cargar las novedades del club" });
  }
});

export default router;
