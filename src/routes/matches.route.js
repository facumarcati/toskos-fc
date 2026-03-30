import { Router } from "express";
import { io } from "../app.js";
import Match from "../models/match.model.js";
import Player from "../models/player.model.js";
import User from "../models/user.model.js";
import { requireAdmin } from "../middleware/auth.middleware.js";

const router = Router();

function parseMoments(raw) {
  if (!raw) return [];
  return Object.values(raw)
    .filter((m) => m.type && m.minute !== "" && m.minute !== undefined)
    .map((m) => ({
      minute: Math.max(0, parseInt(m.minute) || 0),
      type: m.type,
      description: String(m.description || "").trim().slice(0, 100),
    }))
    .sort((a, b) => a.minute - b.minute);
}

// ── GET /matches ─────────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  const seasonParam = req.query.season || "all";
  const monthParam = req.query.month || "all";
  const order = req.query.order || "desc";
  const validSeasons = ["2024", "2025", "2026"];
  const validMonths = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];

  const season = validSeasons.includes(seasonParam) ? seasonParam : "all";
  const month = validMonths.includes(monthParam) ? monthParam : "all";

  let filter = {};

  if (season !== "all") {
    const start = new Date(`${season}-01-01`);
    const end = new Date(`${Number(season) + 1}-01-01`);
    filter.date = { $gte: start, $lt: end };
  }

  if (month !== "all") {
    const monthNum = parseInt(month, 10);
    const monthIndex = monthNum - 1;
    const year = season !== "all" ? parseInt(season, 10) : new Date().getFullYear();

    const startOfMonth = new Date(year, monthIndex, 1, 0, 0, 0, 0);
    const endOfMonth = new Date(year, monthIndex, 1, 0, 0, 0, 0);
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);

    filter.date = { $gte: startOfMonth, $lt: endOfMonth };
  }

  const matches = await Match.find(filter)
    .populate("players.player")
    .sort({ date: order === "asc" ? 1 : -1 });

  let winsA = 0, winsB = 0, draws = 0;
  matches.forEach(m => {
    if (m.teamA > m.teamB) winsA++;
    else if (m.teamB > m.teamA) winsB++;
    else draws++;
  });
  const total = matches.length || 1;
  const winrate = {
    teamA: Math.round((winsA / total) * 100),
    teamB: Math.round((winsB / total) * 100),
    draws: Math.round((draws / total) * 100),
  };

  const hasFilters = season !== "all" || month !== "all";

  res.render("matches", {
    matches,
    selectedSeason: season,
    selectedMonth: month,
    matchCount: matches.length,
    selectedOrder: order,
    currentUserRole: req.user ? req.user.role : null,
    hasFilters,
    winrate,
  });
});

// ── GET /matches/new ─────────────────────────────────────────────────────────
router.get("/new", requireAdmin, async (req, res) => {
  const registeredUsers = await User.find(
    { onboardingDone: true },
    "username displayName avatar _id"
  ).lean();
  const linkedPlayers = await Player.find({ userId: { $ne: null } }, "name userId").lean();
  const usersWithPlayer = registeredUsers.map((u) => {
    const linked = linkedPlayers.find((p) => String(p.userId) === String(u._id));
    return { ...u, playerName: linked ? linked.name : u.displayName || u.username };
  });
  res.render("newMatch", { registeredUsers: usersWithPlayer });
});

// ── GET /matches/:id ──────────────────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  const match = await Match.findById(req.params.id).populate("players.player");
  if (!match) return res.status(404).send("Partido no encontrado");

  const teamAPlayers = match.players.filter((p) => p.team === "A");
  const teamBPlayers = match.players.filter((p) => p.team === "B");
  const totalGoalsA = teamAPlayers.reduce((sum, p) => sum + (p.goals || 0), 0);
  const totalGoalsB = teamBPlayers.reduce((sum, p) => sum + (p.goals || 0), 0);

  const winner = totalGoalsA > totalGoalsB ? "A" : totalGoalsB > totalGoalsA ? "B" : "draw";

  const userRole = req.user ? req.user.role : null;

  res.render("match", {
    match,
    teamAPlayers,
    teamBPlayers,
    totalGoalsA,
    totalGoalsB,
    winner,
    userRole,
  });
});

// ── POST /matches ─────────────────────────────────────────────────────────────
router.post("/", requireAdmin, async (req, res) => {
  const { teamA, teamB, date, venue, youtubeUrl } = req.body;

  // Server-side validation
  if (!date || !String(date).trim()) {
    return res.status(400).send("La fecha del partido es obligatoria.");
  }
  if (!venue || !String(venue).trim()) {
    return res.status(400).send("El nombre de la cancha es obligatorio.");
  }

  let players = Object.values(req.body.players || {});
  players = players.filter((p) => p.name && String(p.name).trim() !== "");

  const teamAPlayers = players.filter((p) => p.team === "A");
  const teamBPlayers = players.filter((p) => p.team === "B");

  if (teamAPlayers.length === 0) {
    return res.status(400).send("El Equipo Blanco no tiene jugadores.");
  }
  if (teamBPlayers.length === 0) {
    return res.status(400).send("El Equipo Negro no tiene jugadores.");
  }

  const playerStats = [];

  for (const p of players) {
    const name = String(p.name).trim();
    const isGuest = p.guest === "on";
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
      guest: isGuest,
    });
  }

  const [year, month, day] = date.split('-').map(Number);
  const matchDate = new Date(year, month - 1, day, 12, 0, 0, 0);

  await Match.create({
    teamA: Number(teamA) || 0,
    teamB: Number(teamB) || 0,
    date: matchDate,
    venue: String(venue).trim(),
    youtubeUrl: youtubeUrl ? String(youtubeUrl).trim() : "",
    players: playerStats,
    moments: parseMoments(req.body.moments),
  });

  io.emit("match:created");
  res.redirect("/matches");
});

// ── GET /matches/:id/edit ─────────────────────────────────────────────────────
router.get("/:id/edit", requireAdmin, async (req, res) => {
  const { season = "2026" } = req.query;
  const match = await Match.findById(req.params.id).populate("players.player");
  if (!match) return res.status(404).send("Partido no encontrado");

  const d = match.date;
  match.dateFormatted = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const registeredUsers = await User.find(
    { onboardingDone: true },
    "username displayName avatar _id"
  ).lean();
  const linkedPlayers = await Player.find({ userId: { $ne: null } }, "name userId").lean();
  const usersWithPlayer = registeredUsers.map((u) => {
    const linked = linkedPlayers.find((p) => String(p.userId) === String(u._id));
    return { ...u, playerName: linked ? linked.name : u.displayName || u.username };
  });

  res.render("editMatch", { match, season, registeredUsers: usersWithPlayer });
});

// ── POST /matches/:id/edit ────────────────────────────────────────────────────
router.post("/:id/edit", requireAdmin, async (req, res) => {
  const { season = "2026" } = req.query;
  const { teamA, teamB, date, venue, youtubeUrl } = req.body;

  // Server-side validation
  if (!date || !String(date).trim()) {
    return res.status(400).send("La fecha del partido es obligatoria.");
  }
  if (!venue || !String(venue).trim()) {
    return res.status(400).send("El nombre de la cancha es obligatorio.");
  }

  let players = Object.values(req.body.players || {}).filter(
    (p) => typeof p.name === "string" && p.name.trim() !== ""
  );

  const teamAPlayers = players.filter((p) => p.team === "A");
  const teamBPlayers = players.filter((p) => p.team === "B");

  if (teamAPlayers.length === 0) {
    return res.status(400).send("El Equipo Blanco no tiene jugadores.");
  }
  if (teamBPlayers.length === 0) {
    return res.status(400).send("El Equipo Negro no tiene jugadores.");
  }

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

  const [year, month, day] = date.split('-').map(Number);
  const matchDate = new Date(year, month - 1, day, 12, 0, 0, 0);

  await Match.findByIdAndUpdate(req.params.id, {
    teamA: Number(teamA) || 0,
    teamB: Number(teamB) || 0,
    date: matchDate,
    venue: String(venue).trim(),
    youtubeUrl: youtubeUrl ? String(youtubeUrl).trim() : "",
    players: playerStats,
    moments: parseMoments(req.body.moments),
  });

  io.emit("match:updated");
  res.redirect(`/matches?season=${season}`);
});

// ── POST /matches/:id/delete ──────────────────────────────────────────────────
router.post("/:id/delete", requireAdmin, async (req, res) => {
  const { season = "2026" } = req.query;
  await Match.findByIdAndDelete(req.params.id);
  io.emit("match:deleted");
  res.redirect(`/matches?season=${season}`);
});

export default router;
