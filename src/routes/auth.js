const express = require("express");
const router = express.Router();
const authGateway = require("../services/authGateway");
const tokenService = require("../services/tokenService"); // Importamos el servicio de tokens para refresh/logout
const validate = require("../middleware/validate");
const { authSchema } = require("../validators/auth.validator");

// ==========================================
// CAPA HTTP: Rutas Públicas de Autenticación
// ==========================================

// POST /api/auth/register - Registro de nuevos usuarios con auto-login
router.post("/register", validate(authSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // El gateway ahora nos devuelve ambos tokens además del usuario
    const { accessToken, refreshToken, user } = await authGateway.register(
      email,
      password,
    );

    res.status(201).json({
      message: "User registered successfully",
      accessToken,
      refreshToken,
      user,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login - Inicio de sesión
router.post("/login", validate(authSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Recibimos la nueva estructura de tokens
    const { accessToken, refreshToken, user } = await authGateway.login(
      email,
      password,
    );

    res.json({
      message: "Login successful",
      accessToken,
      refreshToken,
      user,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/refresh - Rotación de tokens
// Recibe un refreshToken válido y devuelve un nuevo par de tokens
router.post("/refresh", (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: "Refresh token is required" });
    }

    // Delegamos la validación y rotación a nuestro tokenService
    const tokens = tokenService.refreshAccessToken(refreshToken);

    // Devolvemos el nuevo accessToken y el nuevo refreshToken
    res.json(tokens);
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout - Revocación de sesión
// Recibe el refreshToken y lo elimina del store para invalidarlo
router.post("/logout", (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: "Refresh token is required" });
    }

    // Eliminamos el token de la memoria del servidor
    tokenService.revokeRefreshToken(refreshToken);

    res.json({ message: "Logged out successfully" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
