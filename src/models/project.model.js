// src/models/project.model.js
const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    // La rúbrica pide que este campo se cifre. Si ya aplicaste tu lógica
    // de cifrado (Clase 12) usando setters/getters, mantenla aquí.
    // Si no, este es el tipo base:
    description: {
      type: String,
    },
    // ESTE ES EL CAMPO CRÍTICO QUE FALTA O ESTÁ MAL NOMBRADO
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    visibility: {
      type: String,
      enum: ["private", "internal"],
      default: "internal",
    },
    status: {
      type: String,
      enum: ["active", "archived"],
      default: "active",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Project", projectSchema);
