const mongoose = require("mongoose");
const bcrypt = require("bcryptjs"); // Usamos bcryptjs por compatibilidad en distintos SO

// Definición del esquema aplicando 'Seguro por Defecto'
const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true, // Evita correos duplicados a nivel de BD
      lowercase: true, // Normalización: evita bypass creando "Admin@test.com"
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 8, // Longitud mínima para hacer más difícil la fuerza bruta
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user", // Principio de Menor Privilegio: nadie es admin al registrarse
    },
  },
  { timestamps: true },
);

// Pre-save hook: Intercepta la acción de guardar para hashear la contraseña
userSchema.pre("save", async function (next) {
  // Si la contraseña no ha sido modificada (ej. en una actualización de perfil), no la volvemos a hashear
  if (!this.isModified("password")) return next();

  // Aplicamos 12 rounds de salting como pide la Clase 5 (~50 años para fuerza bruta)
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Método de instancia para comparar contraseñas en el login
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Sobrescribimos toJSON para NUNCA devolver el hash en las respuestas HTTP (Fail Secure)
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model("User", userSchema);
