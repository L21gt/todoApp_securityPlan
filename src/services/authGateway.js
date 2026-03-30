const jwt = require("jsonwebtoken");
const User = require("../models/user.model");

// ==========================================
// CAPA LÓGICA: Authentication Gateway Service
// ==========================================

// Generamos el JWT con la información básica (payload) y nuestra llave secreta
function generateToken(user) {
  return jwt.sign(
    { userId: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    // Expiración corta (15 min) para reducir la ventana de ataque si roban el token
    { expiresIn: process.env.JWT_EXPIRES_IN || "15m" },
  );
}

// Lógica de registro de nuevos usuarios
async function register(email, password) {
  // 1. Verificamos que el correo no esté en uso
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    const error = new Error("Email already registered");
    error.statusCode = 409; // 409 Conflict
    throw error;
  }

  // 2. Creamos el usuario en la BD.
  // Nota para el equipo: El modelo User ejecutará el pre-save hook para hashear el password automáticamente.
  const user = await User.create({ email, password });
  return { user };
}

// Lógica de inicio de sesión
async function login(email, password) {
  const user = await User.findOne({ email });

  // Principio de seguridad: No Information Disclosure
  // Devolvemos exactamente el mismo error 401 si falla el correo o la contraseña.
  // Así evitamos que un atacante haga enumeración de usuarios válidos.
  if (!user) {
    const e = new Error("Invalid credentials");
    e.statusCode = 401;
    throw e;
  }

  const isValid = await user.comparePassword(password);
  if (!isValid) {
    const e = new Error("Invalid credentials");
    e.statusCode = 401;
    throw e;
  }

  // Si pasa las validaciones, generamos su "pase de entrada"
  const token = generateToken(user);
  return { token, user };
}

module.exports = { generateToken, register, login };
