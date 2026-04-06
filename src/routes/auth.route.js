import { Router } from "express";
import User from "../models/user.model.js";
import Player from "../models/player.model.js";

const router = Router();

router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const ADMIN_USER = process.env.ADMIN_USER;
  const ADMIN_PASS = process.env.ADMIN_PASS;

  if (username === ADMIN_USER && password === ADMIN_PASS) {
    req.session.userId = "admin";
    req.session.role = "admin";
    req.session.user = {
      _id: "admin",
      username: "Admin",
      role: "admin",
    };

    return res.json({ success: true, role: "admin" });
  }

  const user = await User.findOne({ username });
  if (!user || user.password !== password) {
    return res
      .status(401)
      .json({ success: false, message: "Credenciales incorrectas" });
  }

  req.session.userId = user._id;
  req.session.role = "user";
  req.session.user = {
    _id: user._id,
    username: user.username,
    player: user.player,
    role: "user",
  };

  res.json({ success: true, role: "user" });
});

router.post("/register", async (req, res) => {
  try {
    const { username, password, playerId } = req.body;

    if (!username || !password || !playerId)
      return res.status(400).json({ success: false, message: "Faltan datos" });

    if (await User.findOne({ username }))
      return res
        .status(400)
        .json({ success: false, message: "Usuario ya existe" });

    if (!(await Player.findById(playerId)))
      return res
        .status(400)
        .json({ success: false, message: "Player inválido" });

    if (await User.findOne({ player: playerId }))
      return res
        .status(400)
        .json({ success: false, message: "Ese jugador ya tiene cuenta" });

    const user = await User.create({ username, password, player: playerId });

    req.session.userId = user._id;
    req.session.role = "user";
    req.session.user = {
      _id: user._id,
      username: user.username,
      player: user.player,
      role: "user",
    };

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ success: false, message: "Error al registrar usuario" });
  }
});

router.post("/logout", (req, res) => {
  req.session.destroy();

  res.json({
    success: true,
  });
});

router.get("/me", async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ success: false });
    }

    if (req.session.role === "admin") {
      return res.json({ success: true, username: "Admin", role: "admin" });
    }

    const user = await User.findById(req.session.userId).populate("player");
    if (!user) return res.status(404).json({ success: false });

    res.json({
      success: true,
      username: user.username,
      role: req.session.role,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

export default router;
