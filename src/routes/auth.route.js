import { Router } from "express";

const router = Router();

router.post("/login", (req, res) => {
  const ADMIN_USER = process.env.ADMIN_USER;
  const ADMIN_PASS = process.env.ADMIN_PASS;

  const { username, password } = req.body;

  if (username === ADMIN_USER && password === ADMIN_PASS) {
    return res.json({
      success: true,
      token: "admin-token",
    });
  }

  res.status(401).json({ success: false, message: "Credenciales incorrectas" });
});

export default router;
