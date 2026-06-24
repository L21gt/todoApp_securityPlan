const express = require("express");
const router = express.Router();
const authGateway = require("../services/authGateway");
const tokenService = require("../services/tokenService");
const validate = require("../middleware/validate");
const { authSchema } = require("../validators/auth.validator");
const {
  rateLimitLogin,
  rateLimitRegister,
} = require("../security/rateLimiter");

// Importación del nuevo servicio de auditoría
const auditLogService = require("../services/auditLog.service");

// ==========================================
// CAPA HTTP: Rutas Públicas de Autenticación
// ==========================================

// POST /api/auth/register
router.post(
  "/register",
  rateLimitRegister,
  validate(authSchema),
  async (req, res, next) => {
    try {
      // Extraemos 'name' junto con email y password
      const { name, email, password } = req.body;

      // Pasamos 'name' como primer parámetro al gateway
      const { accessToken, refreshToken, user } = await authGateway.register(
        name,
        email,
        password,
      );

      // Auditoría: Registro de usuario exitoso
      auditLogService.log("auth.register", req, user._id);

      res.status(201).json({
        message: "User registered successfully",
        accessToken,
        refreshToken,
        user,
      });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/auth/login
router.post(
  "/login",
  rateLimitLogin,
  validate(authSchema),
  async (req, res, next) => {
    const { email, password } = req.body;

    try {
      const { accessToken, refreshToken, user } = await authGateway.login(
        email,
        password,
      );

      // Auditoría: Login exitoso
      auditLogService.log("auth.login.success", req, user._id);

      res.json({
        message: "Login successful",
        accessToken,
        refreshToken,
        user,
      });
    } catch (err) {
      if (err.statusCode === 401) {
        auditLogService.log("auth.login.failure", req, email, {
          reason: err.message,
        });
      }
      next(err);
    }
  },
);

// POST /api/auth/refresh
router.post("/refresh", (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken)
      return res.status(400).json({ error: "Refresh token is required" });

    const tokens = tokenService.refreshAccessToken(refreshToken);
    res.json(tokens);
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout
router.post("/logout", (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken)
      return res.status(400).json({ error: "Refresh token is required" });

    tokenService.revokeRefreshToken(refreshToken);

    const maskedToken = refreshToken.substring(0, 10) + "...";
    auditLogService.log("auth.logout", req, null, { tokenUsado: maskedToken });

    res.json({ message: "Logged out successfully" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
