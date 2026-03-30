const express = require("express");
const router = express.Router();
// Importamos la capa lógica donde está toda la "inteligencia" del Gateway
const authGateway = require("../services/authGateway");

// ==========================================
// CAPA HTTP: Rutas Públicas de Autenticación
// ==========================================

// POST /api/auth/register - Registro de nuevos usuarios
router.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Delegamos la creación al servicio
    const result = await authGateway.register(email, password);

    // 201 Created. El password ya fue eliminado de la respuesta por el toJSON del modelo
    res.status(201).json({
      message: "User registered successfully",
      user: result.user,
    });
  } catch (err) {
    // Si el correo ya existe, el servicio nos lanza un error con statusCode 409
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

// POST /api/auth/login - Inicio de sesión para obtener el JWT
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Delegamos la validación de credenciales al servicio
    const { token, user } = await authGateway.login(email, password);

    // 200 OK. Entregamos el "pase de acceso" (JWT)
    res.json({
      message: "Login successful",
      token,
      user,
    });
  } catch (err) {
    // Fail Secure: Si falla, devolvemos 401 y el mismo mensaje genérico siempre
    res.status(err.statusCode || 401).json({ error: err.message });
  }
});

module.exports = router;
