// src/models/project.model.js
const mongoose = require("mongoose");
const { encrypt, decrypt } = require("../security/encryption");

const projectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: {
      type: String,
      get: decrypt,
      set: encrypt,
    },
    createdAt: { type: Date, default: Date.now },
  },
  {
    // Habilitar la ejecucion de getters al serializar a JSON/Object
    toJSON: { getters: true },
    toObject: { getters: true },
  },
);

module.exports = mongoose.model("Project", projectSchema);
