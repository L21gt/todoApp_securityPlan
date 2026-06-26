// src/validators/tarea.validator.js
const Joi = require("joi");

const baseTareaSchema = {
  description: Joi.string().allow("", null).optional(),
  sensitive: Joi.boolean().optional(),
  completed: Joi.boolean().optional(),
  estado: Joi.string()
    .valid("To Do", "In Progress", "Review", "Done")
    .optional(),
  projectId: Joi.string().optional(),
  userId: Joi.string().optional(),
};

// Esquema ESTRICTO para POST (Exige el título)
const tareaSchema = Joi.object({
  title: Joi.string().trim().min(1).required(),
  ...baseTareaSchema,
}).unknown(false); // Falla si envían basura extra (para que pase el test de campos extra)

// Esquema FLEXIBLE para PUT (Título opcional y permite campos extra como _id, __v)
const actualizarTareaSchema = Joi.object({
  title: Joi.string().trim().min(1).optional(),
  ...baseTareaSchema,
}).unknown(true);

module.exports = {
  tareaSchema,
  actualizarTareaSchema,
};
