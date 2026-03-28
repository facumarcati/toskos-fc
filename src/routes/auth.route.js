import { Router } from "express";
import passport from "passport";
import rateLimit from "express-rate-limit";
import User from "../models/user.model.js";
import { redirectIfAuth } from "../middleware/auth.middleware.js";

const router = Router();

// Rate limiter for login/register
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 10,
  message: "Demasiados intentos. Intentá de nuevo en 15 minutos.",
  standardHeaders: true,
  legacyHeaders: false,
});

// GET /auth/login
router.get("/login", redirectIfAuth, (req, res) => {
  const error = req.session.authError;
  delete req.session.authError;
  res.render("auth/login", { error, layout: "auth" });
});

// POST /auth/login
router.post("/login", redirectIfAuth, authLimiter, (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) return next(err);
    if (!user) {
      req.session.authError = info?.message || "Credenciales incorrectas.";
      return res.redirect("/auth/login");
    }
    req.logIn(user, (err) => {
      if (err) return next(err);
      const returnTo = req.session.returnTo || "/";
      delete req.session.returnTo;
      res.redirect(returnTo);
    });
  })(req, res, next);
});

// GET /auth/register
router.get("/register", redirectIfAuth, (req, res) => {
  const error = req.session.authError;
  delete req.session.authError;
  res.render("auth/register", { error, layout: "auth" });
});

// POST /auth/register
router.post("/register", redirectIfAuth, authLimiter, async (req, res, next) => {
  try {
    const { username, email, password, confirmPassword } = req.body;

    if (!username || !email || !password || !confirmPassword) {
      req.session.authError = "Todos los campos son obligatorios.";
      return res.redirect("/auth/register");
    }

    if (password !== confirmPassword) {
      req.session.authError = "Las contraseñas no coinciden.";
      return res.redirect("/auth/register");
    }

    if (password.length < 8) {
      req.session.authError = "La contraseña debe tener al menos 8 caracteres.";
      return res.redirect("/auth/register");
    }

    const existing = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username }],
    });

    if (existing) {
      req.session.authError = "El email o nombre de usuario ya está en uso.";
      return res.redirect("/auth/register");
    }

    const user = await User.create({ username, email, password, displayName: username });

    req.logIn(user, (err) => {
      if (err) return next(err);
      res.redirect("/");
    });
  } catch (err) {
    next(err);
  }
});

// GET /auth/logout
router.post("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy(() => res.redirect("/auth/login"));
  });
});

// Google OAuth
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/auth/login" }),
  (req, res) => {
    const returnTo = req.session.returnTo || "/";
    delete req.session.returnTo;
    res.redirect(returnTo);
  }
);

export default router;
