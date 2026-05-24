// src/models/membership.model.js
const mongoose = require("mongoose");

const membershipSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Project",
    required: true,
  },
  role: {
    type: String,
    enum: ["project_admin", "developer", "viewer"],
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
});

// Índice compuesto único: Un usuario solo puede tener un rol por proyecto
membershipSchema.index({ userId: 1, projectId: 1 }, { unique: true });

module.exports = mongoose.model("Membership", membershipSchema);
