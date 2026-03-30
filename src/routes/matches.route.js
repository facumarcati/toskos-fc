import { Router } from "express";
import { io } from "../app.js";
import Match from "../models/match.model.js";
import Player from "../models/player.model.js";

const router = Router();

router.get("/", async (req, res) => {
  const { season = "2026", order = "desc" } = req.query;

  let filter = {};

  const validSeasons = ["2024", "2025", "2026"];

  if (season && season !== "all" && validSeasons.includes(season)) {
    const start = new Date(`${season}-01-01`);
    const end = new Date(`${Number(season) + 1}-01-01`);

    filter.date = {
      $gte: start,
      $lt: end,
    };
  }

  const matches = await Match.find(filter)
    .populate("players.player")
    .sort({ date: order === "asc" ? 1 : -1 });

  const winsA = matches.filter((m) => m.teamA > m.teamB).length;
  const winsB = matches.filter((m) => m.teamB > m.teamA).length;
  const draws = matches.filter((m) => m.teamA === m.teamB).length;

  res.render("matches", {
    matches,
    selectedSeason: season || "all",
    matchCount: matches.length,
    selectedOrder: order,
    winsA,
    winsB,
    draws,
  });
});

router.get("/new", (req, res) => {
  res.render("newMatch");
});

router.post("/", async (req, res) => {
  const { teamA, teamB, date, venue, youtubeUrl } = req.body;
  let players = req.body.players;

  players = Object.values(players || {});

  players = players.filter((p) => p.name && p.name.trim() !== "");

  if (players.length === 0) {
    return res.send("Debe haber al menos un jugador");
  }

  const playerStats = [];

  for (const p of players) {
    const name = p.name.trim();

    let player = await Player.findOne({ name: new RegExp(`^${name}$`, "i") });

    const isGuest = p.guest === "on";

    if (!player) {
      player = await Player.create({
        name,
      });
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

  await Match.create({
    teamA,
    teamB,
    date: matchDate,
    venue,
    youtubeUrl,
    players: playerStats,
  });

  io.emit("match:created");
  res.redirect("/matches");
});

router.get("/:id/edit", async (req, res) => {
  const { season = "2026" } = req.query;
  const match = await Match.findById(req.params.id).populate("players.player");

  if (!match) return res.status(404).send("Partido no encontrado");

  match.dateFormatted = match.date.toISOString().split("T")[0];

  res.render("editMatch", { match, season });
});

router.post("/:id/edit", async (req, res) => {
  const { season = "2026" } = req.query;
  const { teamA, teamB, date, venue, youtubeUrl } = req.body;
  let players = req.body.players;

  players = Object.values(players || {}).filter(
    (p) => typeof p.name === "string" && p.name.trim() !== "",
  );

  const playerStats = [];

  for (const p of players) {
    const name = String(p.name).trim();
    let player = await Player.findOne({ name: new RegExp(`^${name}$`, "i") });

    if (!player) player = await Player.create({ name });

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
    teamA,
    teamB,
    date: matchDate,
    venue,
    youtubeUrl,
    players: playerStats,
  });

  io.emit("match:updated");
  res.redirect(`/matches?season=${season}`);
});

router.post("/:id/delete", async (req, res) => {
  const { season = "2026" } = req.query;
  await Match.findByIdAndDelete(req.params.id);

  io.emit("match:deleted");
  res.redirect(`/matches?season=${season}`);
});

export default router;
