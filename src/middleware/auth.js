const jwt = require("jsonwebtoken");
const auditLogService = require("../services/auditLog.service"); // Importamos el motor de auditoría

/**
 * Middleware de Autenticación (El Guardián del Gateway)
 * Implementa Zero Trust: intercepta cada petición a rutas protegidas para validar identidad.
 */
function authenticateToken(req, res, next) {
  // 1. Buscamos el token en el header Authorization
  const authHeader = req.headers["authorization"];

  // El formato esperado es "Bearer eyJhbGci..."
  const token = authHeader && authHeader.split(" ")[1];

  // 2. Si no hay token, rechazamos la petición inmediatamente (401)
  if (!token) {
    // Auditoría: Intento de acceso sin credenciales
    auditLogService.log("security.unauthorized", req, null, {
      reason: "Access denied. No token provided.",
    });
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  // 3. Verificamos la integridad (que no haya sido alterado) y la expiración
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Inyectamos los datos del usuario en la request
    next();
  } catch (err) {
    // Auditoría: Intento de acceso con token inválido/manipulado/expirado (403)
    auditLogService.log("security.unauthorized", req, null, {
      reason: "Invalid or expired token",
      jwtError: err.message,
    });

    // Cambiamos a 403 para cumplir con el criterio de la rúbrica
    return res.status(403).json({ error: "Invalid or expired token." });
  }
}

module.exports = authenticateToken;
