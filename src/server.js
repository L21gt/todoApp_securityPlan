// === CAPA 0: Gestión de Secretos (Clase 4) ===
// Cargamos las variables de entorno lo antes posible para no hardcodear credenciales en el código.
require("dotenv").config();

const mongoose = require("mongoose");
const app = require("./app");

// Utilizamos las variables de entorno para evitar dejar información sensible en el repositorio
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/todo_app";

// Conexión a MongoDB
mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("Conexión exitosa a MongoDB");

    app.listen(PORT, () => {
      console.log(
        `Servidor corriendo bajo modelo Zero Trust en el puerto ${PORT}`,
      );
    });
  })
  .catch((err) => {
    console.error("Error crítico al conectar a la base de datos:", err);
    // Aplicamos el principio de "Fail Secure": si la DB falla, detenemos el proceso
    process.exit(1);
  });
