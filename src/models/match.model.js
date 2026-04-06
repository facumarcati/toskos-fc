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
    required: true,
    default: Date.now,
  },
  venue: { type: String, default: "" },
  youtubeUrl: { type: String, default: "" },
  youtubeHlUrl: { type: String, default: "" },
  teamA: Number,
  teamB: Number,
  players: [playerStatsSchema],
  mvpVotes: [
    {
      voter: String,
      voted: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Player",
      },
    },
  ],
});

const Match = mongoose.model("Match", matchSchema);

export default Match;
