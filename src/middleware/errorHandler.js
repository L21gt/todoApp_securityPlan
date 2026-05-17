const auditLogService = require("../services/auditLog.service"); // Importamos auditoría

const errorHandler = (err, req, res, next) => {
  // 1. Registrar el error en el servidor (consola)
  console.error("❌ Error capturado:", err.message);

  // Auditoría: Registrar errores del sistema o peticiones malformadas
  // Extraemos el ID del usuario si la petición logró pasar por el middleware de Auth
  const userId = req.user ? req.user.userId : null;
  auditLogService.log("system.error", req, userId, {
    errorMessage: err.message,
    statusCode: err.statusCode || 500,
    path: req.originalUrl,
  });

  // 2. Manejar error específico de Mongoose (CastError) cuando el ID es inválido
  if (err.name === "CastError" && err.kind === "ObjectId") {
    return res.status(400).json({ error: "Invalid request" }); // Respuesta genérica sin stack trace
  }

  // 3. Respuesta genérica para el cliente
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: statusCode === 500 ? "Internal Server Error" : err.message,
  });
};

module.exports = errorHandler;
