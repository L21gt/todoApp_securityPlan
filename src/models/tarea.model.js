// src/models/tarea.model.js
const mongoose = require("mongoose");

const tareaSchema = new mongoose.Schema(
  {
    // ... tus campos actuales (title, description, etc) ...
    title: String,
    description: String,
    sensitive: Boolean,
    completed: Boolean,
    estado: String,
    projectId: mongoose.Schema.Types.ObjectId,
    userId: mongoose.Schema.Types.ObjectId,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true }, // ✅ ESTO ES VITAL: Le dice que incluya virtuales al JSON
    toObject: { virtuals: true },
  },
);

// ✅ ESTA ES LA DEFINICIÓN DE LA RELACIÓN
tareaSchema.virtual("comentarios", {
  ref: "Comment", // El nombre del modelo de comentarios (asegúrate de que sea 'Comment')
  localField: "_id", // El ID de la tarea
  foreignField: "taskId", // El campo en el modelo Comment que tiene el ID de la tarea
  justOne: false, // Una tarea tiene muchos comentarios
});

module.exports = mongoose.model("Tarea", tareaSchema);
