// src/routes/admin.js
const express = require("express");
const router = express.Router();
const User = require("../models/user.model");
const AuditLog = require("../models/auditLog.model");
const authenticateToken = require("../middleware/auth");

// Middleware para verificar que el usuario sea Super Admin
const checkSuperAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || user.role !== "super_admin") {
      return res
        .status(403)
        .json({ error: "Acceso denegado: Se requiere rol super_admin" });
    }
    next();
  } catch (error) {
    next(error);
  }
};

// Aplicamos autenticación y verificación de rol a TODAS las rutas de este archivo
router.use(authenticateToken);
router.use(checkSuperAdmin);

// GET /api/admin/users -> Listar todos los usuarios del sistema
router.get("/users", async (req, res, next) => {
  try {
    // Excluimos la contraseña en la consulta por el principio de "Fail Secure"
    const users = await User.find({}, "-password").lean();
    res.json(users);
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/users/:id/status -> Cambiar estado (Activar/Banear)
router.put("/users/:id/status", async (req, res, next) => {
  try {
    const { isActive } = req.body; // true = activo, false = baneado
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true, select: "-password", runValidators: true },
    );

    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/logs -> Consultar los registros de auditoría
router.get("/logs", async (req, res, next) => {
  try {
    // Limitamos a los últimos 100 registros ordenados descendentemente
    const logs = await AuditLog.find()
      .sort({ timestamp: -1 })
      .limit(100)
      .lean();
    res.json(logs);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
