const jwt = require("jsonwebtoken");

/**
 * Middleware de Autenticación (El Guardián del Gateway)
 * Implementa Zero Trust: intercepta cada petición a rutas protegidas para validar identidad.
 */
function authenticateToken(req, res, next) {
  // 1. Buscamos el token en el header Authorization
  const authHeader = req.headers["authorization"];

  // El formato esperado es "Bearer eyJhbGci..."
  const token = authHeader && authHeader.split(" ")[1];

  // 2. Si no hay token, rechazamos la petición inmediatamente
  if (!token) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  // 3. Verificamos la integridad (que no haya sido alterado) y la expiración
  try {
    // Usamos la misma llave secreta con la que firmaremos en el login
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Si es válido, inyectamos los datos del usuario en la request actual.
    // Esto será vital para la futura capa de Autorización (Clase 9).
    req.user = decoded;

    // Dejamos pasar la petición al controlador de la ruta (tareasRouter)
    next();
  } catch (err) {
    // Capturamos cualquier error (firma inválida, token expirado o malformado)
    // Devolvemos un mensaje genérico para evitar dar pistas al atacante
    return res.status(401).json({ error: "Invalid or expired token." });
  }
}

module.exports = authenticateToken;
