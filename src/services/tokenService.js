const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");

// ==========================================
// CAPA DE SERVICIO: Token Service
// ==========================================

// Almacén en memoria para guardar los refresh tokens válidos [cite: 10]
// Nota: En un entorno de producción real, usaríamos Redis o una base de datos.
const refreshTokensStore = new Map();

// Genera un token de acceso de vida corta (15 min) [cite: 9, 13]
function generateAccessToken(user) {
  return jwt.sign(
    { userId: user._id || user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "15m" },
  );
}

// Genera un token de refresco de vida larga (7 días) y lo guarda [cite: 10, 14]
function generateRefreshToken(user) {
  // Usamos uuid para identificar la "familia" del token [cite: 96]
  const familyId = uuidv4();

  const refreshToken = jwt.sign(
    { userId: user._id || user.id, familyId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d" },
  );

  // Guardamos el token en nuestro store vinculándolo al usuario [cite: 10]
  refreshTokensStore.set(refreshToken, user);

  return refreshToken;
}

// Verifica el refresh token viejo, lo rota y entrega un nuevo par [cite: 15, 17]
function refreshAccessToken(oldRefreshToken) {
  // 1. Validar que exista en el store (Evita que tokens revocados o viejos funcionen)
  if (!refreshTokensStore.has(oldRefreshToken)) {
    const error = new Error("Invalid or revoked refresh token");
    error.statusCode = 401;
    throw error;
  }

  // 2. Extraer el usuario y ELIMINAR el token viejo del store (Rotación) [cite: 17, 65]
  const user = refreshTokensStore.get(oldRefreshToken);
  refreshTokensStore.delete(oldRefreshToken);

  // 3. Verificar criptográficamente la firma y expiración [cite: 93]
  try {
    jwt.verify(oldRefreshToken, process.env.JWT_REFRESH_SECRET);
  } catch (err) {
    const error = new Error("Invalid or revoked refresh token");
    error.statusCode = 401;
    throw error;
  }

  // 4. Generar nuevos tokens (el access y el refresh) [cite: 17]
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  return { accessToken, refreshToken };
}

// Invalida el refresh token (utilizado para el Logout) [cite: 16]
function revokeRefreshToken(refreshToken) {
  // Eliminar del store para que no se pueda volver a usar [cite: 17]
  refreshTokensStore.delete(refreshToken);
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  refreshAccessToken,
  revokeRefreshToken,
};
