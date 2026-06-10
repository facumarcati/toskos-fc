import { Router } from "express";
import { getTitlesByPlayer } from "../services/titles.service.js";
import Match from "../models/match.model.js";

const router = Router();

router.get("/", async (req, res) => {
  const {
    season = "2026",
    guests,
    sortBy = "goals",
    orderDir = "desc",
  } = req.query;

  const includeGuests = guests === "1";

  const validSorts = ["goals", "assists", "wins", "matches", "draws", "losses"];

  const sort = validSorts.includes(sortBy) ? sortBy : "goals";

  const sortDirection = orderDir === "asc" ? 1 : -1;

  const ACTIVE_SEASONS = ["2024", "2025", "2026"];

  let matchFilter = {};

  if (season && season !== "all") {
    const start = new Date(`${season}-01-01`);
    const end = new Date(`${Number(season) + 1}-01-01`);

    matchFilter.date = { $gte: start, $lt: end };
  } else if (season === "all") {
    matchFilter.date = {
      $gte: new Date(`${Math.min(...ACTIVE_SEASONS)}-01-01`),
      $lt: new Date(`${Math.max(...ACTIVE_SEASONS) + 1}-01-01`),
    };
  }

  const sortObj = {};

  if (sort !== "goals") {
    sortObj.isEC = 1;
  }

  sortObj[sort] = sortDirection;

  if (sort === "goals") {
    sortObj.assists = -1;
    sortObj.matches = 1;
  } else if (sort === "assists") {
    sortObj.goals = -1;
    sortObj.matches = 1;
  } else if (sort === "wins") {
    sortObj.matches = 1;
    sortObj.goals = -1;
    sortObj.assists = -1;
  } else if (sort === "matches") {
    sortObj.wins = -1;
    sortObj.goals = -1;
    sortObj.assists = -1;
  } else if (sort === "draws") {
    sortObj.matches = 1;
    sortObj.wins = -1;
    sortObj.goals = -1;
  } else if (sort === "losses") {
    sortObj.matches = 1;
    sortObj.wins = -1;
    sortObj.goals = -1;
  }

  const stats = await Match.aggregate([
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
    ...(!includeGuests
      ? [{ $match: { "playerInfo.guest": { $ne: true } } }]
      : []),
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
        isEC: { $eq: ["$playerInfo.name", "E/C"] },
      },
    },
    {
      $addFields: {
        win: { $cond: ["$isEC", 0, "$win"] },
        draw: { $cond: ["$isEC", 0, "$draw"] },
        lose: { $cond: ["$isEC", 0, "$lose"] },
      },
    },
    {
      $group: {
        _id: "$players.player",
        name: { $first: "$playerInfo.name" },
        isGuest: { $first: "$playerInfo.guest" },
        matches: {
          $sum: { $cond: [{ $eq: ["$playerInfo.name", "E/C"] }, 0, 1] },
        },
        wins: {
          $sum: { $cond: [{ $eq: ["$playerInfo.name", "E/C"] }, 0, "$win"] },
        },
        draws: {
          $sum: { $cond: [{ $eq: ["$playerInfo.name", "E/C"] }, 0, "$draw"] },
        },
        losses: {
          $sum: { $cond: [{ $eq: ["$playerInfo.name", "E/C"] }, 0, "$lose"] },
        },
        goals: { $sum: "$players.goals" },
        assists: { $sum: "$players.assists" },
      },
    },
    {
      $addFields: {
        isEC: { $eq: ["$name", "E/C"] },
      },
    },
    {
      $sort: sortObj,
    },
  ]);

  let titlesMap = {};

  if (season !== "2026") {
    titlesMap = await getTitlesByPlayer(season);
  }

  stats.forEach((player) => {
    player.titles = titlesMap[player._id?.toString()] || 0;
  });

  res.render("stats", {
    stats,
    selectedSeason: season,
    includeGuests,
    selectedSort: sort,
    selectedOrderDir: orderDir,
  });
});

export default router;
