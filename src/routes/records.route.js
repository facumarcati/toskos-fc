import { Router } from "express";
import { getMatchMVP } from "../services/mvp.service.js";
import Match from "../models/match.model.js";
import Player from "../models/player.model.js";

const router = Router();

router.get("/", async (req, res) => {
  const { season = "2026" } = req.query;

  let matchFilter = {};

  if (season && season !== "all") {
    const start = new Date(`${season}-01-01`);
    const end = new Date(`${Number(season) + 1}-01-01`);
    matchFilter.date = { $gte: start, $lt: end };
  }

  const topScorers = await Match.aggregate([
    { $match: matchFilter },
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
      $project: {
        name: "$playerInfo.name",
        goals: "$players.goals",
        date: "$date",
        venue: "$venue",
        teamA: "$teamA",
        teamB: "$teamB",
      },
    },
    { $sort: { goals: -1 } },
    { $limit: 3 },
  ]);

  const topAssists = await Match.aggregate([
    { $match: matchFilter },
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
      $project: {
        name: "$playerInfo.name",
        assists: "$players.assists",
        date: "$date",
        venue: "$venue",
        teamA: "$teamA",
        teamB: "$teamB",
      },
    },
    { $sort: { assists: -1 } },
    { $limit: 3 },
  ]);

  const topGAndA = await Match.aggregate([
    { $match: matchFilter },
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
      $project: {
        name: "$playerInfo.name",
        goals: "$players.goals",
        assists: "$players.assists",
        ga: { $add: ["$players.goals", "$players.assists"] },
        date: "$date",
        venue: "$venue",
        teamA: "$teamA",
        teamB: "$teamB",
      },
    },
    { $sort: { ga: -1, goals: -1 } },
    { $limit: 3 },
  ]);

  const topGoleadas = await Match.aggregate([
    { $match: matchFilter },
    {
      $addFields: {
        diff: { $abs: { $subtract: ["$teamA", "$teamB"] } },
      },
    },
    { $sort: { diff: -1 } },
    { $limit: 3 },
    {
      $project: {
        teamA: 1,
        teamB: 1,
        diff: 1,
        date: 1,
        venue: 1,
      },
    },
  ]);

  const topGoals = await Match.aggregate([
    { $match: matchFilter },
    {
      $addFields: {
        totalGoals: { $add: ["$teamA", "$teamB"] },
      },
    },
    { $sort: { totalGoals: -1 } },
    { $limit: 3 },
    {
      $project: {
        teamA: 1,
        teamB: 1,
        totalGoals: 1,
        date: 1,
        venue: 1,
      },
    },
  ]);

  const bottomGoals = await Match.aggregate([
    { $match: matchFilter },
    {
      $addFields: {
        totalGoals: { $add: ["$teamA", "$teamB"] },
      },
    },
    { $sort: { totalGoals: 1 } },
    { $limit: 3 },
    {
      $project: {
        teamA: 1,
        teamB: 1,
        totalGoals: 1,
        date: 1,
        venue: 1,
      },
    },
  ]);

  const winrateStats = await Match.aggregate([
    { $match: matchFilter },
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
      $addFields: {
        playerTeamGoals: {
          $cond: [{ $eq: ["$players.team", "A"] }, "$teamA", "$teamB"],
        },
        opponentGoals: {
          $cond: [{ $eq: ["$players.team", "A"] }, "$teamB", "$teamA"],
        },
      },
    },
    {
      $addFields: {
        win: {
          $cond: [{ $gt: ["$playerTeamGoals", "$opponentGoals"] }, 1, 0],
        },
      },
    },
    {
      $group: {
        _id: "$players.player",
        matches: { $sum: 1 },
        wins: { $sum: "$win" },
        losses: {
          $sum: {
            $cond: [{ $lt: ["$playerTeamGoals", "$opponentGoals"] }, 1, 0],
          },
        },
      },
    },
    { $match: { matches: { $gte: 3 } } },
    {
      $addFields: {
        winrate: {
          $round: [
            {
              $multiply: [{ $divide: ["$wins", "$matches"] }, 100],
            },
            1,
          ],
        },
        lossrate: {
          $round: [
            {
              $multiply: [{ $divide: ["$losses", "$matches"] }, 100],
            },
            1,
          ],
        },
      },
    },
    {
      $lookup: {
        from: "players",
        localField: "_id",
        foreignField: "_id",
        as: "playerInfo",
      },
    },
    { $unwind: "$playerInfo" },
    {
      $match: {
        "playerInfo.name": { $ne: "E/C" },
      },
    },
    {
      $project: {
        name: "$playerInfo.name",
        matches: 1,
        wins: 1,
        losses: 1,
        winrate: 1,
        lossrate: 1,
      },
    },
  ]);

  const bestWinrate = [...winrateStats]
    .sort((a, b) => b.winrate - a.winrate)
    .slice(0, 3);

  const worstWinrate = [...winrateStats]
    .sort((a, b) => a.winrate - b.winrate)
    .slice(0, 3);

  const bestLossrate = [...winrateStats]
    .sort((a, b) => a.lossrate - b.lossrate)
    .slice(0, 3);

  const worstLossrate = [...winrateStats]
    .sort((a, b) => b.lossrate - a.lossrate)
    .slice(0, 3);

  const topOwnGoals = await Match.aggregate([
    { $match: matchFilter },
    { $unwind: "$goalTimeline" },
    { $match: { "goalTimeline.ownGoal": true } },
    {
      $group: {
        _id: { $toLower: "$goalTimeline.scorer" },
        name: { $first: "$goalTimeline.scorer" },
        ownGoals: { $sum: 1 },
      },
    },
    { $sort: { ownGoals: -1 } },
    { $limit: 5 },
  ]);

  const matchesForMVP = await Match.find(matchFilter)
    .populate("players.player")
    .lean();

  const mvpCount = [];

  for (const match of matchesForMVP) {
    const mvpIds = getMatchMVP(match);

    for (const playerId of mvpIds) {
      mvpCount[playerId] = (mvpCount[playerId] || 0) + 1;
    }
  }

  const topMVPs = await Promise.all(
    Object.entries(mvpCount)
      .sort((a, b) => b[1] - a[1])
      .map(async ([playerId, count]) => {
        const player = await Player.findById(playerId).lean();
        return { name: player?.name || "Desconocido", mvps: count };
      }),
  );

  const offensiveEfficiency = await Match.aggregate([
    { $match: matchFilter },
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
    {
      $match: {
        "playerInfo.guest": { $ne: true },
        "playerInfo.name": { $ne: "E/C" },
      },
    },
    {
      $group: {
        _id: "$players.player",
        name: { $first: "$playerInfo.name" },
        matches: { $sum: 1 },
        goals: { $sum: "$players.goals" },
        assists: { $sum: "$players.assists" },
      },
    },
    {
      $match: {
        matches: { $gte: 3 },
      },
    },
    {
      $addFields: {
        goalContributions: {
          $add: ["$goals", "$assists"],
        },
        goalsPerMatch: {
          $round: [{ $divide: ["$goals", "$matches"] }, 2],
        },
        assistsPerMatch: {
          $round: [{ $divide: ["$assists", "$matches"] }, 2],
        },
        gaPerMatch: {
          $round: [
            {
              $divide: [{ $add: ["$goals", "$assists"] }, "$matches"],
            },
            2,
          ],
        },
      },
    },
    {
      $project: {
        name: 1,
        matches: 1,
        goals: 1,
        assists: 1,
        goalContributions: 1,
        goalsPerMatch: 1,
        assistsPerMatch: 1,
        gaPerMatch: 1,
      },
    },
  ]);

  const bestGoalsPerMatch = [...offensiveEfficiency]
    .sort((a, b) => b.goalsPerMatch - a.goalsPerMatch)
    .slice(0, 3);

  const bestAssistsPerMatch = [...offensiveEfficiency]
    .sort((a, b) => b.assistsPerMatch - a.assistsPerMatch)
    .slice(0, 3);

  const bestGAPerMatch = [...offensiveEfficiency]
    .sort((a, b) => b.gaPerMatch - a.gaPerMatch)
    .slice(0, 3);

  const worstGoalsPerMatch = [...offensiveEfficiency]
    .filter((player) => player.goals > 0)
    .sort((a, b) => a.goalsPerMatch - b.goalsPerMatch)
    .slice(0, 3);

  const worstAssistsPerMatch = [...offensiveEfficiency]
    .filter((player) => player.assists > 0)
    .sort((a, b) => a.assistsPerMatch - b.assistsPerMatch)
    .slice(0, 3);

  const worstGAPerMatch = [...offensiveEfficiency]
    .filter((player) => player.goalContributions > 0)
    .sort((a, b) => a.gaPerMatch - b.gaPerMatch)
    .slice(0, 3);

  const fiveGoalMatches = await Match.aggregate([
    { $match: matchFilter },
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
    {
      $match: {
        "playerInfo.guest": { $ne: true },
        "playerInfo.name": { $ne: "E/C" },
        "players.goals": { $gte: 5 },
      },
    },
    {
      $group: {
        _id: "$players.player",
        name: { $first: "$playerInfo.name" },
        fiveGoalMatches: { $sum: 1 },
        bestMatch: { $max: "$players.goals" },
      },
    },
    { $sort: { fiveGoalMatches: -1, bestMatch: -1, name: 1 } },
  ]);

  const fiveAssistMatches = await Match.aggregate([
    { $match: matchFilter },
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
    {
      $match: {
        "playerInfo.guest": { $ne: true },
        "playerInfo.name": { $ne: "E/C" },
        "players.assists": { $gte: 5 },
      },
    },
    {
      $group: {
        _id: "$players.player",
        name: { $first: "$playerInfo.name" },
        fiveAssistMatches: { $sum: 1 },
        bestMatch: { $max: "$players.assists" },
      },
    },
    {
      $sort: {
        fiveAssistMatches: -1,
        bestMatch: -1,
        name: 1,
      },
    },
  ]);

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

        const ids = [p1.player._id.toString(), p2.player._id.toString()].sort();

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

        if (p1Goals === p2Goals) {
          entry.draws++;
        }
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

        const ids = [p1.player._id.toString(), p2.player._id.toString()].sort();

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
      if (b.wins !== a.wins) {
        return b.wins - a.wins;
      }

      if (a.losses !== b.losses) {
        return a.losses - b.losses;
      }

      return b.played - a.played;
    });

  res.render("records", {
    topScorers,
    topAssists,
    topGAndA,
    topGoleadas,
    topGoals,
    bottomGoals,
    bestWinrate,
    worstWinrate,
    bestLossrate,
    worstLossrate,
    topOwnGoals,
    topMVPs,
    bestGoalsPerMatch,
    bestAssistsPerMatch,
    bestGAPerMatch,
    worstGoalsPerMatch,
    worstAssistsPerMatch,
    worstGAPerMatch,
    fiveGoalMatches,
    fiveAssistMatches,
    biggestH2HDiffs,
    bestDuos,
    selectedSeason: season,
  });
});

export default router;
