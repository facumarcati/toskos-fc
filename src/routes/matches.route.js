import { Router } from "express";
import { io } from "../app.js";
import Match from "../models/match.model.js";
import Player from "../models/player.model.js";
import User from "../models/user.model.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/", async (req, res) => {
  const { season = "2026", order = "desc" } = req.query;

  let filter = {};
  const validSeasons = ["2024", "2025", "2026"];

  if (season && season !== "all" && validSeasons.includes(season)) {
    const start = new Date(`${season}-01-01`);
    const end = new Date(`${Number(season) + 1}-01-01`);
    filter.date = { $gte: start, $lt: end };
  }

  const matches = await Match.find(filter)
    .populate("players.player")
    .sort({ date: order === "asc" ? 1 : -1 });

  res.render("matches", {
    matches,
    selectedSeason: season || "all",
    matchCount: matches.length,
    selectedOrder: order,
  });
});

router.get("/new", requireAuth, async (req, res) => {
  // Pass registered users so they can be selected as players
  const registeredUsers = await User.find({}, "username displayName avatar _id").lean();
  // Also get all existing players linked to users
  const linkedPlayers = await Player.find({ userId: { $ne: null } }, "name userId").lean();

  const usersWithPlayer = registeredUsers.map((u) => {
    const linked = linkedPlayers.find((p) => String(p.userId) === String(u._id));
    return { ...u, playerName: linked ? linked.name : u.displayName || u.username };
  });

  res.render("newMatch", { registeredUsers: usersWithPlayer });
});

router.post("/", requireAuth, async (req, res) => {
  const { teamA, teamB, date, venue } = req.body;
  let players = req.body.players;

  players = Object.values(players || {});
  players = players.filter((p) => p.name && p.name.trim() !== "");

  if (players.length === 0) return res.send("Debe haber al menos un jugador");

  const playerStats = [];

  for (const p of players) {
    const name = p.name.trim();
    const isGuest = p.guest === "on";
    const linkedUserId = p.userId && p.userId !== "" ? p.userId : null;

    let player = await Player.findOne({ name: new RegExp(`^${name}$`, "i") });

    if (!player) {
      player = await Player.create({ name, userId: linkedUserId });
    } else if (linkedUserId && !player.userId) {
      // Link existing player to user if not already linked
      player.userId = linkedUserId;
      await player.save();
    }

    playerStats.push({
      player: player._id,
      team: p.team,
      goals: Number(p.goals) || 0,
      assists: Number(p.assists) || 0,
      guest: isGuest,
    });
  }

  const matchDate = new Date(date);
  matchDate.setHours(matchDate.getHours() + 3);

  await Match.create({ teamA, teamB, date: matchDate, venue, players: playerStats });

  io.emit("match:created");
  res.redirect("/matches");
});

router.get("/:id/edit", requireAuth, async (req, res) => {
  const { season = "2026" } = req.query;
  const match = await Match.findById(req.params.id).populate("players.player");
  if (!match) return res.status(404).send("Partido no encontrado");

  match.dateFormatted = match.date.toISOString().split("T")[0];

  const registeredUsers = await User.find({}, "username displayName avatar _id").lean();
  const linkedPlayers = await Player.find({ userId: { $ne: null } }, "name userId").lean();
  const usersWithPlayer = registeredUsers.map((u) => {
    const linked = linkedPlayers.find((p) => String(p.userId) === String(u._id));
    return { ...u, playerName: linked ? linked.name : u.displayName || u.username };
  });

  res.render("editMatch", { match, season, registeredUsers: usersWithPlayer });
});

router.post("/:id/edit", requireAuth, async (req, res) => {
  const { season = "2026" } = req.query;
  const { teamA, teamB, date, venue } = req.body;
  let players = req.body.players;

  players = Object.values(players || {}).filter(
    (p) => typeof p.name === "string" && p.name.trim() !== ""
  );

  const playerStats = [];

  for (const p of players) {
    const name = String(p.name).trim();
    const linkedUserId = p.userId && p.userId !== "" ? p.userId : null;

    let player = await Player.findOne({ name: new RegExp(`^${name}$`, "i") });
    if (!player) {
      player = await Player.create({ name, userId: linkedUserId });
    } else if (linkedUserId && !player.userId) {
      player.userId = linkedUserId;
      await player.save();
    }

    playerStats.push({
      player: player._id,
      team: p.team,
      goals: Number(p.goals) || 0,
      assists: Number(p.assists) || 0,
      guest: p.guest === "on",
    });
  }

  const matchDate = new Date(date);
  matchDate.setHours(matchDate.getHours() + 3);

  await Match.findByIdAndUpdate(req.params.id, {
    teamA, teamB, date: matchDate, venue, players: playerStats,
  });

  io.emit("match:updated");
  res.redirect(`/matches?season=${season}`);
});

router.post("/:id/delete", requireAuth, async (req, res) => {
  const { season = "2026" } = req.query;
  await Match.findByIdAndDelete(req.params.id);
  io.emit("match:deleted");
  res.redirect(`/matches?season=${season}`);
});

export default router;
