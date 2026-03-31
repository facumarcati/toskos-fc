import mongoose from "mongoose";

const playerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  guest: {
    type: Boolean,
    default: false,
  },
});

const Player = mongoose.model("Player", playerSchema);

export default Player;
