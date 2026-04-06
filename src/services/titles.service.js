import Match from "../models/match.model.js";

const medalsLimit = 3;

function getRankingPosition(ranking) {
  const result = [];

  let lastKey = null;
  let position = -1;

  ranking.forEach((p) => {
    const key = JSON.stringify({
      value: p.value,
      matches: p.matches,
      wins: p.wins,
      goals: p.goals,
      assists: p.assists,
    });

    if (key !== lastKey) {
      position++;
      lastKey = key;
    }

    result.push({
      ...p,
      position,
    });
  });

  return result;
}

export async function getTitlesByPlayer(season = "all") {
  const currentYear = new Date().getFullYear();

  let seasonsToEvaluate;

  if (season === "all") {
    seasonsToEvaluate = [2024, 2025, currentYear];
  } else {
    seasonsToEvaluate = [Number(season)];
  }

  const titlesMap = {};

  for (const s of seasonsToEvaluate) {
    const start = new Date(`${s}-01-01`);
    const end = new Date(`${s + 1}-01-01`);

    const seasonFilter = {
      date: { $gte: start, $lt: end },
    };

    const basePipeline = [
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
    ];

    const scorers = await Match.aggregate([
      ...basePipeline,

      {
        $group: {
          _id: "$players.player",
          value: { $sum: "$players.goals" },
          assists: { $sum: "$players.assists" },
          matches: { $sum: 1 },
        },
      },

      {
        $sort: {
          value: -1,
          assists: -1,
          matches: 1,
        },
      },
    ]);

    const assists = await Match.aggregate([
      ...basePipeline,

      {
        $group: {
          _id: "$players.player",
          value: { $sum: "$players.assists" },
          goals: { $sum: "$players.goals" },
          matches: { $sum: 1 },
        },
      },

      {
        $sort: {
          value: -1,
          goals: -1,
          matches: 1,
        },
      },
    ]);

    const matchesPlayed = await Match.aggregate([
      ...basePipeline,

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
        },
      },

      {
        $group: {
          _id: "$players.player",
          value: { $sum: 1 },
          wins: { $sum: "$win" },
          goals: { $sum: "$players.goals" },
          assists: { $sum: "$players.assists" },
        },
      },

      {
        $sort: {
          value: -1,
          wins: -1,
          goals: -1,
          assists: -1,
        },
      },
    ]);

    const wins = await Match.aggregate([
      ...basePipeline,

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
        },
      },

      {
        $group: {
          _id: "$players.player",
          value: { $sum: "$win" },
          matches: { $sum: 1 },
          goals: { $sum: "$players.goals" },
          assists: { $sum: "$players.assists" },
        },
      },

      {
        $sort: {
          value: -1,
          matches: 1,
          goals: -1,
          assists: -1,
        },
      },
    ]);

    const rankings = [scorers, assists, matchesPlayed, wins];

    rankings.forEach((ranking) => {
      const ranked = getRankingPosition(ranking);

      ranked.forEach((p) => {
        if (p.position < medalsLimit) {
          const id = p._id.toString();

          titlesMap[id] = (titlesMap[id] || 0) + 1;
        }
      });
    });
  }

  return titlesMap;
}

export async function getPlayerTrophies(playerId) {
  const currentYear = new Date().getFullYear();

  const completedSeasons = [2024, 2025].filter((y) => y < currentYear);

  const trophies = [];

  const medals = ["🥇", "🥈", "🥉"];

  for (const season of completedSeasons) {
    const start = new Date(`${season}-01-01`);
    const end = new Date(`${season + 1}-01-01`);

    const seasonFilter = {
      date: { $gte: start, $lt: end },
    };

    const basePipeline = [
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
    ];

    const scorers = await Match.aggregate([
      ...basePipeline,

      {
        $group: {
          _id: "$players.player",
          value: { $sum: "$players.goals" },
          assists: { $sum: "$players.assists" },
          matches: { $sum: 1 },
        },
      },

      {
        $sort: {
          value: -1,
          assists: -1,
          matches: 1,
        },
      },
    ]);

    const assists = await Match.aggregate([
      ...basePipeline,

      {
        $group: {
          _id: "$players.player",
          value: { $sum: "$players.assists" },
          goals: { $sum: "$players.goals" },
          matches: { $sum: 1 },
        },
      },

      {
        $sort: {
          value: -1,
          goals: -1,
          matches: 1,
        },
      },
    ]);

    const matchesPlayed = await Match.aggregate([
      ...basePipeline,

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
        },
      },

      {
        $group: {
          _id: "$players.player",
          value: { $sum: 1 },
          wins: { $sum: "$win" },
          goals: { $sum: "$players.goals" },
          assists: { $sum: "$players.assists" },
        },
      },

      {
        $sort: {
          value: -1,
          wins: -1,
          goals: -1,
          assists: -1,
        },
      },
    ]);

    const wins = await Match.aggregate([
      ...basePipeline,

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
        },
      },

      {
        $group: {
          _id: "$players.player",
          value: { $sum: "$win" },
          matches: { $sum: 1 },
          goals: { $sum: "$players.goals" },
          assists: { $sum: "$players.assists" },
        },
      },

      {
        $sort: {
          value: -1,
          matches: 1,
          goals: -1,
          assists: -1,
        },
      },
    ]);

    const rankings = [
      { data: scorers, label: "Goleador", unit: "goles" },

      { data: assists, label: "Asistidor", unit: "asistencias" },

      { data: matchesPlayed, label: "Más Partidos", unit: "PJ" },

      { data: wins, label: "Más Victorias", unit: "PG" },
    ];

    rankings.forEach((r) => {
      const ranked = getRankingPosition(r.data);

      const player = ranked.find((p) => p._id.toString() === playerId);

      if (player && player.position < 3) {
        trophies.push({
          season,

          type: r.label,

          medal: medals[player.position],

          position: player.position + 1,

          value: player.value,

          unit: r.unit,
        });
      }
    });
  }

  return trophies;
}
