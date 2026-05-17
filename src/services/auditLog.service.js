// src/services/auditLog.service.js
const AuditLog = require("../models/auditLog.model");

// Servicio de registro asíncrono no bloqueante (Fire-and-Forget)
async function log(action, req, user = null, details = {}) {
  try {
    // Extracción segura de datos de red y cliente
    const ip =
      req.headers["x-forwarded-for"] ||
      req.socket.remoteAddress ||
      req.ip ||
      "Unknown IP";
    const userAgent = req.headers["user-agent"] || "Unknown Device";

    const auditEntry = new AuditLog({
      action,
      ip,
      userAgent,
      user,
      details,
    });

    await auditEntry.save();
  } catch (error) {
    // El manejo de errores interno previene la interrupción del flujo HTTP principal
    console.error("[SECURITY FATAL] Failed to write audit log:", error.message);
  }
}

module.exports = { log };
