import { Router } from "express";
import Match from "../models/match.model.js";

const router = Router();

router.get("/", async (req, res) => {
  const { season = "2026", guests } = req.query;
  const includeGuests = guests === "1";

  let matchFilter = {};

  if (season && season !== "all") {
    const start = new Date(`${season}-01-01`);
    const end = new Date(`${Number(season) + 1}-01-01`);

    matchFilter.date = { $gte: start, $lt: end };
  }

  const stats = await Match.aggregate([
    { $match: matchFilter },
    { $unwind: "$players" },
    ...(!includeGuests ? [{ $match: { "players.guest": { $ne: true } } }] : []),
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
      $addFields: {
        win: {
          $cond: [
            {
              $or: [
                {
                  $and: [
                    { $eq: ["$players.team", "A"] },
                    { $gt: ["$teamA", "$teamB"] },
                  ],
                },
                {
                  $and: [
                    { $eq: ["$players.team", "B"] },
                    { $gt: ["$teamB", "$teamA"] },
                  ],
                },
              ],
            },
            1,
            0,
          ],
        },
        draw: {
          $cond: [{ $eq: ["$teamA", "$teamB"] }, 1, 0],
        },
        lose: {
          $cond: [
            {
              $or: [
                {
                  $and: [
                    { $eq: ["$players.team", "A"] },
                    { $lt: ["$teamA", "$teamB"] },
                  ],
                },
                {
                  $and: [
                    { $eq: ["$players.team", "B"] },
                    { $lt: ["$teamB", "$teamA"] },
                  ],
                },
              ],
            },
            1,
            0,
          ],
        },
      },
    },
    {
      $group: {
        _id: "$players.player",
        name: { $first: "$playerInfo.name" },
        isGuest: { $first: "$players.guest" },
        matches: { $sum: 1 },
        wins: { $sum: "$win" },
        draws: { $sum: "$draw" },
        losses: { $sum: "$lose" },
        goals: { $sum: "$players.goals" },
        assists: { $sum: "$players.assists" },
      },
    },
    { $sort: { goals: -1, assists: -1, matches: 1 } },
  ]);

  res.render("stats", { stats, selectedSeason: season, includeGuests });
});

export default router;
