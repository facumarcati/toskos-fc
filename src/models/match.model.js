import mongoose from "mongoose";

const playerStatsSchema = new mongoose.Schema({
  player: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Player",
  },
  team: String,
  goals: {
    type: Number,
    default: 0,
  },
  assists: {
    type: Number,
    default: 0,
  },
});

const matchSchema = new mongoose.Schema({
  date: {
    type: Date,
    default: Date.now,
  },
  teamA: Number,
  teamB: Number,
  players: [playerStatsSchema],
});

const Match = mongoose.model("Match", matchSchema);

export default Match;
