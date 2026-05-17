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
      const { email, password } = req.body;
      const { accessToken, refreshToken, user } = await authGateway.register(
        email,
        password,
      );

      // Auditoría: Registro de usuario exitoso (Fire-and-forget, sin await para no bloquear respuesta)
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
    const { email, password } = req.body; // Extraído fuera del try para usarlo en el catch

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
      // Auditoría: Fallo de login (Interceptamos el error 401 del Gateway)
      if (err.statusCode === 401) {
        // Registramos el email que intentó ingresar como 'user', aunque no exista en BD
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

    // Auditoría: Cierre de sesión (Enmascaramos el token parcial por seguridad)
    const maskedToken = refreshToken.substring(0, 10) + "...";
    auditLogService.log("auth.logout", req, null, { tokenUsado: maskedToken });

    res.json({ message: "Logged out successfully" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
