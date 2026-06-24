// src/validators/auth.validator.js
const Joi = require("joi");

// El esquema ahora requiere 'name' para los registros (pero en los tests manejaremos el login con el mismo validador)
const authSchema = Joi.object({
  name: Joi.string().optional(), // Lo dejamos opcional para no romper el endpoint de Login que usa el mismo esquema
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

module.exports = {
  authSchema,
};
