import Match from "../models/match.model.js";

const seasonFormatter = new Intl.DateTimeFormat("en", {
  timeZone: "America/Argentina/Buenos_Aires",
  year: "numeric",
});

export function createClubSummaryService({ model = Match, now = () => new Date(), ttl = 60_000 } = {}) {
  let cached;
  let pending;
  let revision = 0;

  function invalidate() {
    revision++;
    cached = null;
    pending = null;
  }

  async function getSummary() {
    const date = now();
    const season = Number(seasonFormatter.format(date));
    if (cached?.season === season && cached.expiresAt > date.getTime()) return cached.data;
    if (pending?.season === season) return pending.promise;
    const requestRevision = revision;

    const promise = (async () => {
      const [latestMatch, [rankings]] = await Promise.all([
        model.findOne({ date: { $lte: date } })
          .sort({ date: -1, _id: -1 })
          .select("date teamA teamB matchType")
          .lean(),
        model.aggregate([
          {
            $match: {
              date: { $gte: new Date(`${season}-01-01`), $lt: new Date(`${season + 1}-01-01`) },
              matchType: { $ne: "friendly" },
            },
          },
          { $unwind: "$players" },
          {
            $group: {
              _id: "$players.player",
              goals: { $sum: "$players.goals" },
              assists: { $sum: "$players.assists" },
              matches: { $sum: 1 },
            },
          },
          {
            $lookup: {
              from: "players", localField: "_id", foreignField: "_id", as: "playerInfo",
            },
          },
          { $unwind: "$playerInfo" },
          { $match: { "playerInfo.guest": { $ne: true }, "playerInfo.name": { $ne: "E/C" } } },
          { $addFields: { name: "$playerInfo.name" } },
          {
            $facet: {
              scorers: [
                { $sort: { goals: -1, assists: -1, matches: 1, name: 1 } },
                { $limit: 3 },
                { $project: { name: 1, value: "$goals" } },
              ],
              assists: [
                { $sort: { assists: -1, goals: -1, matches: 1, name: 1 } },
                { $limit: 3 },
                { $project: { name: 1, value: "$assists" } },
              ],
            },
          },
        ]),
      ]);
      const data = {
        season,
        seasonEndISO: new Date(`${season + 1}-01-01T00:00:00-03:00`).toISOString(),
        updatedAt: now().toISOString(),
        latestMatch,
        scorers: rankings?.scorers ?? [],
        assists: rankings?.assists ?? [],
      };
      if (revision === requestRevision) {
        cached = { season, data, expiresAt: now().getTime() + ttl };
      }
      return data;
    })();
    pending = { season, promise };
    try {
      return await promise;
    } finally {
      if (pending?.promise === promise) pending = null;
    }
  }

  return { getSummary, invalidate };
}

const summaryService = createClubSummaryService();
export const getClubSummary = summaryService.getSummary;
export const invalidateClubSummary = summaryService.invalidate;
