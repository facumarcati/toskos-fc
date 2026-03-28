import "dotenv/config";

import express from "express";
import { engine } from "express-handlebars";
import { Server } from "socket.io";
import { createServer } from "http";
import connectMongoDB from "./config/db.js";
import session from "express-session";
import MongoStore from "connect-mongo";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

// 🔥 IMPORTAR passport DESPUÉS de dotenv
import passport from "./config/passport.js";

import matchesRouter from "./routes/matches.route.js";
import statsRouter from "./routes/stats.route.js";
import recordsRouter from "./routes/records.route.js";
import authRouter from "./routes/auth.route.js";
import profileRouter from "./routes/profile.route.js";

if (!process.env.SESSION_SECRET) {
  console.error("ERROR: SESSION_SECRET no está definido en .env");
  process.exit(1);
}

const app = express();
const http = createServer(app);
const io = new Server(http);
const PORT = process.env.PORT || 8081;

export { io };

connectMongoDB();

// Security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https://lh3.googleusercontent.com", "blob:"],
        connectSrc: ["'self'"],
      },
    },
  })
);

// Rate limit
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("src/public"));

// Session
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.URI_MONGODB,
      ttl: 7 * 24 * 60 * 60,
    }),
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  })
);

// Passport
app.use(passport.initialize());
app.use(passport.session());

// Views context
app.use((req, res, next) => {
  res.locals.currentUser = req.user || null;
  res.locals.activePage = req.originalUrl;
  next();
});

// Handlebars
app.engine(
  "handlebars",
  engine({
    helpers: {
      gt: (a, b) => a > b,
      eq: (a, b) => a === b,
      lt: (a, b) => a < b,
      add: (a, b) => a + b,
      isEC: (name) => name === "E/C",
      navActive: (current, page) =>
        current === page ? "nav-active" : "",
      json: (obj) => JSON.stringify(obj || []),
      toString: (val) => String(val),
      formatDate: (date) => {
        if (!date) return "";
        return new Date(date).toLocaleDateString("es-AR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
      },
    },
    runtimeOptions: {
      allowProtoPropertiesByDefault: true,
      allowProtoMethodsByDefault: true,
    },
  })
);

app.set("view engine", "handlebars");
app.set("views", "./src/views");

// Routes
app.get("/", (req, res) => {
  res.render("home");
});

app.use("/auth", authRouter);
app.use("/matches", matchesRouter);
app.use("/stats", statsRouter);
app.use("/records", recordsRouter);
app.use("/profile", profileRouter);

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render("home", {
    error: "Ocurrió un error inesperado.",
  });
});

// Start server
http.listen(PORT, () => {
  console.log("Servidor iniciado en http://localhost:" + PORT);
});