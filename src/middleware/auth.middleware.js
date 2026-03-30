// Redirect to login if not authenticated
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

// Require admin or superadmin role (can edit matches)
export const requireAdmin = (req, res, next) => {
  if (req.isAuthenticated() && (req.user.role === "admin" || req.user.role === "superadmin")) {
    return next();
  }
  res.status(403).render("403", { layout: "main" });
};

// Require superadmin role only
export const requireSuperAdmin = (req, res, next) => {
  if (req.isAuthenticated() && req.user.role === "superadmin") return next();
  res.status(403).render("403", { layout: "main" });
};

// Redirect to onboarding if not completed yet
export const requireOnboarding = (req, res, next) => {
  if (!req.isAuthenticated()) return next();
  if (!req.user.onboardingDone && req.path !== "/onboarding") {
    return res.redirect("/auth/onboarding");
  }
  next();
};
