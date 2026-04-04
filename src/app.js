import express from "express";
import { engine } from "express-handlebars";
import { Server } from "socket.io";
import { createServer } from "http";
import connectMongoDB from "./config/db.js";
import dotenv from "dotenv";

import matchesRouter from "./routes/matches.route.js";
import statsRouter from "./routes/stats.route.js";
import recordsRouter from "./routes/records.route.js";
import authRouter from "./routes/auth.route.js";
import playerRouter from "./routes/player.route.js";

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

app.use((req, res, next) => {
  res.locals.activePage = req.originalUrl;
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

app.use("/matches", matchesRouter);
app.use("/stats", statsRouter);
app.use("/records", recordsRouter);
app.use("/api/auth", authRouter);
app.use("/players", playerRouter);

http.listen(PORT, () => {
  console.log("Servidor iniciado en http://localhost:" + PORT);
});
