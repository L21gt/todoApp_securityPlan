// src/middleware/validate.js
const validate = (schema) => {
  return (req, res, next) => {
    // Validamos el req.body contra el schema usando Joi
    const { error } = schema.validate(req.body, { abortEarly: false });

    if (error) {
      // Si hay error, armamos un arreglo con los mensajes
      const errorMessages = error.details.map((detail) => detail.message);
      // Respondemos con código 422 como pide el requerimiento
      return res.status(422).json({
        error: "Validation error",
        details: errorMessages,
      });
    }

    // Si todo está bien, pasamos al siguiente middleware/controlador
    next();
  };
};

module.exports = validate;
