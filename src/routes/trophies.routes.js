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
    const requestedSeason = Number(req.query.season);
    const selectedSeason = TROPHY_SEASONS.includes(requestedSeason)
      ? requestedSeason
      : TROPHY_SEASONS[0];

    const seasonsToLoad = new Set(TROPHY_SEASONS);
    for (let year = 2024; year <= CURRENT_YEAR; year++) {
      if (includeCurrentSeason || year !== CURRENT_YEAR) seasonsToLoad.add(year);
    }
    const podiumsBySeason = new Map(
      await Promise.all(
        [...seasonsToLoad].map(async (season) => [
          season,
          await getPodiumsForSeason(season),
        ]),
      ),
    );

    const seasons = TROPHY_SEASONS.map((season) => ({
      season,
      isLive: season === CURRENT_YEAR,
      isSelected: season === selectedSeason,
      categories: podiumsBySeason.get(season).map((category) => ({
        ...category,
        steps: [2, 1, 3].map((position) => {
          const players = category.podium
            .filter((player) => player.position === position)
            .map((player) => ({
              ...player,
              profileUrl: `/players/${encodeURIComponent(player.playerId)}?season=${season}`,
            }));
          return { position, players, isShared: players.length > 1, unit: category.unit };
        }),
      })),
    }));
    const leaderboard = await getTrophyLeaderboard({
      includeCurrentSeason,
      podiumsBySeason,
    });

    const seasonEndISO = new Date(
      `${CURRENT_YEAR + 1}-01-01T00:00:00-03:00`,
    ).toISOString();

    res.render("trophies", {
      seasons,
      leaderboard,
      includeCurrentSeason,
      currentYear: CURRENT_YEAR,
      selectedSeason,
      seasonEndISO,
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
