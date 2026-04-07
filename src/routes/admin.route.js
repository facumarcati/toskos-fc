import { Router } from "express";
import User from "../models/user.model.js";
import Player from "../models/player.model.js";

const router = Router();

// middleware simple para proteger ruta admin
function isAdmin(req, res, next) {
  if (req.session?.role !== "admin") {
    return res.status(403).render("error");
  }

  next();
}

router.get("/users", isAdmin, async (req, res) => {
  const pendingUsers = await User.find({ approved: false })
    .populate("player")
    .sort({ username: 1 })
    .lean();

  const approvedUsers = await User.find({ approved: true })
    .populate("player")
    .sort({ username: 1 })
    .lean();

  res.render("adminUsers", { pendingUsers, approvedUsers });
});

router.post("/users/:id/approve", isAdmin, async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { approved: true },
    { new: true },
  );

  await Player.findByIdAndUpdate(user.player, {
    user: user._id,
  });

  res.json({ success: true });
});

router.post("/users/:id/delete", isAdmin, async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).send("Usuario no encontrado");
  }

  if (user.player) {
    await Player.findByIdAndUpdate(user.player, {
      user: null,
    });
  }

  await User.findByIdAndDelete(req.params.id);

  res.redirect("/admin/users");
});

router.post("/users/:id/toggle", async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).send("Usuario no encontrado");
  }

  user.approved = !user.approved;

  await user.save();

  res.json({ success: true });
});

export default router;
