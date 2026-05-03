// src/middleware/errorHandler.js
const errorHandler = (err, req, res, next) => {
  // 1. Registrar el error en el servidor (consola)[cite: 1]
  console.error("❌ Error capturado:", err.message);
  // Opcional: console.error(err.stack); // Solo para desarrollo

  // 2. Manejar error específico de Mongoose (CastError) cuando el ID es inválido
  if (err.name === "CastError" && err.kind === "ObjectId") {
    return res.status(400).json({ error: "Invalid request" }); // Respuesta genérica sin stack trace
  }

  // 3. Respuesta genérica para el cliente[cite: 1]
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: statusCode === 500 ? "Internal Server Error" : err.message,
  });
};

module.exports = errorHandler;
