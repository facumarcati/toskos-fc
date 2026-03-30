/**
 * Seed 10 test users with full profile data.
 * Uso: node src/scripts/seed-users.js
 */
import "dotenv/config";
import mongoose from "mongoose";
import User from "../models/user.model.js";
import Player from "../models/player.model.js";

await mongoose.connect(process.env.URI_MONGODB);

const testUsers = [
  { firstName: "Lucas",    lastName: "Romero",    displayName: "El Tanque",   email: "tanque@test.com",    birth: "1995-03-12" },
  { firstName: "Matías",   lastName: "Fernández", displayName: "Pibe Diez",   email: "pibediez@test.com",  birth: "1997-07-22" },
  { firstName: "Sebastián",lastName: "López",     displayName: "El Flaco",    email: "flaco@test.com",     birth: "1993-11-05" },
  { firstName: "Nicolás",  lastName: "Torres",    displayName: "Toro",        email: "toro@test.com",      birth: "1996-01-30" },
  { firstName: "Andrés",   lastName: "Volkov",    displayName: "El Ruso",     email: "ruso@test.com",      birth: "1994-09-18" },
  { firstName: "Facundo",  lastName: "Méndez",    displayName: "Cachete",     email: "cachete@test.com",   birth: "1998-04-07" },
  { firstName: "Diego",    lastName: "Morales",   displayName: "El Negro",    email: "negro@test.com",     birth: "1992-06-14" },
  { firstName: "Ezequiel", lastName: "Suárez",    displayName: "Pelusa",      email: "pelusa@test.com",    birth: "1999-12-25" },
  { firstName: "Ramiro",   lastName: "Khalil",    displayName: "El Turco",    email: "turco@test.com",     birth: "1995-08-03" },
  { firstName: "Gonzalo",  lastName: "Acosta",    displayName: "Gambeta",     email: "gambeta@test.com",   birth: "1997-02-19" },
];

let created = 0;
let skipped = 0;

for (const u of testUsers) {
  const exists = await User.findOne({ email: u.email });
  if (exists) { skipped++; continue; }

  const username = `${u.firstName.toLowerCase()}.${u.lastName.toLowerCase()}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const user = await User.create({
    username,
    firstName: u.firstName,
    lastName: u.lastName,
    birthDate: new Date(u.birth),
    displayName: u.displayName,
    email: u.email,
    password: "Test1234!",
    onboardingDone: true,
    role: "user",
  });

  const playerExists = await Player.findOne({ name: new RegExp(`^${u.displayName}$`, "i") });
  if (!playerExists) {
    await Player.create({ name: u.displayName, userId: user._id });
  }

  created++;
  console.log(`✅ ${u.firstName} ${u.lastName} → "${u.displayName}" (${u.email})`);
}

console.log(`\nListo. ${created} usuarios creados, ${skipped} ya existían.`);
console.log("Contraseña de todos: Test1234!");

await mongoose.disconnect();
