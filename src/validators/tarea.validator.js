// src/validators/tarea.validator.js
const Joi = require("joi");

const tareaSchema = Joi.object({
  title: Joi.string().trim().min(1).required().messages({
    "string.empty": `"title" no puede estar vacío`,
    "any.required": `"title" es un campo requerido`,
  }),
  description: Joi.string().allow("", null).optional(),
  sensitive: Joi.boolean().optional(),
  completed: Joi.boolean().optional(),

  // Permitimos los IDs que vienen en el body para la creación
  projectId: Joi.string().optional(),
  userId: Joi.string().optional(),
});

module.exports = {
  tareaSchema,
};
