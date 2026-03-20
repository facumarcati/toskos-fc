import { Router } from "express";
import Match from "../models/match.model.js";

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

  res.render("records", {
    topScorers,
    topAssists,
    topGAndA,
    topGoleadas,
    topGoals,
    selectedSeason: season,
  });
});

export default router;
