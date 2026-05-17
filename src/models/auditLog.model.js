// src/models/auditLog.model.js
const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema({
  action: { type: String, required: true, index: true },
  ip: { type: String, required: true },
  userAgent: { type: String, required: true },
  user: { type: mongoose.Schema.Types.Mixed, default: null }, // Soporta ObjectId o String (email) para fallos
  details: { type: mongoose.Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now, index: true },
});

// Implementación de inmutabilidad: Bloqueo de operaciones de borrado a nivel de schema
const preventDeletion = function (next) {
  next(
    new Error(
      "Security Policy Violation: Audit logs cannot be deleted or modified",
    ),
  );
};

auditLogSchema.pre(
  "deleteOne",
  { document: true, query: false },
  preventDeletion,
);
auditLogSchema.pre("deleteMany", preventDeletion);
auditLogSchema.pre("findOneAndDelete", preventDeletion);
auditLogSchema.pre("findOneAndRemove", preventDeletion);

module.exports = mongoose.model("AuditLog", auditLogSchema);
