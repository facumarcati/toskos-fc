import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  player: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Player",
  },
  approved: {
    type: Boolean,
    default: false,
  },
  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user",
  },
  nickname: {
    type: String,
    default: "",
  },
  bio: {
    type: String,
    default: "",
  },
  avatarUrl: {
    type: String,
    default: "",
  },
});

const User = mongoose.model("User", userSchema);

export default User;
