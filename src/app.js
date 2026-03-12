import express from "express";
import { engine } from "express-handlebars";
import connectMongoDB from "./config/db.js";
import dotenv from "dotenv";

import matchesRouter from "./routes/matches.route.js";
import statsRouter from "./routes/stats.route.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8081;

connectMongoDB();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("src/public"));

app.engine(
  "handlebars",
  engine({
    helpers: {
      gt: (a, b) => a > b,
      eq: (a, b) => a === b,
      lt: (a, b) => a < b,
      add: (a, b) => a + b,

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

app.use("/matches", matchesRouter);
app.use("/stats", statsRouter);

app.listen(PORT, () => {
  console.log("Servidor iniciado en http://localhost:" + PORT);
});
