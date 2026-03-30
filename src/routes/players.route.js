import { Router } from "express";
import User from "../models/user.model.js";
import Match from "../models/match.model.js";
import Player from "../models/player.model.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/:id", requireAuth, async (req, res) => {
  const player = await Player.findById(req.params.id);
  if (!player) return res.status(404).send("Jugador no encontrado");

  const user = player.userId ? await User.findById(player.userId).select("displayName avatar").lean() : null;

  const agg = await Match.aggregate([
    { $match: { "players.player": player._id } },
    { $unwind: "$players" },
    { $match: { "players.player": player._id } },
    {
      $addFields: {
        win: {
          $cond: [
            {
              $or: [
                { $and: [{ $eq: ["$players.team", "A"] }, { $gt: ["$teamA", "$teamB"] }] },
                { $and: [{ $eq: ["$players.team", "B"] }, { $gt: ["$teamB", "$teamA"] }] },
              ],
            },
            1, 0,
          ],
        },
        draw: { $cond: [{ $eq: ["$teamA", "$teamB"] }, 1, 0] },
        loss: {
          $cond: [
            {
              $or: [
                { $and: [{ $eq: ["$players.team", "A"] }, { $lt: ["$teamA", "$teamB"] }] },
                { $and: [{ $eq: ["$players.team", "B"] }, { $lt: ["$teamB", "$teamA"] }] },
              ],
            },
            1, 0,
          ],
        },
      },
    },
    {
      $group: {
        _id: null,
        matches: { $sum: 1 },
        goals: { $sum: "$players.goals" },
        assists: { $sum: "$players.assists" },
        wins: { $sum: "$win" },
        draws: { $sum: "$draw" },
        losses: { $sum: "$loss" },
      },
    },
  ]);

  const stats = agg[0] || { matches: 0, goals: 0, assists: 0, wins: 0, draws: 0, losses: 0 };

  const recentMatches = await Match.find({ "players.player": player._id })
    .populate("players.player")
    .sort({ date: -1 })
    .limit(10);

  res.render("player", { player, user, stats, recentMatches });
});

export default router;