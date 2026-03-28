import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import User from "../models/user.model.js";
import Match from "../models/match.model.js";
import Player from "../models/player.model.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

// Multer config — store in public/uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "src/public/uploads"),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `avatar_${req.user._id}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Solo se permiten imágenes JPG, PNG o WEBP."));
  },
});

// GET /profile — own profile
router.get("/", requireAuth, async (req, res) => {
  const player = await Player.findOne({ userId: req.user._id });

  let stats = null;
  let recentMatches = [];

  if (player) {
    // Aggregate stats for this player
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

    stats = agg[0] || { matches: 0, goals: 0, assists: 0, wins: 0, draws: 0, losses: 0 };

    // Recent matches (last 5)
    recentMatches = await Match.find({ "players.player": player._id })
      .populate("players.player")
      .sort({ date: -1 })
      .limit(5);
  }

  res.render("profile", { stats, recentMatches, player });
});

// POST /profile/avatar — upload profile picture
router.post("/avatar", requireAuth, upload.single("avatar"), async (req, res) => {
  if (!req.file) return res.redirect("/profile");

  const avatarUrl = `/uploads/${req.file.filename}`;
  await User.findByIdAndUpdate(req.user._id, { avatar: avatarUrl });
  res.redirect("/profile");
});

// POST /profile/link-player — link account to existing player by name
router.post("/link-player", requireAuth, async (req, res) => {
  const { playerName } = req.body;
  if (!playerName) return res.redirect("/profile");

  // Check if user already has a linked player
  const existing = await Player.findOne({ userId: req.user._id });
  if (existing) return res.redirect("/profile");

  // Find or create player with this name
  let player = await Player.findOne({ name: new RegExp(`^${playerName.trim()}$`, "i") });
  if (!player) {
    player = await Player.create({ name: playerName.trim(), userId: req.user._id });
  } else {
    player.userId = req.user._id;
    await player.save();
  }

  res.redirect("/profile");
});

export default router;
