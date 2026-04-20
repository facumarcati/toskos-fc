import { Router } from "express";
import { io } from "../app.js";
import { getMatchMVP } from "../services/mvp.service.js";
import Match from "../models/match.model.js";
import Player from "../models/player.model.js";

const router = Router();

function isAuthenticated(req, res, next) {
  if (!req.session?.user) {
    return res.redirect("/login");
  }

  next();
}

function isAdmin(req, res, next) {
  if (req.session?.role !== "admin") {
    return res.status(403).render("error");
  }

  next();
}

router.get("/", async (req, res) => {
  const { season = "2026", order = "desc", venue = "", date = "" } = req.query;

  const user = req.session.user || null;

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

  if (venue) {
    filter.venue = new RegExp(venue, "i");
  }

  if (date) {
    const start = new Date(date);
    start.setUTCHours(0, 0, 0, 0);

    const end = new Date(date);
    end.setUTCHours(23, 59, 59, 999);

    filter.date = { $gte: start, $lte: end };
  }

  const venues = await Match.distinct("venue").then((v) =>
    v.filter(Boolean).sort(),
  );

  const matchesRaw = await Match.find(filter)
    .populate("players.player")
    .sort({ date: order === "asc" ? 1 : -1 })
    .lean();

  const matches = matchesRaw.map((match) => {
    const voteCountByPlayer = {};

    (match.mvpVotes || []).forEach((v) => {
      const pid = v.voted.toString();
      voteCountByPlayer[pid] = (voteCountByPlayer[pid] || 0) + 1;
    });

    return {
      ...match,
      mvpPlayers: getMatchMVP(match),
      voteCountByPlayer,
    };
  });

  const winsA = matches.filter((m) => m.teamA > m.teamB).length;
  const winsB = matches.filter((m) => m.teamB > m.teamA).length;
  const draws = matches.filter((m) => m.teamA === m.teamB).length;

  const goalsA = matches.reduce((acc, m) => acc + m.teamA, 0);
  const goalsB = matches.reduce((acc, m) => acc + m.teamB, 0);

  res.render("matches", {
    matches,
    selectedSeason: season || "all",
    matchCount: matches.length,
    selectedOrder: order,
    selectedVenue: venue,
    selectedDate: date,
    venues,
    winsA,
    winsB,
    draws,
    goalsA,
    goalsB,
    user,
  });
});

router.get("/new", isAdmin, async (req, res) => {
  const players = await Player.find().sort({ name: 1 }).lean();

  res.render("newMatch", { players });
});

router.get("/:id", async (req, res) => {
  const match = await Match.findById(req.params.id)
    .populate("players.player")
    .lean();

  if (!match) return res.status(404).send("Partido no encontrado");

  const user = req.session.user || null;

  const voteCountByPlayer = {};
  (match.mvpVotes || []).forEach((v) => {
    const pid = v.voted.toString();
    voteCountByPlayer[pid] = (voteCountByPlayer[pid] || 0) + 1;
  });

  const playerTeamMap = {};
  match.players.forEach((p) => {
    if (p.player?.name) {
      playerTeamMap[p.player.name.toLowerCase()] = p.team;
    }
  });

  let scoreA = 0;
  let scoreB = 0;

  const goalTimelineProcessed = (match.goalTimeline || []).map((g) => {
    let team = playerTeamMap[g.scorer?.toLowerCase()];
    const isOwnGoal = g.ownGoal === true;

    if (isOwnGoal && team) {
      team = team === "A" ? "B" : "A";
    } else if (!team) {
      team = playerTeamMap[g.assist?.toLowerCase()];
    }

    if (team === "A") scoreA++;
    else if (team === "B") scoreB++;

    return {
      scorer: g.scorer,
      assist: g.assist || "",
      team,
      isOwnGoal,
      scoreA,
      scoreB,
      side: team === "A" ? "left" : "right",
    };
  });

  res.render("matchDetail", {
    match: {
      ...match,
      mvpPlayers: getMatchMVP(match),
      voteCountByPlayer,
      goalTimelineProcessed,
    },
    user,
  });
});

router.post("/", isAdmin, async (req, res) => {
  const { teamA, teamB, date, venue, youtubeUrl, youtubeHlUrl } = req.body;
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

  const goalTimeline = Object.values(req.body.goalTimeline || {})
    .filter((g) => g.scorer?.trim())
    .map((g) => ({
      scorer: g.scorer.trim(),
      assist: g.assist?.trim() || "",
      ownGoal: g.ownGoal === "true",
    }));

  await Match.create({
    teamA,
    teamB,
    date: matchDate,
    venue,
    youtubeUrl,
    youtubeHlUrl,
    players: playerStats,
    goalTimeline,
  });

  io.emit("match:created");
  res.redirect("/matches");
});

router.get("/:id/edit", isAdmin, async (req, res) => {
  const { season = "2026" } = req.query;

  const match = await Match.findById(req.params.id).populate("players.player");
  const players = await Player.find().sort({ name: 1 }).lean();

  if (!match) return res.status(404).send("Partido no encontrado");

  match.dateFormatted = match.date.toISOString().split("T")[0];

  res.render("editMatch", { match, season, players });
});

router.post("/:id/edit", isAdmin, async (req, res) => {
  const { season = "2026" } = req.query;
  const { teamA, teamB, date, venue, youtubeUrl, youtubeHlUrl } = req.body;
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
    });
  }

  const matchDate = new Date(date);
  matchDate.setHours(matchDate.getHours() + 3);

  const goalTimeline = Object.values(req.body.goalTimeline || {})
    .filter((g) => g.scorer?.trim())
    .map((g) => ({
      scorer: g.scorer.trim(),
      assist: g.assist?.trim() || "",
      ownGoal: g.ownGoal === "true",
    }));

  await Match.findByIdAndUpdate(req.params.id, {
    teamA,
    teamB,
    date: matchDate,
    venue,
    youtubeUrl,
    youtubeHlUrl,
    players: playerStats,
    goalTimeline,
  });

  io.emit("match:updated");
  res.redirect(`/matches?season=${season}`);
});

router.post("/:id/delete", isAdmin, async (req, res) => {
  const { season = "2026" } = req.query;
  await Match.findByIdAndDelete(req.params.id);

  io.emit("match:deleted");
  res.redirect(`/matches?season=${season}`);
});

router.post("/:id/vote-mvp", async (req, res) => {
  if (!req.session?.userId) {
    return res.status(403).json({ error: "Debes estar logueado para votar" });
  }

  const { playerId } = req.body;
  const match = await Match.findById(req.params.id);

  if (!match) return res.status(404).send("Partido no encontrado");

  const voterId = req.session.userId.toString();

  match.mvpVotes = match.mvpVotes.filter(
    (v) => v.voter?.toString() !== voterId,
  );

  match.mvpVotes.push({ voter: voterId, voted: playerId });

  await match.save();

  io.emit("mvp:voted", { matchId: req.params.id });
  res.json({ ok: true });
});

export default router;
