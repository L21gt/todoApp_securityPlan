const User = require("../models/user.model");
const tokenService = require("./tokenService"); // Importamos nuestro nuevo motor

// ==========================================
// CAPA LÓGICA: Authentication Gateway Service
// ==========================================

// Lógica de registro de nuevos usuarios
async function register(email, password) {
  // 1. Verificamos que el correo no esté en uso
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    const error = new Error("Email already registered");
    error.statusCode = 409;
    throw error;
  }

  // 2. Creamos el usuario
  const user = await User.create({ email, password });

  // 3. Auto-login: Generamos ambos tokens al registrarse
  const accessToken = tokenService.generateAccessToken(user);
  const refreshToken = tokenService.generateRefreshToken(user);

  return { accessToken, refreshToken, user };
}

// Lógica de inicio de sesión
async function login(email, password) {
  const user = await User.findOne({ email });

  // Principio "Fail Secure" / "No Information Disclosure"
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

  // Generamos el par de tokens (Access corto, Refresh largo)
  const accessToken = tokenService.generateAccessToken(user);
  const refreshToken = tokenService.generateRefreshToken(user);

  return { accessToken, refreshToken, user };
}

module.exports = { register, login };
