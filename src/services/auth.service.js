const jwt = require("jsonwebtoken");
const User = require("../models/user.model");

/**
 * Servicio encargado de la lógica de autenticación (Gateway).
 * Se encarga de registrar usuarios y validar credenciales para generar JWT.
 */
class AuthService {
  // Genera un token firmado con la información básica del usuario
  static generateToken(user) {
    return jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }, // Tiempo de vida corto por seguridad
    );
  }

  // Lógica para dar de alta un nuevo usuario
  static async register(email, password) {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      const error = new Error("El correo ya está registrado");
      error.statusCode = 409;
      throw error;
    }
    // El password se hashea automáticamente en el modelo (pre-save hook)
    const user = await User.create({ email, password });
    return user;
  }

  // Valida credenciales y retorna el token si todo es correcto
  static async login(email, password) {
    const user = await User.findOne({ email });

    // Mitigación de Information Disclosure: No decimos si el email existe o no
    if (!user) {
      const e = new Error("Credenciales inválidas");
      e.statusCode = 401;
      throw e;
    }

    const isValid = await user.comparePassword(password);
    if (!isValid) {
      const e = new Error("Credenciales inválidas");
      e.statusCode = 401;
      throw e;
    }

    const token = this.generateToken(user);
    return { token, user };
  }
}

module.exports = AuthService;
