import { Router } from "express";
import Player from "../models/player.model.js";
import Match from "../models/match.model.js";

const router = Router();

router.get("/:id", async (req, res) => {
  try {
    const playerId = req.params.id;

    const { season = "2026" } = req.query;

    const player = await Player.findById(playerId).lean();

    if (!player || player.name === "E/C") {
      return res.status(404).send("Jugador no encontrado");
    }

    const filter = {
      "players.player": playerId,
    };

    if (season !== "all") {
      const start = new Date(`${season}-01-01`);
      const end = new Date(`${Number(season) + 1}-01-01`);

      filter.date = {
        $gte: start,
        $lt: end,
      };
    }

    const allMatches = await Match.find(filter).lean();

    const stats = calculateStats(playerId, allMatches);

    const matches = (
      await Match.find(filter).sort({ date: -1 }).limit(3).lean()
    ).map((match) => {
      const playerStats = match.players.find(
        (p) => p.player.toString() === playerId,
      );

      return {
        ...match,
        playerStats,
      };
    });

    const totalMatches = allMatches.length;

    const currentYear = new Date().getFullYear();

    const completedSeasons = [2024, 2025].filter((y) => y < currentYear);

    const trophies = [];

    for (const season of completedSeasons) {
      const start = new Date(`${season}-01-01`);
      const end = new Date(`${season + 1}-01-01`);

      const seasonFilter = { date: { $gte: start, $lt: end } };

      const topScorers = await Match.aggregate([
        { $match: seasonFilter },
        { $unwind: "$players" },
        {
          $lookup: {
            from: "players",
            localField: "players.player",
            foreignField: "_id",
            as: "playerInfo",
          },
        },
        { $unwind: "$playerInfo" },
        { $match: { "playerInfo.guest": { $ne: true } } },
        {
          $group: {
            _id: "$players.player",
            name: { $first: "$playerInfo.name" },
            goals: { $sum: "$players.goals" },
            matches: { $sum: 1 },
          },
        },
        { $sort: { goals: -1, matches: 1 } },
      ]);

      const topAssists = await Match.aggregate([
        { $match: seasonFilter },
        { $unwind: "$players" },
        { $match: { "players.guest": { $ne: true } } },
        {
          $lookup: {
            from: "players",
            localField: "players.player",
            foreignField: "_id",
            as: "playerInfo",
          },
        },
        { $unwind: "$playerInfo" },
        {
          $group: {
            _id: "$players.player",
            name: { $first: "$playerInfo.name" },
            assists: { $sum: "$players.assists" },
            matches: { $sum: 1 },
          },
        },
        { $sort: { assists: -1, matches: 1 } },
      ]);

      const medals = ["🥇", "🥈", "🥉"];

      let lastGoals = null;
      let position = -1;

      topScorers.forEach((p, index) => {
        if (p.goals !== lastGoals) {
          position++;
          lastGoals = p.goals;
        }

        if (position < 3 && p._id.toString() === playerId) {
          trophies.push({
            season,
            type: "Goleador",
            medal: medals[position],
            position: position + 1,
            value: p.goals,
            unit: "goles",
          });
        }
      });

      let lastAssists = null;
      let positionA = -1;

      topAssists.forEach((p, i) => {
        if (p.assists !== lastAssists) {
          positionA++;
          lastAssists = p.assists;
        }

        if (positionA < 3 && p._id.toString() === playerId) {
          trophies.push({
            season,
            type: "Asistidor",
            medal: medals[positionA],
            position: positionA + 1,
            value: p.assists,
            unit: "asistencias",
          });
        }
      });
    }

    res.render("playerProfile", {
      player,
      stats,
      matches,
      totalMatches,
      selectedSeason: season,
      trophies,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error al cargar jugador");
  }
});

function calculateStats(playerId, matches) {
  let played = 0;
  let wins = 0;
  let draws = 0;
  let losses = 0;
  let goals = 0;
  let assists = 0;

  const white = {
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goals: 0,
    assists: 0,
  };

  const black = {
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goals: 0,
    assists: 0,
  };

  matches.forEach((match) => {
    const playerData = match.players.find(
      (p) => p.player.toString() === playerId,
    );

    if (!playerData) return;

    played++;

    const isWhite = playerData.team === "A";

    const goalsFor = isWhite ? match.teamA : match.teamB;
    const goalsAgainst = isWhite ? match.teamB : match.teamA;

    let result;

    if (goalsFor > goalsAgainst) {
      wins++;
      result = "win";
    } else if (goalsFor === goalsAgainst) {
      draws++;
      result = "draw";
    } else {
      losses++;
      result = "loss";
    }

    goals += playerData.goals || 0;
    assists += playerData.assists || 0;

    const teamStats = isWhite ? white : black;

    teamStats.played++;

    if (result === "win") teamStats.wins++;
    if (result === "draw") teamStats.draws++;
    if (result === "loss") teamStats.losses++;

    teamStats.goals += playerData.goals || 0;
    teamStats.assists += playerData.assists || 0;
  });

  const winrate = played > 0 ? ((wins / played) * 100).toFixed(1) : 0;

  const whiteWR =
    white.played > 0 ? ((white.wins / white.played) * 100).toFixed(1) : 0;

  const blackWR =
    black.played > 0 ? ((black.wins / black.played) * 100).toFixed(1) : 0;

  return {
    played,
    wins,
    draws,
    losses,
    goals,
    assists,
    winrate,
    white: {
      ...white,
      winrate: whiteWR,
    },
    black: {
      ...black,
      winrate: blackWR,
    },
  };
}

router.patch("/:id/guest", async (req, res) => {
  try {
    const { guest } = req.body;

    await Player.findByIdAndUpdate(req.params.id, { guest });

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error actualizando invitado" });
  }
});

router.patch("/:id/name", async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        error: "Nombre invaludo",
      });
    }

    if (name.trim().length < 2) {
      return res.status(400).json({
        error: "Nombre muy corto",
      });
    }

    if (name.length > 30) {
      return res.status(400).json({
        error: "Nombre muy largo",
      });
    }

    const player = await Player.findByIdAndUpdate(
      req.params.id,
      {
        name: name.trim(),
      },
      {
        new: true,
      },
    );

    if (!player) {
      return res.status(404).json({
        error: "Jugador no encontrado",
      });
    }

    res.json(player);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Error actualizando nombre",
    });
  }
});

router.get("/:id/matches", async (req, res) => {
  const { page = 1, season = "all", limit = 3 } = req.query;
  const limitNum = Math.min(parseInt(limit), 999);

  const skip = (page - 1) * limitNum;

  let filter = {
    "players.player": req.params.id,
  };

  if (season !== "all") {
    const start = new Date(`${season}-01-01`);
    const end = new Date(`${season}-12-31`);

    filter.date = { $gte: start, $lte: end };
  }

  const matches = await Match.find(filter)
    .sort({ date: -1 })
    .skip(skip)
    .limit(limitNum)
    .lean();

  res.json(matches);
});

export default router;
