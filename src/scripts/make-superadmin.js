/**
 * Script para asignar rol superadmin a un usuario por email.
 * Uso: node src/scripts/make-superadmin.js tu@email.com
 */
import "dotenv/config";
import mongoose from "mongoose";
import User from "../models/user.model.js";

const email = process.argv[2];

if (!email) {
  console.error("Uso: node src/scripts/make-superadmin.js tu@email.com");
  process.exit(1);
}

await mongoose.connect(process.env.URI_MONGODB);

const user = await User.findOneAndUpdate(
  { email: email.toLowerCase() },
  { role: "superadmin", onboardingDone: true },
  { new: true }
);

if (!user) {
  console.error(`No se encontró ningún usuario con email: ${email}`);
} else {
  console.log(`✅ ${user.displayName || user.username} (${user.email}) ahora es superadmin.`);
}

await mongoose.disconnect();
