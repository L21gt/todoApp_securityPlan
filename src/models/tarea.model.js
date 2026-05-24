// src/models/tarea.model.js
const mongoose = require("mongoose");

const tareaSchema = new mongoose.Schema({
  title: { type: String, required: true },
  completed: { type: Boolean, default: false },

  // Nuevos atributos obligatorios para ABAC
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Project",
    required: true,
  },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Creador/Dueño de la tarea

  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Tarea", tareaSchema);
