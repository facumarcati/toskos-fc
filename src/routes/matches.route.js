import { Router } from "express";
import Match from "../models/match.model.js";
import Player from "../models/player.model.js";

const router = Router();

router.get("/", async (req, res) => {
  const { season } = req.query;

  let filter = {};

  if (season && season !== "all") {
    const start = new Date(`${season}-01-01`);
    const end = new Date(`${Number(season) + 1}-01-01`);

    filter.date = {
      $gte: start,
      $lt: end,
    };
  }

  const matches = await Match.find(filter)
    .populate("players.player")
    .sort({ date: -1 });

  res.render("matches", { matches, selectedSeason: season || "all" });
});

router.get("/new", (req, res) => {
  res.render("newMatch");
});

router.post("/", async (req, res) => {
  const { teamA, teamB, date } = req.body;
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
    players: playerStats,
  });

  res.redirect("/matches");
});

export default router;
