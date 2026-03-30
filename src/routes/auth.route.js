import { Router } from "express";
import passport from "passport";
import rateLimit from "express-rate-limit";
import User from "../models/user.model.js";
import Player from "../models/player.model.js";
import { redirectIfAuth, requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
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
      // Send to onboarding if not done yet
      if (!user.onboardingDone) return res.redirect("/auth/onboarding");
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
  const formData = req.session.registerFormData || {};
  delete req.session.registerFormData;
  res.render("auth/register", { error, formData, layout: "auth" });
});

// POST /auth/register
router.post("/register", redirectIfAuth, authLimiter, async (req, res, next) => {
  try {
    const { firstName, lastName, birthDate, email, password, confirmPassword } = req.body;

    // Helper to re-render with error keeping form values (passwords never repopulated)
    const fail = (message) => res.render("auth/register", {
      error: message,
      formData: { firstName, lastName, birthDate, email },
      layout: "auth",
    });

    if (!firstName || !lastName || !birthDate || !email || !password || !confirmPassword) {
      return fail("Todos los campos son obligatorios.");
    }
    if (password !== confirmPassword) {
      return fail("Las contraseñas no coinciden.");
    }
    if (password.length < 6) {
      return fail("La contraseña debe tener al menos 6 caracteres.");
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return fail("El email ya está en uso.");
    }

    const baseUsername = `${firstName.trim().toLowerCase()}.${lastName.trim().toLowerCase()}`.replace(/\s+/g, "");
    let username = baseUsername;
    let suffix = 1;
    while (await User.findOne({ username })) {
      username = `${baseUsername}${suffix++}`;
    }

    const user = await User.create({
      username,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      birthDate: new Date(birthDate),
      email,
      password,
    });

    req.logIn(user, (err) => {
      if (err) return next(err);
      res.redirect("/auth/onboarding");
    });
  } catch (err) {
    next(err);
  }
});

// GET /auth/onboarding
router.get("/onboarding", requireAuth, (req, res) => {
  // Already done — skip
  if (req.user.onboardingDone) return res.redirect("/");
  const error = req.session.onboardingError;
  delete req.session.onboardingError;
  res.render("auth/onboarding", { error, layout: "auth" });
});

// POST /auth/onboarding
router.post("/onboarding", requireAuth, async (req, res, next) => {
  try {
    const { displayName } = req.body;

    if (!displayName || displayName.trim().length < 2) {
      req.session.onboardingError = "El nombre debe tener al menos 2 caracteres.";
      return res.redirect("/auth/onboarding");
    }

    const name = displayName.trim();

    // Update user
    await User.findByIdAndUpdate(req.user._id, {
      displayName: name,
      onboardingDone: true,
    });

    // Auto-create or link Player record
    let player = await Player.findOne({ name: new RegExp(`^${name}$`, "i") });
    if (!player) {
      await Player.create({ name, userId: req.user._id });
    } else if (!player.userId) {
      player.userId = req.user._id;
      await player.save();
    }

    // Refresh session user
    const updatedUser = await User.findById(req.user._id);
    req.logIn(updatedUser, (err) => {
      if (err) return next(err);
      res.redirect("/");
    });
  } catch (err) {
    next(err);
  }
});

// POST /auth/logout
router.post("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy(() => res.redirect("/auth/login"));
  });
});

// Google OAuth
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/auth/login" }),
  (req, res) => {
    if (!req.user.onboardingDone) return res.redirect("/auth/onboarding");
    const returnTo = req.session.returnTo || "/";
    delete req.session.returnTo;
    res.redirect(returnTo);
  }
);

export default router;
