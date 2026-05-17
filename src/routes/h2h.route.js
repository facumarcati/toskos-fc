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
  })
    .sort({ name: 1 })
    .lean();

  const { playerA, playerB, mode = "vs", season = "2026" } = req.query;

  if (!playerA || !playerB || playerA === playerB) {
    return res.render("h2h", {
      players,
      selectedPlayerA: playerA,
      selectedPlayerB: playerB,
      selectedSeason: season,
      mode,
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
    const vsMatches = allMatches.filter((m) => {
      const pA = m.players.find((p) => p.player.toString() === playerA);
      const pB = m.players.find((p) => p.player.toString() === playerB);

      return pA && pB && pA.team !== pB.team;
    });

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
    const duoMatches = allMatches.filter((m) => {
      const pA = m.players.find((p) => p.player.toString() === playerA);
      const pB = m.players.find((p) => p.player.toString() === playerB);
      return pA && pB && pA.team === pB.team;
    });

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
  });
});

export default router;
