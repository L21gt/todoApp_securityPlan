// generate-tokens.js
require("dotenv").config();
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("./src/models/user.model");

// Asegúrate de usar el mismo secreto que en tus tests
const JWT_SECRET = "secreto_super_seguro_abac_123";

async function generate() {
  await mongoose.connect(process.env.MONGODB_URI);

  const users = await User.find({});
  users.forEach((u) => {
    const token = jwt.sign({ userId: u._id }, JWT_SECRET, { expiresIn: "1h" });
    console.log(`Email: ${u.email} | Token: ${token}`);
  });

  process.exit();
}
generate();
