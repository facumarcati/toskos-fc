import { Router } from "express";
import mongoose from "mongoose";
import Match from "../models/match.model.js";
import Player from "../models/player.model.js";

const router = Router();

router.get("/", async (req, res) => {
  const activePlayerIds = await Match.distinct("players.player");

  const players = await Player.find({
    _id: { $in: activePlayerIds },
    name: { $ne: "E/C" },
    guest: { $ne: true },
  })
    .sort({ name: 1 })
    .lean();

  const {
    playerA,
    playerB,
    player,
    mode = "vs",
    historyMode = "vs",
    season = "2026",
    view = "compare",
  } = req.query;

  if (view === "history") {
    if (!player) {
      return res.render("h2h", {
        players,
        view,
        selectedPlayer: player,
        selectedSeason: season,
        historyMode,
      });
    }

    let historyFilter = {
      "players.player": new mongoose.Types.ObjectId(player),
    };

    if (season !== "all") {
      const start = new Date(`${season}-01-01`);
      const end = new Date(`${Number(season) + 1}-01-01`);

      historyFilter.date = {
        $gte: start,
        $lt: end,
      };
    }

    const matches = await Match.find(historyFilter)
      .populate("players.player")
      .lean();

    const historyMap = {};

    for (const match of matches) {
      const target = match.players.find(
        (p) => p.player?._id.toString() === player,
      );

      if (!target) continue;

      const relatedPlayers = match.players.filter((p) => {
        if (!p.player) return false;

        if (p.player._id.toString() === player) return false;

        if (p.player.guest) return false;

        if (p.player.name === "E/C") return false;

        if (historyMode === "vs") {
          return p.team !== target.team;
        }

        return p.team === target.team;
      });

      for (const related of relatedPlayers) {
        const key = related.player._id.toString();

        if (!historyMap[key]) {
          historyMap[key] = {
            opponent: related.player.name,
            wins: 0,
            draws: 0,
            losses: 0,
            played: 0,
          };
        }

        const entry = historyMap[key];

        entry.played++;

        if (historyMode === "vs") {
          const playerGoals = target.team === "A" ? match.teamA : match.teamB;

          const opponentGoals =
            related.team === "A" ? match.teamA : match.teamB;

          if (playerGoals > opponentGoals) entry.wins++;
          else if (playerGoals < opponentGoals) entry.losses++;
          else entry.draws++;
        } else {
          const goalsFor = target.team === "A" ? match.teamA : match.teamB;

          const goalsAgainst = target.team === "A" ? match.teamB : match.teamA;

          if (goalsFor > goalsAgainst) entry.wins++;
          else if (goalsFor < goalsAgainst) entry.losses++;
          else entry.draws++;
        }
      }
    }

    const historyStats = Object.values(historyMap)
      .map((h) => ({
        ...h,
        winrate: h.played > 0 ? ((h.wins / h.played) * 100).toFixed(1) : 0,
      }))
      .sort((a, b) => b.played - a.played);

    return res.render("h2h", {
      players,
      view,
      selectedPlayer: player,
      selectedSeason: season,
      historyStats,
      historyMode,
    });
  }

  if (!playerA || !playerB || playerA === playerB) {
    return res.render("h2h", {
      players,
      selectedPlayerA: playerA,
      selectedPlayerB: playerB,
      selectedSeason: season,
      mode,
      view,
      historyMode,
    });
  }

  const playerAId = new mongoose.Types.ObjectId(playerA);
  const playerBId = new mongoose.Types.ObjectId(playerB);

  let matchFilter = {
    "players.player": { $all: [playerAId, playerBId] },
  };

  if (season !== "all") {
    const start = new Date(`${season}-01-01`);
    const end = new Date(`${Number(season) + 1}-01-01`);
    matchFilter.date = { $gte: start, $lt: end };
  }

  const allMatches = await Match.find(matchFilter).lean();

  const playerADoc = await Player.findById(playerA).lean();
  const playerBDoc = await Player.findById(playerB).lean();

  let stats = null;

  if (mode === "vs") {
    const vsMatches = allMatches
      .filter((m) => {
        const pA = m.players.find((p) => p.player.toString() === playerA);
        const pB = m.players.find((p) => p.player.toString() === playerB);
        return pA && pB && pA.team !== pB.team;
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .map((m) => ({
        ...m,
        teamOfA: m.players.find((p) => p.player.toString() === playerA)?.team,
        teamOfB: m.players.find((p) => p.player.toString() === playerB)?.team,
      }));

    let winsA = 0,
      winsB = 0,
      draws = 0;

    vsMatches.forEach((m) => {
      const pA = m.players.find((p) => p.player.toString() === playerA);
      const isAWhite = pA.team === "A";
      const goalsA = isAWhite ? m.teamA : m.teamB;
      const goalsB = isAWhite ? m.teamB : m.teamA;

      if (goalsA > goalsB) winsA++;
      else if (goalsA < goalsB) winsB++;
      else draws++;
    });

    stats = {
      played: vsMatches.length,
      winsA,
      winsB,
      draws,
      matches: vsMatches,
    };
  } else {
    const duoMatches = allMatches
      .filter((m) => {
        const pA = m.players.find((p) => p.player.toString() === playerA);
        const pB = m.players.find((p) => p.player.toString() === playerB);
        return pA && pB && pA.team === pB.team;
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .map((m) => ({
        ...m,
        teamOfA: m.players.find((p) => p.player.toString() === playerA)?.team,
      }));

    let wins = 0,
      draws = 0,
      losses = 0;

    duoMatches.forEach((m) => {
      const pA = m.players.find((p) => p.player.toString() === playerA);
      const isWhite = pA.team === "A";
      const goalsFor = isWhite ? m.teamA : m.teamB;
      const goalsAgainst = isWhite ? m.teamB : m.teamA;

      if (goalsFor > goalsAgainst) wins++;
      else if (goalsFor < goalsAgainst) losses++;
      else draws++;
    });

    const winrate =
      duoMatches.length > 0 ? ((wins / duoMatches.length) * 100).toFixed(1) : 0;

    stats = {
      played: duoMatches.length,
      wins,
      draws,
      losses,
      winrate,
      matches: duoMatches,
    };
  }

  res.render("h2h", {
    players,
    playerA: playerADoc,
    playerB: playerBDoc,
    selectedPlayerA: playerA,
    selectedPlayerB: playerB,
    mode,
    stats,
    selectedSeason: season,
    view,
    historyMode,
  });
});

export default router;
