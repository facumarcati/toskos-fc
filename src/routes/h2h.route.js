import { Router } from "express";
import mongoose from "mongoose";
import Match from "../models/match.model.js";
import Player from "../models/player.model.js";

const router = Router();

const ACTIVE_SEASONS = ["2024", "2025", "2026"];

function buildSeasonFilter(season) {
  if (season && season !== "all") {
    const start = new Date(`${season}-01-01`);
    const end = new Date(`${Number(season) + 1}-01-01`);

    return { $gte: start, $lt: end };
  } else if (season === "all") {
    return {
      $gte: new Date(`${Math.min(...ACTIVE_SEASONS)}-01-01`),
      $lt: new Date(`${Math.max(...ACTIVE_SEASONS) + 1}-01-01`),
    };
  }

  return null;
}

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
    recordsCategory = "h2h",
  } = req.query;

  if (view === "history") {
    if (!player) {
      return res.render("h2h", {
        players,
        view,
        selectedSeason: season,
        biggestH2HDiffs,
        bestDuos,
        recordsCategory,
        mode,
      });
    }

    let historyFilter = {
      "players.player": new mongoose.Types.ObjectId(player),
    };

    const dateFilter = buildSeasonFilter(season);

    if (dateFilter) historyFilter.date = dateFilter;

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
      .sort((a, b) => {
        if (b.played !== a.played) {
          return b.played - a.played;
        }

        if (b.wins !== a.wins) {
          return b.wins - a.wins;
        }

        return a.losses - b.losses;
      });

    return res.render("h2h", {
      players,
      view,
      selectedPlayer: player,
      selectedSeason: season,
      historyStats,
      historyMode,
      mode,
    });
  }

  if (view === "records") {
    let matchFilter = {};
    const dateFilter = buildSeasonFilter(season);
    if (dateFilter) matchFilter.date = dateFilter;

    const h2hMatches = await Match.find(matchFilter)
      .populate("players.player")
      .lean();

    const h2hMap = {};
    for (const match of h2hMatches) {
      const validPlayers = match.players.filter(
        (p) => p.player && !p.player.guest && p.player.name !== "E/C",
      );

      for (let i = 0; i < validPlayers.length; i++) {
        for (let j = i + 1; j < validPlayers.length; j++) {
          const p1 = validPlayers[i];
          const p2 = validPlayers[j];

          if (p1.team === p2.team) continue;

          const ids = [
            p1.player._id.toString(),
            p2.player._id.toString(),
          ].sort();
          const key = ids.join("-");

          if (!h2hMap[key]) {
            const firstIsP1 = ids[0] === p1.player._id.toString();
            h2hMap[key] = {
              playerA: firstIsP1 ? p1.player.name : p2.player.name,
              playerB: firstIsP1 ? p2.player.name : p1.player.name,
              winsA: 0,
              winsB: 0,
              draws: 0,
              played: 0,
            };
          }

          const entry = h2hMap[key];
          const p1Goals = p1.team === "A" ? match.teamA : match.teamB;
          const p2Goals = p2.team === "A" ? match.teamA : match.teamB;

          entry.played++;

          const p1IsA = entry.playerA === p1.player.name;

          if (p1Goals > p2Goals) {
            if (p1IsA) entry.winsA++;
            else entry.winsB++;
          }
          if (p2Goals > p1Goals) {
            if (p1IsA) entry.winsB++;
            else entry.winsA++;
          }
          if (p1Goals === p2Goals) entry.draws++;
        }
      }
    }

    const biggestH2HDiffs = Object.values(h2hMap)
      .map((h2h) => {
        const diff = Math.abs(h2h.winsA - h2h.winsB);
        const leftIsDominant = h2h.winsA >= h2h.winsB;

        return {
          dominantPlayer: leftIsDominant ? h2h.playerA : h2h.playerB,
          dominatedPlayer: leftIsDominant ? h2h.playerB : h2h.playerA,
          dominantWins: leftIsDominant ? h2h.winsA : h2h.winsB,
          dominatedWins: leftIsDominant ? h2h.winsB : h2h.winsA,
          draws: h2h.draws || 0,
          played: h2h.played,
          diff,
        };
      })
      .filter((h2h) => h2h.played >= 4 && h2h.diff > 0)
      .sort((a, b) => {
        if (b.diff !== a.diff) return b.diff - a.diff;
        return b.played - a.played;
      });

    const duoMap = {};
    h2hMatches.forEach((match) => {
      const validPlayers = match.players.filter(
        (p) => p.player && !p.player.guest && p.player.name !== "E/C",
      );

      for (let i = 0; i < validPlayers.length; i++) {
        for (let j = i + 1; j < validPlayers.length; j++) {
          const p1 = validPlayers[i];
          const p2 = validPlayers[j];

          if (p1.team !== p2.team) continue;

          const ids = [
            p1.player._id.toString(),
            p2.player._id.toString(),
          ].sort();
          const key = ids.join("-");

          if (!duoMap[key]) {
            duoMap[key] = {
              playerA: p1.player.name,
              playerB: p2.player.name,
              wins: 0,
              draws: 0,
              losses: 0,
              played: 0,
            };
          }

          const duo = duoMap[key];
          const isWhite = p1.team === "A";
          const goalsFor = isWhite ? match.teamA : match.teamB;
          const goalsAgainst = isWhite ? match.teamB : match.teamA;

          duo.played++;
          if (goalsFor > goalsAgainst) duo.wins++;
          else if (goalsFor < goalsAgainst) duo.losses++;
          else duo.draws++;
        }
      }
    });

    const bestDuos = Object.values(duoMap)
      .filter((duo) => duo.played >= 4)
      .sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        if (a.losses !== b.losses) return a.losses - b.losses;
        return b.played - a.played;
      });

    return res.render("h2h", {
      players,
      view,
      selectedSeason: season,
      biggestH2HDiffs,
      bestDuos,
      recordsCategory,
      mode,
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

  const dateFilter = buildSeasonFilter(season);

  if (dateFilter) matchFilter.date = dateFilter;

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
