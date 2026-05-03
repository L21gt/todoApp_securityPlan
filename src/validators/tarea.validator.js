// src/validators/tarea.validator.js
const Joi = require("joi");

const tareaSchema = Joi.object({
  // El título es requerido y no puede estar vacío[cite: 2]
  title: Joi.string().trim().min(1).required().messages({
    "string.empty": `"title" no puede estar vacío`,
    "any.required": `"title" es un campo requerido`,
  }),
  completed: Joi.boolean().optional(),
});

module.exports = {
  tareaSchema,
};
