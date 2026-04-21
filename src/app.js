import express from "express";
import { engine } from "express-handlebars";
import { Server } from "socket.io";
import { createServer } from "http";
import connectMongoDB from "./config/db.js";
import dotenv from "dotenv";
import session from "express-session";

import matchesRouter from "./routes/matches.route.js";
import statsRouter from "./routes/stats.route.js";
import recordsRouter from "./routes/records.route.js";
import authRouter from "./routes/auth.route.js";
import playerRouter from "./routes/player.route.js";
import adminRouter from "./routes/admin.route.js";
import profileRouter from "./routes/profile.route.js";

import Player from "./models/player.model.js";

dotenv.config();

const app = express();
const http = createServer(app);
const io = new Server(http);
const PORT = process.env.PORT || 8081;

export { io };

connectMongoDB();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("src/public"));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "mvp-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 30,
      sameSite: "lax",
      secure: false,
    },
  }),
);

app.use((req, res, next) => {
  res.locals.activePage = req.originalUrl;

  res.locals.userId = req.session.userId;
  res.locals.role = req.session.role;

  res.locals.user = req.session.user || null;

  next();
});

app.engine(
  "handlebars",
  engine({
    helpers: {
      gt: (a, b) => a > b,
      eq: (a, b) => a === b,
      lt: (a, b) => a < b,
      or: (a, b) => a || b,
      add: (a, b) => a + b,
      isEC: (name) => name === "E/C",
      json: (context) => JSON.stringify(context),
      navActive: (current, page) => {
        return current === page ? "nav-active" : "";
      },
      formatDate: (date) => {
        if (!date) return "";
        return new Date(date).toLocaleDateString("es-AR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
      },
      includes(array, value) {
        if (!array) return false;
        return array.some((id) => id.toString() === value.toString());
      },
      getVoteCount(voteCountByPlayer, playerId) {
        return voteCountByPlayer?.[playerId?.toString()] || 0;
      },
      and: function (...args) {
        args.pop();
        return args.every(Boolean);
      },
    },
    runtimeOptions: {
      allowProtoPropertiesByDefault: true,
      allowProtoMethodsByDefault: true,
    },
  }),
);

app.set("view engine", "handlebars");
app.set("views", "./src/views");

app.get("/", (req, res) => {
  res.render("home");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/register", async (req, res) => {
  const players = await Player.find().sort({ name: 1 }).lean();

  res.render("register", { players });
});

app.use("/matches", matchesRouter);
app.use("/stats", statsRouter);
app.use("/records", recordsRouter);
app.use("/api/auth", authRouter);
app.use("/players", playerRouter);
app.use("/admin", adminRouter);
app.use("/profile", profileRouter);

http.listen(PORT, () => {
  console.log("Servidor iniciado en http://localhost:" + PORT);
});
