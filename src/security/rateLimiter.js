const rateLimit = require("express-rate-limit");
const auditLogService = require("../services/auditLog.service"); // Importamos el motor de auditoría

// Manejador centralizado para interceptar los bloqueos 429 y registrarlos en la BD
const rateLimitHandler = (req, res, next, options) => {
  // Auditoría: Registro de abuso de peticiones (Rate Limiting)
  auditLogService.log("security.rate_limited", req, null, {
    path: req.originalUrl,
    limit: options.max,
    window: options.windowMs,
  });

  // Mantenemos el comportamiento original: devolver el status 429 y el mensaje de error
  res.status(options.statusCode).send(options.message);
};

// Restricciones de límite de peticiones (Login)
const rateLimitLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    error:
      "Demasiados intentos de inicio de sesión desde esta IP, por favor intente de nuevo en 15 minutos",
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler, // Inyectamos nuestro manejador con auditoría
});

// Restricciones de límite de peticiones (Register)
const rateLimitRegister = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: {
    error:
      "Demasiadas cuentas creadas desde esta IP, por favor intente de nuevo en una hora",
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler, // Inyectamos nuestro manejador con auditoría
});

module.exports = {
  rateLimitLogin,
  rateLimitRegister,
};
