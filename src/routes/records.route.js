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
        winrate: 1,
      },
    },
  ]);

  const bestWinrate = [...winrateStats]
    .sort((a, b) => b.winrate - a.winrate)
    .slice(0, 3);

  const worstWinrate = [...winrateStats]
    .sort((a, b) => a.winrate - b.winrate)
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

  res.render("records", {
    topScorers,
    topAssists,
    topGAndA,
    topGoleadas,
    topGoals,
    bottomGoals,
    bestWinrate,
    worstWinrate,
    topOwnGoals,
    topMVPs,
    selectedSeason: season,
  });
});

export default router;
