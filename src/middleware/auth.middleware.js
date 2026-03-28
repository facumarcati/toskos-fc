// Protect routes — redirect to login if not authenticated
export const requireAuth = (req, res, next) => {
  if (req.isAuthenticated()) return next();
  req.session.returnTo = req.originalUrl;
  res.redirect("/auth/login");
};

// Redirect logged-in users away from login/register pages
export const redirectIfAuth = (req, res, next) => {
  if (req.isAuthenticated()) return res.redirect("/");
  next();
};

// Require admin role
export const requireAdmin = (req, res, next) => {
  if (req.isAuthenticated() && req.user.role === "admin") return next();
  res.status(403).render("error", { message: "Acceso denegado." });
};
