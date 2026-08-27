import { Router } from "express";
import {
  getPodiumsForSeason,
  getTrophyLeaderboard,
} from "../services/titles.service.js";

const router = Router();

const TROPHY_SEASONS = [2026, 2025, 2024];
const CURRENT_YEAR = new Date().getFullYear();

router.get("/", async (req, res) => {
  try {
    const includeCurrentSeason = req.query.includeCurrent === "1";

    const seasons = await Promise.all(
      TROPHY_SEASONS.map(async (season) => ({
        season,
        isLive: season === CURRENT_YEAR,
        categories: await getPodiumsForSeason(season),
      })),
    );

    const leaderboard = await getTrophyLeaderboard({ includeCurrentSeason });

    res.render("trophies", {
      seasons,
      leaderboard,
      includeCurrentSeason,
      currentYear: CURRENT_YEAR,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error al cargar trofeos");
  }
});

router.get("/leaderboard", async (req, res) => {
  try {
    const includeCurrentSeason = req.query.includeCurrent === "1";

    const leaderboard = await getTrophyLeaderboard({ includeCurrentSeason });

    res.json({ leaderboard });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al cargar leaderboard" });
  }
});

export default router;
