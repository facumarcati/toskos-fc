import { Router } from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import User from "../models/user.model.js";
import Match from "../models/match.model.js";
import Player from "../models/player.model.js";
import { requireAuth, requireSuperAdmin } from "../middleware/auth.middleware.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, "..", "public", "uploads");

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `avatar_${req.user._id}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    allowed.includes(file.mimetype)
      ? cb(null, true)
      : cb(new Error("Solo se permiten imágenes JPG, PNG o WEBP."));
  },
});

const router = Router();

// GET /profile — own profile or another user's profile (admin/superadmin)
router.get("/", requireAuth, async (req, res) => {
  const isViewingOther = req.query.view && (req.user.role === "admin" || req.user.role === "superadmin");
  const targetUserId = isViewingOther ? req.query.view : req.user._id;
  
  const targetUser = await User.findById(targetUserId).select("-password");
  if (!targetUser) return res.redirect("/profile");

  targetUser.effectiveAvatar = targetUser.avatar || null;

  const player = await Player.findOne({ userId: targetUserId });
  let stats = null;
  let recentMatches = [];

  if (player) {
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
    if (stats.matches > 0) {
      stats.winrate = Math.round((stats.wins / stats.matches) * 100);
    } else {
      stats.winrate = 0;
    }

    recentMatches = await Match.find({ "players.player": player._id })
      .populate("players.player")
      .sort({ date: -1 })
      .limit(5);
  }

  res.render("profile", { 
    stats, 
    recentMatches, 
    player,
    isViewingOther: targetUserId !== String(req.user._id),
    viewedUser: targetUser 
  });
});

// POST /profile/avatar
router.post("/avatar", requireAuth, (req, res, next) => {
  upload.single("avatar")(req, res, async (err) => {
    if (err) {
      return res.redirect("/profile");
    }

    if (!req.file) {
      return res.redirect("/profile");
    }

    try {
      const avatarUrl = `/uploads/${req.file.filename}`;
      await User.findByIdAndUpdate(req.user._id, { avatar: avatarUrl });

      const updatedUser = await User.findById(req.user._id).select("-password");
      req.logIn(updatedUser, (loginErr) => {
        if (loginErr) return next(loginErr);
        res.redirect("/profile");
      });
    } catch (e) {
      next(e);
    }
  });
});

// ── Admin: list all users (superadmin only) ──────────────────────────────────
router.get("/admin/users", requireSuperAdmin, async (req, res) => {
  const users = await User.find({}, "username displayName email role avatar createdAt onboardingDone")
    .sort({ createdAt: -1 })
    .lean();
  res.render("admin/users", { users });
});

// POST /profile/admin/users/:id/role — superadmin sets role
router.post("/admin/users/:id/role", requireSuperAdmin, async (req, res) => {
  const { role } = req.body;
  const allowed = ["user", "admin"];
  if (!allowed.includes(role)) return res.redirect("/profile/admin/users");

  await User.findByIdAndUpdate(req.params.id, { role });

  if (req.params.id === String(req.user._id)) {
    req.user.role = role;
  }

  res.redirect("/profile/admin/users");
});

// POST /profile/admin/users/:id/delete — superadmin deletes user
router.post("/admin/users/:id/delete", requireSuperAdmin, async (req, res) => {
  const userId = req.params.id;

  if (userId === String(req.user._id)) {
    return res.redirect("/profile/admin/users");
  }

  const userToDelete = await User.findById(userId);
  if (!userToDelete) return res.redirect("/profile/admin/users");

  await Player.deleteOne({ userId: userToDelete._id });
  await User.findByIdAndDelete(userId);

  res.redirect("/profile/admin/users");
});

export default router;
