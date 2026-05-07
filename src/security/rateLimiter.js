const rateLimit = require("express-rate-limit");

// Restricciones de límite de peticiones derivadas de los criterios de aceptación
// Un máximo de 5 intentos permite que el 6to dispare la respuesta HTTP 429 Too Many Requests
const rateLimitLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    error:
      "Demasiados intentos de inicio de sesión desde esta IP, por favor intente de nuevo en 15 minutos",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Un máximo de 3 intentos permite que el 4to dispare la respuesta HTTP 429 Too Many Requests
const rateLimitRegister = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: {
    error:
      "Demasiadas cuentas creadas desde esta IP, por favor intente de nuevo en una hora",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  rateLimitLogin,
  rateLimitRegister,
};
