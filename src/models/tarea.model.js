// src/models/tarea.model.js
const mongoose = require("mongoose");
const { encrypt, decrypt } = require("../security/encryption");

const tareaSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: {
      type: String,
      get: decrypt,
    },
    sensitive: { type: Boolean, default: false },
    completed: { type: Boolean, default: false },

    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    createdAt: { type: Date, default: Date.now },
  },
  {
    toJSON: { getters: true },
    toObject: { getters: true },
  },
);

// Middleware de mutacion condicional pre-guardado
tareaSchema.pre("save", function (next) {
  if (this.isModified("description") || this.isModified("sensitive")) {
    if (this.sensitive) {
      this.description = encrypt(this.description);
    } else {
      this.description = decrypt(this.description);
    }
  }
  next();
});

// Middleware para queries de actualizacion (ej. findOneAndUpdate, updateOne)
tareaSchema.pre(["findOneAndUpdate", "updateOne"], function (next) {
  const update = this.getUpdate();

  if (
    update.sensitive !== undefined ||
    (update.$set && update.$set.sensitive !== undefined)
  ) {
    const isSensitive = update.sensitive ?? update.$set.sensitive;
    const desc = update.description ?? (update.$set && update.$set.description);

    if (desc) {
      const parsedDesc = isSensitive ? encrypt(desc) : decrypt(desc);
      if (update.$set) {
        update.$set.description = parsedDesc;
      } else {
        update.description = parsedDesc;
      }
    }
  }
  next();
});

module.exports = mongoose.model("Tarea", tareaSchema);
