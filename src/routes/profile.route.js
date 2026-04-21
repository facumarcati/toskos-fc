import { Router } from "express";
import User from "../models/user.model.js";

const router = Router();

router.get("/:username", async (req, res) => {
  const profileUser = await User.findOne({ username: req.params.username })
    .populate("player")
    .lean();

  if (!profileUser) return res.status(404).send("Usuario no encontrado");

  const sessionUser = req.session.user || null;
  const isOwner = sessionUser?.username === profileUser.username;

  res.render("profile", { profileUser, user: sessionUser, isOwner });
});

router.post("/:username/edit", async (req, res) => {
  if (req.session?.user?.username !== req.params.username) {
    return res.status(403).send("No autorizado");
  }

  const { nickname, bio, avatarUrl } = req.body;

  await User.findOneAndUpdate(
    { username: req.params.username },
    { nickname, bio, avatarUrl },
  );

  res.redirect(`/profile/${req.params.username}`);
});

export default router;
